import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Producto } from './models';

export interface CotizacionItem {
  producto: Producto;
  cantidad: number;
}

/** Entero de stock válido (>= 0); normaliza nulos, vacíos o negativos a 0. */
function numeroDeStock(valor: unknown): number {
  const n = Math.floor(Number(valor) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly auth = inject(AuthService);
  private readonly draft = signal<{ clienteId: number; items: CotizacionItem[] } | null>(null);

  constructor() {
    // El borrador vive solo en memoria y nunca pasa a otra cuenta.
    effect(() => {
      const clienteId = this.auth.clienteId();
      const authenticated = this.auth.isAuthenticated();
      this.draft.update((draft) => authenticated && draft?.clienteId === clienteId ? draft : null);
    });
  }

  readonly items = computed(() => {
    const draft = this.draft();
    return this.auth.isAuthenticated() && draft?.clienteId === this.auth.clienteId()
      ? draft.items : [];
  });
readonly count = computed(() => this.items().reduce((n, item) => n + item.cantidad, 0));
  readonly total = computed(() => this.items().reduce((sum, item) =>
    sum + item.cantidad * Math.round(item.producto.precio_venta * 100), 0) / 100);

  /** Stock máximo permitido por producto ya agregado (0 si no está en la cotización). */
  readonly limiteStock = computed(() => {
    const maximo = new Map<number, number>();
    for (const item of this.items()) maximo.set(item.producto.producto_id, numeroDeStock(item.producto.stock_disponible));
    return maximo;
  });

  /** Máximo total permitido de un producto ya agregado a la cotización. */
  maximoCantidad(productoId: number): number {
    return this.limiteStock().get(productoId) ?? 0;
  }

  /** Unidades que aún se pueden agregar del producto (0 = sin stock o límite alcanzado). */
  maximoAdicional(producto: Producto): number {
    const stock = numeroDeStock(producto.stock_disponible);
    if (stock <= 0) return 0;
    const item = this.items().find((i) => i.producto.producto_id === producto.producto_id);
    return item ? Math.max(0, stock - item.cantidad) : stock;
  }

  agregar(producto: Producto): boolean {
    const clienteId = this.auth.clienteId();
    if (!this.auth.isAuthenticated() || clienteId === null || !producto.producto_id ||
        !Number.isFinite(producto.precio_venta) || producto.precio_venta < 0) return false;
    if (this.maximoAdicional(producto) <= 0) return false;
    const items = this.items();
    const existing = items.find((item) => item.producto.producto_id === producto.producto_id);
    const cantidad = (existing?.cantidad ?? 0) + 1;
    if (!Number.isSafeInteger(cantidad)) return false;
    this.draft.set({ clienteId, items: existing
      ? items.map((item) => item === existing ? { ...item, cantidad } : item)
      : [...items, { producto: { ...producto }, cantidad: 1 }],
    });
    return true;
  }

  cambiarCantidad(productoId: number, cantidad: number): void {
    const clienteId = this.auth.clienteId();
    if (!this.auth.isAuthenticated() || clienteId === null || !Number.isFinite(cantidad) ||
        !Number.isSafeInteger(Math.floor(cantidad))) return;
    this.draft.set({ clienteId, items: this.items()
      .map((item) => {
        if (item.producto.producto_id !== productoId) return item;
        const deseada = Math.max(0, Math.floor(cantidad));
        const stock = numeroDeStock(item.producto.stock_disponible);
        return { ...item, cantidad: stock > 0 ? Math.min(deseada, stock) : 0 };
      })
      .filter((item) => item.cantidad > 0),
    });
  }

  quitar(productoId: number): void { this.cambiarCantidad(productoId, 0); }
  limpiar(): void { this.draft.set(null); }
}
