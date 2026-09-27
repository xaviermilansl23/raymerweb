import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Producto } from './models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  private get baseApi(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  products(query = ''): Observable<Producto[]> {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http
      .get<Producto[]>(`${this.baseApi}/mobile/productos`, { params })
      .pipe(map((items) => items.map((item) => this.normalize(item))));
  }

  product(id: number | string): Observable<Producto | null> {
    return this.http
      .get<Producto | null>(`${this.baseApi}/mobile/productos/${id}`)
      .pipe(map((item) => (item ? this.normalize(item) : null)));
  }

  categories(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.baseApi}/mobile/tipo-producto`);
  }

  private normalize(item: Producto): Producto {
    return {
      ...item,
      precio_venta: Number(item.precio_venta ?? 0),
      stock_disponible: Number(item.stock_disponible ?? 0),
      imagen_url: this.webAssetUrl(item.imagen_url),
      imagenes: (item.imagenes ?? [])
        .map((u) => this.webAssetUrl(u))
        .filter((u): u is string => !!u),
    };
  }

  /** Las imágenes del backend llegan absolutas (https://host/uploads/...).
   *  Se reescriben a su ruta relativa /uploads/... para que las sirva el
   *  mismo origen (proxy dev o reverse proxy en producción). */
  private webAssetUrl(value: string | null): string | null {
    if (!value) return null;
    if (value.startsWith('/')) return value;
    try {
      const url = new URL(value);
      if (url.pathname.startsWith('/uploads/')) return url.pathname;
    } catch {
      /* ignorar URL mal formada */
    }
    return value;
  }
}