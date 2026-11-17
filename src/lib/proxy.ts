import http from 'node:http';
import https from 'node:https';
import type { NextRequest } from 'next/server';

// El destino lo fija el servidor; el navegador nunca puede elegir otro host.
export async function proxy(request: NextRequest) {
  const base = process.env.BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'https://10.243.90.201:3000' : '');
  let target: URL;
  try {
    target = new URL(base);
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Protocolo no admitido');
  } catch {
    console.error('Configura BACKEND_URL con la dirección HTTP(S) de la API Raymer.');
    return Response.json({ message: 'El servicio está temporalmente fuera de línea. Por favor, intenta más tarde o comunícate con un asesor.' }, { status: 503 });
  }
  target.pathname = request.nextUrl.pathname;
  target.search = request.nextUrl.search;
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.from(await request.arrayBuffer());
  const headers: Record<string, string> = {};
  for (const key of ['authorization', 'content-type', 'accept', 'range']) {
    const value = request.headers.get(key);
    if (value) headers[key] = value;
  }
  try {
    return await new Promise<Response>((resolve, reject) => {
      const transport = target.protocol === 'https:' ? https : http;
      const upstream = transport.request(target, {
        method: request.method, headers,
        rejectUnauthorized: !(process.env.NODE_ENV === 'development' && process.env.BACKEND_ALLOW_SELF_SIGNED === 'true'),
      }, response => {
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(Buffer.from(chunk)));
        response.on('error', reject);
        response.on('end', () => {
          const outgoing = new Headers({ 'Cache-Control': 'no-store' });
          for (const key of ['content-type', 'content-range', 'accept-ranges']) {
            const value = response.headers[key];
            if (typeof value === 'string') outgoing.set(key, value);
          }
          const status = response.statusCode || 502;
          resolve(new Response([204, 304].includes(status) || request.method === 'HEAD' ? null : Buffer.concat(chunks), { status, headers: outgoing }));
        });
      });
      upstream.setTimeout(15000, () => upstream.destroy(new Error('Backend timeout')));
      upstream.on('error', reject);
      if (body) upstream.write(body);
      upstream.end();
    });
  } catch {
    return Response.json({ message: 'No pudimos conectar con Raymer. Vuelve a intentarlo en un momento o comunícate con nuestro equipo.' }, { status: 502 });
  }
}
