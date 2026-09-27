import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export function signInMessage(reason: string | null): string {
  if (reason === 'cotizacion') return 'Inicia sesión o crea tu cuenta para preparar y descargar tu cotización.';
  if (reason === 'favoritos') return 'Inicia sesión o crea tu cuenta para guardar productos en tu lista de deseos.';
  return 'Inicia sesión o crea tu cuenta para acceder a tu perfil. Puedes explorar el catálogo como visitante.';
}

/** Solo destinos locales del sitio; evita redirecciones externas y bucles de login. */
export function safeReturnUrl(value: string | null): string {
  return value && /^\/(productos(?:\/\d+)?|perfil|favoritos|combos|nosotros)(?:[?#][^\\]*)?$/.test(value)
    ? value : '/productos';
}

@Injectable({ providedIn: 'root' })
export class SessionAccessService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  requireSession(reason: 'cotizacion' | 'favoritos'): boolean {
    if (this.auth.isAuthenticated()) return true;
    void this.router.navigate(['/login'], {
      queryParams: { reason, returnUrl: safeReturnUrl(this.router.url) },
    });
    return false;
  }
}
