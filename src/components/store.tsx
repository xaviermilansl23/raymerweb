'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthResponse, Producto } from '@/lib/models';
import type { CotizacionItem } from '@/lib/cotizacion.service';
import { errorMessage, requestJson } from '@/lib/api';
import { clientIdFromToken, readQuotation, sameSelection } from '@/lib/customer-state';

type Tokens = Pick<AuthResponse, 'accessToken' | 'refreshToken'>;
type Store = {
  ready: boolean; authenticated: boolean; session: number; clienteId: number | null;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  save: (tokens: Tokens) => void; logout: () => void; requireSession: () => boolean;
  favorites: number[]; toggleFavorite: (id: number) => Promise<void>;
  items: CotizacionItem[]; add: (p: Producto) => void; quantity: (id: number, n: number) => void;
  clear: () => void; cartOpen: boolean; setCartOpen: (value: boolean) => void;
  sessionActive: (version: number) => boolean;
  clearReserved: (products: { productoId: number; cantidad: number }[], version: number) => void;
  notice: string; setNotice: (value: string) => void;
};
const Context = createContext<Store | null>(null);
export const useStore = () => useContext(Context)!;
export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const tokens = useRef<Tokens | null>(null); const epoch = useRef(0);
  const refreshing = useRef<Promise<Tokens> | null>(null);
  const [ready, setReady] = useState(false); const [session, setSession] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false); const [notice, setNotice] = useState('');
  const reset = useCallback((next: Tokens | null) => {
    epoch.current++; tokens.current = next; refreshing.current = null;
    if (next) { localStorage.setItem('raymer_next_tokens', JSON.stringify(next)); }
    else localStorage.removeItem('raymer_next_tokens');
    setAuthenticated(Boolean(next)); setClienteId(next ? clientIdFromToken(next.accessToken) : null);
    setSession(epoch.current); setFavorites([]); setCartOpen(false);
  }, []);
  useEffect(() => {
    try { setItems(readQuotation(sessionStorage.getItem('raymer_next_quote'))); } catch {}
    try { const saved = JSON.parse(localStorage.getItem('raymer_next_tokens') || 'null'); if (saved?.accessToken && saved?.refreshToken) reset(saved); } catch { localStorage.removeItem('raymer_next_tokens'); }
    setReady(true);
    const sync = (e: StorageEvent) => { if (e.key === 'raymer_next_tokens') { try { reset(JSON.parse(e.newValue || 'null')); } catch { reset(null); } } };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, [reset]);
  useEffect(() => {
    if (ready) { try { sessionStorage.setItem('raymer_next_quote', JSON.stringify(items)); } catch {} }
  }, [items, ready]);
  const api = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const previous = tokens.current; const version = epoch.current;
    try { return await requestJson<T>(path, init, previous?.accessToken); }
    catch (e) {
      if ((e as { status?: number }).status !== 401 || path.startsWith('/auth-cliente/')) throw e;
      if (!previous || version !== epoch.current) throw e;
      if (tokens.current?.accessToken !== previous.accessToken) return requestJson<T>(path, init, tokens.current?.accessToken);
      try {
        if (!refreshing.current) refreshing.current = requestJson<Tokens>('/auth-cliente/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: previous.refreshToken }) });
        const next = await refreshing.current;
        if (version !== epoch.current) throw new Error('La sesión cambió.');
        tokens.current = next; localStorage.setItem('raymer_next_tokens', JSON.stringify(next));
      } catch (refreshError) { if (version === epoch.current) reset(null); throw refreshError; }
      finally { if (version === epoch.current) refreshing.current = null; }
      return requestJson<T>(path, init, tokens.current?.accessToken);
    }
  }, [reset]);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    api<{ ids: number[] }>('/mobile/favoritos/ids').then(data => { if (active) setFavorites(data.ids); }).catch(e => { if (active) setNotice(errorMessage(e)); });
    return () => { active = false; };
  }, [api, authenticated, session]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const requireSession = () => {
    if (tokens.current) return true;
    setNotice('Inicia sesión para continuar.'); router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`); return false;
  };
  const pendingFavorites = useRef(new Set<number>());
  async function toggleFavorite(id: number) {
    if (!requireSession() || pendingFavorites.current.has(id)) return;
    pendingFavorites.current.add(id); const version = epoch.current;
    const exists = favorites.includes(id);
    try {
      await api(`/mobile/favoritos/${id}`, { method: exists ? 'DELETE' : 'POST', ...(!exists && { body: '{}' }) });
      if (version === epoch.current) setFavorites(values => exists ? values.filter(v => v !== id) : [...values, id]);
    } catch (e) { setNotice(errorMessage(e)); } finally { pendingFavorites.current.delete(id); }
  }
  const add = (p: Producto) => {
    if (!Number.isFinite(p.precio_venta) || p.precio_venta < 0 || p.stock_disponible < 1) return;
    setItems(values => {
      const existing = values.find(i => i.producto.producto_id === p.producto_id);
      if ((existing?.cantidad || 0) >= p.stock_disponible) return values;
      return existing ? values.map(i => i === existing ? { producto: p, cantidad: i.cantidad + 1 } : i) : [...values, { producto: p, cantidad: 1 }];
    }); setCartOpen(true);
  };
  const quantity = (id: number, n: number) => {
    if (!Number.isSafeInteger(n)) return;
    setItems(values => values.map(i => i.producto.producto_id === id ? { ...i, cantidad: Math.max(0, Math.min(n, i.producto.stock_disponible)) } : i).filter(i => i.cantidad > 0));
  };
  const sessionActive = useCallback((version: number) => version === epoch.current, []);
  const clearReserved = useCallback((products: { productoId: number; cantidad: number }[], version: number) => {
    if (version === epoch.current) setItems(current => version === epoch.current && sameSelection(current, products) ? [] : current);
  }, []);
  const logout = () => {
    const previous = tokens.current;
    if (previous?.refreshToken) void requestJson('/auth-cliente/logout', {
      method: 'POST', body: JSON.stringify({ refreshToken: previous.refreshToken }), keepalive: true,
    }).catch(() => undefined);
    reset(null); router.push('/productos');
  };
  return <Context.Provider value={{ ready, authenticated, session, clienteId, api, save: reset, logout, requireSession, sessionActive, clearReserved, favorites, toggleFavorite, items, add, quantity, clear: () => setItems([]), cartOpen, setCartOpen, notice, setNotice }}>{children}</Context.Provider>;
}
