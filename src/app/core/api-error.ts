import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback = 'No pudimos completar la operación'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  const message = error.error?.message;
  if (Array.isArray(message)) return String(message[0] ?? fallback);
  if (typeof message === 'string' && message.trim()) return message;
  if (error.status === 0) return 'No se pudo conectar con el servidor';
  return fallback;
}
