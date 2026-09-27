import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { CatalogService } from '../../core/catalog.service';
import { CotizacionService } from '../../core/cotizacion.service';
import { FavoritosService } from '../../core/favoritos.service';
import { AuthService } from '../../core/auth.service';
import { SessionAccessService } from '../../core/session-access.service';
import { Categoria, Producto } from '../../core/models';

/** Acepta distintas formas de "activa" para robustez ante cambios del SP. */
function esCategoriaActiva(item: Categoria): boolean {
  if (item.estado == null || String(item.estado).trim() === '') return true;
  return ['A', 'ACTIVO', 'ACTIVE', 'TRUE', '1'].includes(String(item.estado).trim().toUpperCase());
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent implements OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly cotizacion = inject(CotizacionService);
  private readonly favos = inject(FavoritosService);
  private readonly auth = inject(AuthService);
  private readonly sessionAccess = inject(SessionAccessService);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private productsSub?: Subscription;
  private categoriesSub?: Subscription;
  private favosSub?: Subscription;
  private addedTimer?: ReturnType<typeof setTimeout>;
  readonly quotedRecently = signal<Set<number>>(new Set());

  readonly products = signal<Producto[]>([]);
  readonly categories = signal<Categoria[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly categoriesError = signal('');
  readonly query = signal('');
  readonly category = signal<number | 'all' | 'none'>('all');
  readonly brand = signal('');
  readonly brands = computed(() => {
    const options = new Map<string, string>();
    for (const product of this.products()) {
      const label = product.marca?.trim() || '';
      if (label) options.set('marca:' + label.toLowerCase(), label);
    }
    const selected = this.brand();
    if (selected.startsWith('marca:') && !options.has(selected)) {
      options.set(selected, selected.slice(6));
    }
    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly priceMin = signal<number>(0);
  readonly priceMax = signal<number>(100000);
  readonly favorites = signal<Set<number>>(new Set());

  readonly precioMinGlobal = computed(() => {
    const list = this.products();
    if (!list.length) return 0;
    return Math.min(...list.map((p) => Number(p.precio_venta ?? 0)));
  });
  readonly precioMaxGlobal = computed(() => {
    const list = this.products();
    if (!list.length) return 100000;
    return Math.max(...list.map((p) => Number(p.precio_venta ?? 0)));
  });

  readonly filtered = computed(() => {
    const category = this.category();
    const lo = Number(this.priceMin());
    const hi = Number(this.priceMax());
    const brand = this.brand();
    return this.products().filter((product) => {
      const productBrand = product.marca?.trim().toLowerCase() || '';
      if (brand && brand !== (productBrand ? 'marca:' + productBrand : 'none')) return false;
      if (category === 'all') { /* ok */ }
      else {
        const id = product.tipo_producto_id == null ? null : Number(product.tipo_producto_id);
        if (category === 'none') { if (id != null) return false; }
        else if (id !== category) return false;
      }
      const price = Number(product.precio_venta ?? 0);
      if (price < lo || price > hi) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly visible = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (!total) return 'Sin resultados';
    const start = (this.page() - 1) * this.pageSize + 1;
    const end = Math.min(this.page() * this.pageSize, total);
    return `Mostrando ${start}–${end} de ${total}`;
  });
  readonly pageNumbers = computed<(number | 'ellipsis')[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    const out: (number | 'ellipsis')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) out.push(i);
      return out;
    }
    const pages = Array.from(new Set<number>([1, total, current - 1, current, current + 1]))
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b);
    let prev: number | null = null;
    for (const p of pages) {
      if (prev !== null && p - prev > 1) out.push('ellipsis');
      out.push(p);
      prev = p;
    }
    return out;
  });

  constructor() {
    effect(() => { if (!this.auth.isAuthenticated()) this.favorites.set(new Set()); });
    this.load();
  }

  load(query = ''): void {
    this.loading.set(true);
    this.error.set('');
    this.query.set(query);
    this.productsSub?.unsubscribe();

    this.productsSub = this.catalog.products(query).subscribe({
      next: (products) => {
        this.products.set(products);
        const pMin = this.precioMinGlobal();
        const pMax = this.precioMaxGlobal();
        this.priceMin.set(pMin);
        this.priceMax.set(pMax);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(apiErrorMessage(error, 'No pudimos cargar el catálogo'));
        this.loading.set(false);
      },
    });

    this.loadCategories();
    this.loadFavorites();
  }

  loadCategories(): void {
    this.categoriesError.set('');
    this.categoriesSub?.unsubscribe();
    this.categoriesSub = this.catalog.categories().subscribe({
      next: (list) => {
        const activas = list.filter(esCategoriaActiva).sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.categories.set(activas);
      },
      error: () => { this.categories.set([]); this.categoriesError.set('No se pudieron cargar las categorías.'); },
    });
  }

  loadFavorites(): void {
    this.favosSub?.unsubscribe();
    if (!this.auth.isAuthenticated()) { this.favorites.set(new Set()); return; }
    this.favosSub = this.favos.ids().subscribe({
      next: (ids) => this.favorites.set(new Set(ids)),
      error: () => { /* favoritos no bloquean el catálogo */ },
    });
  }

  toggleFavorite(productId: number): void {
    if (!this.sessionAccess.requireSession('favoritos')) return;
    const current = this.favorites();
    const next = new Set(current);
    const adding = !next.has(productId);
    adding ? next.add(productId) : next.delete(productId);
    this.favorites.set(next);
    const call = adding ? this.favos.agregar(productId) : this.favos.quitar(productId);
    call.subscribe({
      error: () => {
        const revert = new Set(this.favorites());
        adding ? revert.delete(productId) : revert.add(productId);
        this.favorites.set(revert);
      },
    });
  }

  isFavorite(productId: number): boolean {
    return this.favorites().has(productId);
  }

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

  onSearch(value: string): void {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(value.trim()), 350);
  }

  /** Lee el valor numérico de un input de precio y lo normaliza (vacío → 0). */
  private numFromEvent(event: Event): number {
    const v = (event.target as HTMLInputElement)?.value;
    return v !== undefined && v !== null ? +v || 0 : 0;
  }

  onPriceMin(event: Event): void { this.priceMin.set(this.numFromEvent(event)); this.page.set(1); }
  onPriceMax(event: Event): void { this.priceMax.set(this.numFromEvent(event)); this.page.set(1); }

  selectBrand(value: string): void {
    this.brand.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.selectCategory('all');
    this.selectBrand('');
    this.clearPrice();
  }

  selectCategory(value: string): void {
    this.category.set(value === 'all' || value === 'none' ? value : Number(value));
    this.page.set(1);
  }

  clearPrice(): void {
    this.priceMin.set(this.precioMinGlobal());
    this.priceMax.set(this.precioMaxGlobal());
    this.page.set(1);
  }

  previous(): void { this.page.update((v) => Math.max(1, v - 1)); scrollTo({ top: 0, behavior: 'smooth' }); }
  next(): void { this.page.update((v) => Math.min(this.totalPages(), v + 1)); scrollTo({ top: 0, behavior: 'smooth' }); }
  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  productImage(product: Producto): string { return product.imagen_url || 'no-product.svg'; }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
    this.categoriesSub?.unsubscribe();
    this.favosSub?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.addedTimer) clearTimeout(this.addedTimer);
  }
}
