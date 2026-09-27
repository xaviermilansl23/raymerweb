// Ambiente de desarrollo.
// En dev, /api y /uploads se reenvían por proxy al backend (proxy.conf.json).
export const environment = {
  production: false,
  apiUrl: '/api',
  uploadsUrl: '/uploads',
};