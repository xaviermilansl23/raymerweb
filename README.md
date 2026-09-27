# Raymer Web

Frontend Angular para clientes, basado en la aplicación Flutter `raymerapp` y conectado a `raymerback`.

## Desarrollo

1. Instala dependencias con `npm install`.
2. Inicia `raymerback` en `https://10.243.90.201:3000`.
3. Ejecuta `npm start`.
4. Abre `http://localhost:4200`.

El proxy de desarrollo reenvía `/api` y `/uploads` al backend y admite su certificado local. Para otro host, actualiza `proxy.conf.json`.

## Producción

Ejecuta `npm run build`. El servidor web debe reenviar `/api` y `/uploads` al backend de Raymer.
