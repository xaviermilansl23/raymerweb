import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, Cliente } from './models';

const ACCESS_KEY = 'raymer_access_token';
const REFRESH_KEY = 'raymer_refresh_token';

/** Decodifica el `sub` (cliente_id) de un JWT sin verificar firma. */
function decodeClienteId(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const id = Number(payload?.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.apiUrl.replace(/\/$/, '');
  private readonly access = signal(localStorage.getItem(ACCESS_KEY));
  private readonly refresh = signal(localStorage.getItem(REFRESH_KEY));
  readonly isAuthenticated = computed(() => Boolean(this.access()));
  readonly clienteId = computed(() => decodeClienteId(this.access()));

  accessToken(): string | null { return this.access(); }
  refreshToken(): string | null { return this.refresh(); }

  login(login: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseApi}/auth-cliente/login`, { login, password }).pipe(
      tap((response) => this.saveTokens(response.accessToken, response.refreshToken)),
    );
  }

  register(payload: {
    nombre: string;
    correo: string;
    usuario: string;
    telefono?: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseApi}/auth-cliente/registrar`, payload).pipe(
      tap((response) => this.saveTokens(response.accessToken, response.refreshToken)),
    );
  }

  profile(): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.baseApi}/mobile/clientes/perfil`);
  }

  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    this.access.set(accessToken);
    this.refresh.set(refreshToken);
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.access.set(null);
    this.refresh.set(null);
  }
}
