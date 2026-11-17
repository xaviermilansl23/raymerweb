import type { Producto } from './models';
import { stockUnits } from './catalog-filters.mjs';
export async function requestJson<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`/api${path}`, { ...init, headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
    throw Object.assign(new Error(message || 'No se pudo completar la solicitud.'), { status: res.status });
  }
  return data as T;
}
export const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error. Intenta nuevamente.';
export function asset(value: string | null | undefined): string {
  if (!value) return '/no-product.svg';
  try {
    const url = new URL(value, 'http://raymer.local');
    if (url.pathname.startsWith('/uploads/')) return url.pathname;
    if (!['http:', 'https:'].includes(url.protocol)) return '/no-product.svg';
  } catch { return '/no-product.svg'; }
  return value;
}
export function normalize(p: Producto): Producto {
  return { ...p, precio_venta: Number(p.precio_venta ?? 0), stock_disponible: stockUnits(p.stock_disponible), imagen_url: asset(p.imagen_url), imagenes: (p.imagenes || []).filter(Boolean).map(asset) };
}
export const money = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
