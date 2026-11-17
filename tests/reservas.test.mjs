import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const load = async path => {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
const { clientIdFromToken, readQuotation, safeReturnPath, sameSelection } = await load('../src/lib/customer-state.ts');
const { createPending, readPending, matchingReceipt, pendingKey, receiptKey, requestError, operationId, canCancelReservation, reservationTime, reservationWhatsApp } = await load('../src/lib/reservas.ts');
const selection = [{ producto: { producto_id: 12, nombre: 'Teclado', precio_venta: 150.75, stock_disponible: 10 }, cantidad: 2 }];
const fields = { modalidad: 'DELIVERY', telefono: ' +591 70000000 ', direccion: ' Calle Ecuador 123 ', notas: ' Tocar el timbre ' };
const pending = () => createPending(41, selection, fields);

test('La cotización de visitante se recupera sin cuenta y conserva cantidades y precios', () => {
  assert.deepEqual(readQuotation(JSON.stringify(selection)), selection);
  assert.deepEqual(readQuotation('{'), []);
  assert.deepEqual(readQuotation('null'), []);
  const invalid = [null, { ...selection[0], cantidad: -1 }, { ...selection[0], cantidad: 11 }, { ...selection[0], producto: { ...selection[0].producto, precio_venta: '150' } }];
  assert.deepEqual(readQuotation(JSON.stringify(invalid)), []);
  assert.deepEqual(readQuotation(JSON.stringify([...selection, ...selection])), selection);
});

test('La selección solo se vacía si todavía coincide con los productos reservados', () => {
  assert.equal(sameSelection(selection, [{ productoId: 12, cantidad: 2 }]), true);
  assert.equal(sameSelection(selection, [{ productoId: 12, cantidad: 1 }]), false);
  assert.equal(sameSelection(selection, [{ productoId: 13, cantidad: 2 }]), false);
  assert.equal(sameSelection([...selection, { ...selection[0], producto: { ...selection[0].producto, producto_id: 13 } }], [{ productoId: 12, cantidad: 2 }]), false);
});

test('El retorno al iniciar sesión acepta reservas y servicio técnico y rechaza redirecciones externas', () => {
  for (const path of ['/reservas', '/reservas/nueva', '/favoritos', '/productos/12', '/perfil', '/servicio-tecnico']) assert.equal(safeReturnPath(path), path);
  for (const path of [null, '//evil.example', 'https://evil.example', '/reservas/../admin', '/reservas?redirect=https://evil.example', '/admin']) assert.equal(safeReturnPath(path), '/productos');
});

test('El almacenamiento de solicitudes se separa por cuenta de cliente', () => {
  const token = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
  assert.equal(clientIdFromToken(token({ sub: 41, token_use: 'CLIENTE' })), 41);
  assert.equal(clientIdFromToken(token({ sub: 41, token_use: 'PERSONAL' })), null);
  assert.equal(clientIdFromToken('inválido'), null);
  assert.notEqual(pendingKey(41), pendingKey(42));
  assert.notEqual(receiptKey(41), pendingKey(41));
  assert.throws(() => readPending(JSON.stringify(pending()), 42));
});

test('Reservar usa un identificador UUIDv4 y no permite fijar cliente, precio ni vencimiento', () => {
  const p = pending();
  assert.match(p.request.operacionId, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.notEqual(operationId(), operationId());
  assert.deepEqual(p.request.productos, [{ productoId: 12, cantidad: 2 }]);
  assert.equal(p.request.telefono, '+591 70000000');
  assert.equal(p.request.direccion, 'Calle Ecuador 123');
  assert.equal(p.request.notas, 'Tocar el timbre');
  assert.deepEqual(Object.keys(p.request).sort(), ['direccion', 'modalidad', 'notas', 'operacionId', 'productos', 'telefono']);
});

test('Recargar conserva exactamente la solicitud original para reintentar sin duplicar', () => {
  const p = pending(); const saved = JSON.stringify(p);
  const recovered = readPending(saved, 41);
  assert.deepEqual(recovered, p);
  assert.equal(JSON.stringify(recovered.request), JSON.stringify(p.request));
  assert.equal(readPending(null, 41), null);
  assert.throws(() => readPending('{', 41));
  assert.throws(() => readPending(JSON.stringify({ ...p, summary: [] }), 41));
});

test('Delivery requiere dirección, teléfono real y cantidades válidas', () => {
  const body = pending().request;
  assert.equal(requestError(body), '');
  for (const changes of [{ direccion: undefined }, { direccion: 'a' }, { telefono: '-------' }, { telefono: 'abc1234567' }, { notas: 'x'.repeat(501) }, { productos: [] }, { productos: [{ productoId: 12, cantidad: 1001 }] }, { productos: [...body.productos, ...body.productos] }, { productos: [{ productoId: 12, cantidad: 1.5 }] }]) assert.notEqual(requestError({ ...body, ...changes }), '', JSON.stringify(changes));
  const pickup = createPending(41, selection, { ...fields, modalidad: 'RECOJO' });
  assert.equal(pickup.request.direccion, undefined);
  assert.equal(requestError(pickup.request), '');
});

test('Varias pestañas que confirman la misma selección pueden recuperar el resultado ya registrado', () => {
  const p = pending(); const receipt = { pending: p, reservaId: operationId(), confirmedAt: 2000 };
  assert.deepEqual(matchingReceipt(JSON.stringify(receipt), p, 3000), receipt);
  const concurrent = pending();
  assert.deepEqual(matchingReceipt(JSON.stringify(receipt), concurrent, 1000), receipt);
  assert.equal(matchingReceipt(JSON.stringify(receipt), concurrent, 3000), null);
  assert.equal(matchingReceipt(JSON.stringify(receipt), { ...concurrent, clienteId: 42 }, 1000), null);
  concurrent.request.productos[0].cantidad = 3;
  assert.equal(matchingReceipt(JSON.stringify(receipt), concurrent, 1000), null);
});

test('Solo una reserva activa y sin pago permite cancelación por el cliente', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const r = { estado: 'ACTIVA', pago_registrado: false, vence_en: '2026-10-28T12:00:00Z' };
  assert.equal(canCancelReservation(r, now), true);
  for (const estado of ['COORDINADA', 'ENTREGADA', 'VENCIDA', 'CANCELADA']) assert.equal(canCancelReservation({ ...r, estado }, now), false);
  assert.equal(canCancelReservation({ ...r, pago_registrado: true }, now), false);
  assert.equal(canCancelReservation(r, now + 24 * 3600_000), false);
});

test('El plazo original y la conservación por coordinación se explican sin reiniciar las 24 horas', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const r = { estado: 'ACTIVA', vence_en: '2026-10-28T12:00:00Z' };
  assert.match(reservationTime(r, now), /24 h 0 min/);
  assert.match(reservationTime(r, now + 3600_000), /23 h 0 min/);
  assert.match(reservationTime(r, now + 24 * 3600_000), /Verificando/);
  assert.match(reservationTime({ ...r, estado: 'COORDINADA' }, now + 48 * 3600_000), /hasta la entrega/);
});

test('WhatsApp usa el contacto de la tienda e identifica la reserva', () => {
  const id = operationId();
  const url = new URL(reservationWhatsApp({ reserva_id: id, modalidad: 'DELIVERY', productos: [{ nombre: 'Teclado & Mouse', cantidad: 2 }] }));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/59172768877');
  assert.match(url.searchParams.get('text'), new RegExp(id));
  assert.match(url.searchParams.get('text'), /delivery/);
  assert.match(url.searchParams.get('text'), /Teclado & Mouse x2/);
});
