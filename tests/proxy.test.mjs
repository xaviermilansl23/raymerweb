import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Usa un backend local desechable: no toca cuentas ni datos reales.
test('Páginas y proxy de producción conservan métodos, tokens, consultas y errores', { timeout: 60000 }, async t => {
  const comboId = 'a728e442-53b7-490b-b6ec-357928718afc';
  const combo = { id: comboId, titulo: 'PC Gamer', descripcion: 'Equipo armado', publicado: true };
  const banner = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/pkAAAAASUVORK5CYII=', 'base64');
  const backend = http.createServer(async (req, res) => {
    if (req.url === '/api/empty') { res.writeHead(204); res.end(); return; }
    if (req.url === '/uploads/sample.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg/>'); return; }
    if (req.url === '/api/denied') { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end('{"message":"Sesión expirada"}'); return; }
    if (req.url === '/api/combos/publicados') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify([combo])); return; }
    if (req.url === `/api/combos/publicados/${comboId}/imagen`) { res.setHeader('Content-Type', 'image/png'); res.end(banner); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ path: req.url, method: req.method, authorization: req.headers.authorization, body }));
  });
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3109'], {
    env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${backend.address().port}`, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = ''; server.stdout.on('data', c => output += c); server.stderr.on('data', c => output += c);
  t.after(async () => { server.kill(); backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve)); });
  const base = 'http://localhost:3109';
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { const res = await fetch(`${base}/login`); if (res.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, output);
  for (const page of ['/productos', '/productos/1', '/favoritos', '/perfil', '/registro', '/nosotros', '/combos', '/reservas', '/reservas/nueva', '/servicio-tecnico']) {
    assert.equal((await fetch(`${base}${page}`)).status, 200, page);
  }
  assert.equal((await fetch(`${base}/pagina-inexistente`)).status, 404);
  const combosPage = await (await fetch(`${base}/combos`)).text();
  assert.match(combosPage, /<h1>Combos y PCs armadas<\/h1>/);
  const combos = await fetch(`${base}/api/combos/publicados`);
  assert.equal(combos.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await combos.json(), [combo]);
  const comboImage = await fetch(`${base}/api/combos/publicados/${comboId}/imagen`);
  assert.equal(comboImage.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await comboImage.arrayBuffer()), banner);
  const storefront = await (await fetch(`${base}/productos`)).text();
  assert.match(storefront, /Tu equipo/);
  assert.match(storefront, /Pausar animación del equipo/);
  assert.match(storefront, /PREPARANDO TU EXPERIENCIA/);
  assert.doesNotMatch(storefront, /id="servicios"/);
  const about = await (await fetch(`${base}/nosotros`)).text();
  assert.match(about, /<h3>Servicios que ofrecemos<\/h3>/);
  assert.match(about, /id="servicios"/);
  const pcBuilder = await fetch(`${base}/arma-tu-pc`);
  assert.equal(pcBuilder.status, 200);
  const pcBuilderHtml = await pcBuilder.text();
  assert.match(pcBuilderHtml, /href="#pc-recommendation"/);
  assert.match(pcBuilderHtml, /<h2 id="pc-planner-title">Recomiéndame una PC<\/h2>/);
  assert.doesNotMatch(storefront, /Forma de la escultura|Órbita|Núcleo|Prisma/);
  assert.match(storefront, /facebook\.com\/ACCESORIOSDEPORTATILES/);
  assert.match(storefront, /instagram\.com\/corpraymer/);
  assert.match(storefront, /tiktok\.com\/@corpraymersrl/);
  // El único selector desplegable es el orden: categorías y marcas son etiquetas.
  assert.equal((storefront.match(/<select\b/g)||[]).length, 1);
  assert.equal((storefront.match(/<dialog\b/g)||[]).length, 3); // Categorías, marcas y cotización.
  assert.match(storefront, /aria-haspopup="dialog"/);
  assert.match(storefront, /<aside[^>]*id="catalog-filter-panel"/);
  assert.match(storefront, /Activar modo oscuro/);
  assert.match(storefront, /Mis reservas/);
  assert.match(storefront, /Cotiza sin iniciar sesión/);
  assert.doesNotMatch(storefront, /<span>(Facebook|Instagram|TikTok)<\/span>/);
  const response = await fetch(`${base}/api/mobile/productos?q=impresora`, { method: 'PUT', headers: { Authorization: 'Bearer prueba', 'Content-Type': 'application/json' }, body: '{"cantidad":2}' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { path: '/api/mobile/productos?q=impresora', method: 'PUT', authorization: 'Bearer prueba', body: '{"cantidad":2}' });
  const recommendationPath = '/api/mobile/armado-pc/recomendar';
  const recommendationBody = JSON.stringify({ presupuesto: 7350.5, uso: 'creacion', resolucion: '1440p' });
  const recommendation = await fetch(`${base}${recommendationPath}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: recommendationBody });
  assert.deepEqual(await recommendation.json(), { path: recommendationPath, method: 'POST', body: recommendationBody });
  const reservationBody = JSON.stringify({ operacionId: '2c460982-0792-4f57-a2bb-5fc6405df7be', productos: [{ productoId: 12, cantidad: 2 }], modalidad: 'RECOJO', telefono: '70000000' });
  for (const [path, method, body] of [
    ['/mobile/servicio-tecnico', 'GET', undefined],
    ['/mobile/reservas?pagina=2&estado=ACTIVA', 'GET', undefined],
    ['/mobile/reservas', 'POST', reservationBody],
    ['/mobile/reservas/2c460982-0792-4f57-a2bb-5fc6405df7be/cancelar', 'POST', '{"motivo":"Cambio de planes"}'],
  ]) {
    const res = await fetch(`${base}/api${path}`, { method, headers: { Authorization: 'Bearer cliente-prueba', 'Content-Type': 'application/json' }, ...(body && { body }) });
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), { path: `/api${path}`, method, authorization: 'Bearer cliente-prueba', body: body || '' });
  }
  assert.equal((await fetch(`${base}/api/empty`, { method: 'DELETE' })).status, 204);
  const denied = await fetch(`${base}/api/denied`);
  assert.equal(denied.status, 401); assert.deepEqual(await denied.json(), { message: 'Sesión expirada' });
  const image = await fetch(`${base}/uploads/sample.svg`);
  assert.equal(image.headers.get('content-type'), 'image/svg+xml'); assert.equal(await image.text(), '<svg/>');
  backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve));
  const unavailable = await fetch(`${base}/api/mobile/productos`);
  assert.equal(unavailable.status, 502);
  const message = (await unavailable.json()).message;
  assert.match(message, /Vuelve a intentarlo/);
  assert.doesNotMatch(message, /BACKEND_URL|env\.local|10\.243/);
});
