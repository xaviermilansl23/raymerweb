import type { CotizacionItem } from './cotizacion.service';

export function clientIdFromToken(token: string): number | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part));
    const id = Number(claims.sub);
    return claims.token_use === 'CLIENTE' && Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}

export function safeReturnPath(value: string | null): string {
  return value && /^\/(productos(?:\/\d+)?|favoritos|perfil|combos|nosotros|arma-tu-pc|servicio-tecnico|reservas(?:\/nueva)?)$/.test(value) ? value : '/productos';
}

export function readQuotation(value: string | null): CotizacionItem[] {
  try {
    const items = JSON.parse(value || '[]');
    if (!Array.isArray(items)) return [];
    const ids = new Set<number>();
    return items.slice(0, 100).filter((item): item is CotizacionItem => {
      const p = item?.producto;
      if (!p || !Number.isSafeInteger(p.producto_id) || p.producto_id < 1 || ids.has(p.producto_id)
        || typeof p.nombre !== 'string' || typeof p.precio_venta !== 'number' || !Number.isFinite(p.precio_venta) || p.precio_venta < 0
        || !Number.isSafeInteger(p.stock_disponible) || p.stock_disponible < 1
        || !Number.isSafeInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > p.stock_disponible) return false;
      ids.add(p.producto_id); return true;
    });
  } catch { return []; }
}

export function sameSelection(items: CotizacionItem[], products: { productoId: number; cantidad: number }[]): boolean {
  return items.length === products.length && items.every(item => products.some(p => p.productoId === item.producto.producto_id && p.cantidad === item.cantidad));
}
