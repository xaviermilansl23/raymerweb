import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CotizacionService } from '../core/cotizacion.service';
import { SessionAccessService } from '../core/session-access.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cotizacion = inject(CotizacionService);
  private readonly sessionAccess = inject(SessionAccessService);
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly generatingPdf = signal(false);
  readonly pdfError = signal('');
  readonly menuOpen = signal(false);
  readonly dark = signal(false);
  readonly cartOpen = signal(false);
  readonly year = new Date().getFullYear();
  private readonly themeKey = 'raymer-theme';

  readonly cartItems = this.cotizacion.items;
  readonly cartCount = this.cotizacion.count;
  readonly cartTotal = this.cotizacion.total;

  readonly cartMessage = computed(() => {
    const lines = this.cartItems().map((item) => `• ${item.producto.nombre} x${item.cantidad} — Bs ${(item.cantidad * Math.round(item.producto.precio_venta * 100) / 100).toFixed(2)}`);
    return encodeURIComponent(`Hola, quiero una cotización de:\n${lines.join('\n')}\n\nTotal: Bs ${this.cartTotal().toFixed(2)}`);
  });

  constructor() {
    effect(() => { if (!this.isAuthenticated()) this.cartOpen.set(false); });
    const saved = localStorage.getItem(this.themeKey);
    this.dark.set(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.applyTheme();
  }

  toggleTheme(): void {
    this.dark.update(value => !value);
    this.applyTheme();
  }

  toggleCart(): void {
    if (!this.sessionAccess.requireSession('cotizacion')) return;
    this.cartOpen.update(value => !value);
  }

  cambiarCantidad(productoId: number, delta: number): void {
    const item = this.cartItems().find((i) => i.producto.producto_id === productoId);
    if (!item) return;
    const maximo = this.cotizacion.maximoCantidad(productoId);
    this.cotizacion.cambiarCantidad(productoId, Math.max(0, Math.min(item.cantidad + delta, maximo)));
  }

  limiteCantidad(productoId: number): number { return this.cotizacion.maximoCantidad(productoId); }

  quitarProducto(productoId: number): void { this.cotizacion.quitar(productoId); }
  limpiarCotizacion(): void { this.cotizacion.limpiar(); this.pdfError.set(''); }

  async descargarPdf(): Promise<void> {
    if (!this.sessionAccess.requireSession('cotizacion') || !this.cartItems().length || this.generatingPdf()) return;
    const clienteId = this.auth.clienteId();
    const items = this.cartItems().map((item) => ({ ...item, producto: { ...item.producto } }));
    this.generatingPdf.set(true);
    this.pdfError.set('');
    try {
      // La biblioteca se descarga únicamente cuando se solicita un PDF.
      const { createQuotationPdf, quotationFilename } = await import('../core/quotation-pdf');
      if (!this.isAuthenticated() || clienteId !== this.auth.clienteId()) return;
      const date = new Date();
      const doc = await createQuotationPdf(items, date);
      await doc.save(quotationFilename(date), { returnPromise: true });
    } catch {
      this.pdfError.set('No se pudo generar el PDF. Tu cotización sigue disponible; intenta nuevamente.');
    } finally {
      this.generatingPdf.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
    this.cotizacion.limpiar();
    this.cartOpen.set(false);
    this.menuOpen.set(false);
    void this.router.navigate(['/productos']);
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
    localStorage.setItem(this.themeKey, this.dark() ? 'dark' : 'light');
  }
}
