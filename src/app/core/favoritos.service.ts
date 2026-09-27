import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto } from './models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private get baseApi(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  ids(): Observable<number[]> {
    if (!this.auth.isAuthenticated()) return of([]);
    return this.http.get<{ ids: number[] }>(`${this.baseApi}/mobile/favoritos/ids`).pipe(
      map((res) => res.ids),
    );
  }

  agregar(id: number): Observable<{ favorito: boolean; producto_id: number }> {
    if (!this.auth.isAuthenticated()) return throwError(() => new Error('Inicia sesión para guardar en tu lista de deseos.'));
    return this.http.post<{ favorito: boolean; producto_id: number }>(`${this.baseApi}/mobile/favoritos/${id}`, {});
  }

  quitar(id: number): Observable<{ favorito: boolean; producto_id: number }> {
    if (!this.auth.isAuthenticated()) return throwError(() => new Error('Inicia sesión para modificar tu lista de deseos.'));
    return this.http.delete<{ favorito: boolean; producto_id: number }>(`${this.baseApi}/mobile/favoritos/${id}`);
  }

  listar(): Observable<Producto[]> {
    if (!this.auth.isAuthenticated()) return of([]);
    return this.http.get<Producto[]>(`${this.baseApi}/mobile/favoritos`);
  }
}
