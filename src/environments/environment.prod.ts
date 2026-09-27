// Ambiente de producción.
// Ajusta apiUrl/uploadsUrl según dónde se sirva la app (reverse proxy o CDN).
export const environment = {
  production: true,
  apiUrl: '/api',
  uploadsUrl: '/uploads',
};