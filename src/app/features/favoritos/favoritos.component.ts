import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { CatalogService } from '../../core/catalog.service';
import { CotizacionService } from '../../core/cotizacion.service';
import { FavoritosService } from '../../core/favoritos.service';
import { SessionAccessService } from '../../core/session-access.service';
import { Producto } from '../../core/models';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritosComponent implements OnDestroy {
  private readonly favos = inject(FavoritosService);
  private readonly catalog = inject(CatalogService);
  private readonly cotizacion = inject(CotizacionService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly sub = new Subscription();
  private addedTimer?: ReturnType<typeof setTimeout>;
  readonly quotedRecently = signal<Set<number>>(new Set());

  readonly products = signal<Producto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.sub.add(this.favos.listar().subscribe({
      next: (list) => { this.products.set(list); this.loading.set(false); },
      error: (err) => { this.error.set(apiErrorMessage(err, 'No pudimos cargar tus favoritos')); this.loading.set(false); },
    }));
  }

  quitar(productId: number): void {
    this.favos.quitar(productId).subscribe({
      error: () => {},
    });
    this.products.update((list) => list.filter((p) => p.producto_id !== productId));
  }

  productImage(product: Producto): string { return product.imagen_url || 'no-product.svg'; }

  maximoAdicional(product: Producto): number {
    return this.cotizacion.maximoAdicional(product);
  }

  agregarACotizacion(product: Producto): void {
    if (!this.sessionAccess.requireSession('cotizacion')) return;
    if (!this.cotizacion.agregar(product)) return;
    const next = new Set(this.quotedRecently());
    next.add(product.producto_id);
    this.quotedRecently.set(next);
    if (this.addedTimer) clearTimeout(this.addedTimer);
    this.addedTimer = setTimeout(() => this.quotedRecently.set(new Set()), 1600);
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); if (this.addedTimer) clearTimeout(this.addedTimer); }
}