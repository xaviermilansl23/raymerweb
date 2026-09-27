import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogService } from '../../core/catalog.service';
import { CotizacionService } from '../../core/cotizacion.service';
import { SessionAccessService } from '../../core/session-access.service';
import { Producto } from '../../core/models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly cotizacion = inject(CotizacionService);
  private readonly sessionAccess = inject(SessionAccessService);
  private sub?: Subscription;
  private addedTimer?: ReturnType<typeof setTimeout>;
  readonly id = input.required<string>();
  readonly product = signal<Producto | null>(null);
  readonly loading = signal(true);
  readonly justAdded = signal(false);

  /** Imágenes del producto para el carrusel. */
  readonly images = computed<string[]>(() => {
    const product = this.product();
    const lista = (product?.imagenes ?? []).filter((u): u is string => !!u);
    if (lista.length > 0) return lista;
    return product?.imagen_url ? [product.imagen_url] : [];
  });

  /** Índice activo del carrusel. */
  readonly activeIndex = signal(0);

  readonly message = computed(() => {
    const product = this.product();
    return encodeURIComponent(`Hola, estoy interesado en el producto ${product?.nombre ?? ''}. ${product?.descripcion ?? ''}`);
  });

  maximoAdicional(product: Producto | null): number {
    return product ? this.cotizacion.maximoAdicional(product) : 0;
  }

  ngOnInit(): void {
    const id = Number(this.id());
    this.sub = this.catalog.product(id).subscribe({
      next: (product) => { this.product.set(product); this.loading.set(false); },
      error: () => this.loadLocal(id),
    });
  }

  /** Fallback: si el endpoint por id falla, busca en la lista completa. */
  private loadLocal(id: number): void {
    this.sub?.unsubscribe();
    this.sub = this.catalog.products().subscribe({
      next: (products) => { this.product.set(products.find((item) => item.producto_id === id) ?? null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectImage(index: number): void {
    this.activeIndex.set(index);
  }

  agregarACotizacion(): void {
    if (!this.sessionAccess.requireSession('cotizacion')) return;
    const product = this.product();
    if (!product) return;
    if (!this.cotizacion.agregar(product)) return;
    this.justAdded.set(true);
    if (this.addedTimer) clearTimeout(this.addedTimer);
    this.addedTimer = setTimeout(() => this.justAdded.set(false), 1600);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.addedTimer) clearTimeout(this.addedTimer);
  }
}
