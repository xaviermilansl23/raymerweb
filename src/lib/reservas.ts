import type { CotizacionItem } from './cotizacion.service';

export type ReservationStatus = 'ACTIVA' | 'COORDINADA' | 'ENTREGADA' | 'CANCELADA' | 'VENCIDA';
export type DeliveryMode = 'RECOJO' | 'DELIVERY';
export interface ReservationProduct {
  producto_id: number; nombre: string; cantidad: number; precio_unitario: number;
  precio_original: number; descuento_porcentaje: number; subtotal: number;
}
export interface Reservation {
  reserva_id: string; cliente_id: number; venta_id: number; estado: ReservationStatus;
  venta_estado: string; modalidad: DeliveryMode; telefono: string; direccion: string | null;
  notas_cliente: string; creada_en: string; vence_en: string; coordinada_en: string | null;
  entregada_en: string | null; cerrada_en: string | null; total: number; pago_registrado: boolean;
  productos: ReservationProduct[];
}
export interface ReservationPage { items: Reservation[]; pagina: number; limite: number; hayMas: boolean }
export interface ReservationRequest {
  operacionId: string; productos: { productoId: number; cantidad: number }[];
  modalidad: DeliveryMode; telefono: string; direccion?: string; notas?: string;
}
export interface PendingReservation {
  clienteId: number; request: ReservationRequest;
  summary: { productoId: number; nombre: string; cantidad: number; precio: number }[];
}
export interface ReservationReceipt { pending: PendingReservation; reservaId: string; confirmedAt: number }
export const reservationLabels: Record<ReservationStatus, string> = {
  ACTIVA: 'Activa', COORDINADA: 'Coordinada', ENTREGADA: 'Entregada', CANCELADA: 'Cancelada', VENCIDA: 'Vencida',
};
export const pendingKey = (clienteId: number) => `raymer_next_reserva_${clienteId}`;
export const receiptKey = (clienteId: number) => `${pendingKey(clienteId)}_confirmada`;
const uuidV4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
export function operationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function requestError(body: ReservationRequest): string {
  if (!uuidV4.test(body.operacionId)) return 'No se pudo identificar la solicitud. Vuelve a intentarlo.';
  if (!Array.isArray(body.productos) || body.productos.length < 1 || body.productos.length > 30) return 'Selecciona entre 1 y 30 productos distintos por reserva.';
  if (body.productos.some(p => !p || !Number.isSafeInteger(p.productoId) || p.productoId < 1 || !Number.isSafeInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 1000)
    || new Set(body.productos.map(p => p.productoId)).size !== body.productos.length) return 'Revisa las cantidades: entre 1 y 1000 unidades por producto, sin repetir productos.';
  if (!['RECOJO', 'DELIVERY'].includes(body.modalidad)) return 'Elige recojo en tienda o delivery.';
  if (typeof body.telefono !== 'string' || !/^\+?[\d ()-]{7,30}$/.test(body.telefono) || (body.telefono.match(/\d/g) || []).length < 7) return 'Ingresa un teléfono válido con al menos 7 dígitos.';
  if ((body.modalidad === 'DELIVERY' && typeof body.direccion !== 'string')
    || (body.direccion !== undefined && (typeof body.direccion !== 'string' || body.direccion.trim().length < 5 || body.direccion.length > 500))) return 'Ingresa la dirección de delivery (entre 5 y 500 caracteres).';
  if (body.notas !== undefined && (typeof body.notas !== 'string' || body.notas.length > 500)) return 'Las indicaciones pueden tener hasta 500 caracteres.';
  return '';
}

export function createPending(clienteId: number, items: CotizacionItem[], data: { modalidad: DeliveryMode; telefono: string; direccion: string; notas: string }): PendingReservation {
  const request: ReservationRequest = {
    operacionId: operationId(), productos: items.map(i => ({ productoId: i.producto.producto_id, cantidad: i.cantidad })),
    modalidad: data.modalidad, telefono: data.telefono.trim(),
    ...(data.modalidad === 'DELIVERY' && { direccion: data.direccion.trim() }),
    ...(data.notas.trim() && { notas: data.notas.trim() }),
  };
  const error = requestError(request); if (error) throw new Error(error);
  return { clienteId, request, summary: items.map(i => ({ productoId: i.producto.producto_id, nombre: i.producto.nombre, cantidad: i.cantidad, precio: i.producto.precio_venta })) };
}

export function readPending(value: string | null, clienteId: number): PendingReservation | null {
  if (!value) return null;
  let p: PendingReservation;
  try { p = JSON.parse(value) as PendingReservation; }
  catch { throw new Error('No pudimos leer la solicitud guardada. Contacta a Raymer para verificar tus reservas antes de volver a reservar.'); }
  if (!p || p.clienteId !== clienteId || !p.request || requestError(p.request) || !Array.isArray(p.summary)
    || p.summary.length !== p.request.productos.length || p.summary.some((i, index) => !i || i.productoId !== p.request.productos[index].productoId
      || i.cantidad !== p.request.productos[index].cantidad || typeof i.nombre !== 'string' || typeof i.precio !== 'number' || !Number.isFinite(i.precio) || i.precio < 0)) {
    throw new Error('No pudimos leer la solicitud guardada. Contacta a Raymer para verificar tus reservas antes de volver a reservar.');
  }
  return p;
}

export function matchingReceipt(value: string | null, intent: PendingReservation, startedAt: number): ReservationReceipt | null {
  try {
    const receipt = JSON.parse(value || 'null') as ReservationReceipt | null;
    if (!receipt || !uuidV4.test(receipt.reservaId) || !Number.isFinite(receipt.confirmedAt)) return null;
    const saved = readPending(JSON.stringify(receipt.pending), intent.clienteId);
    if (!saved) return null;
    if (saved.request.operacionId === intent.request.operacionId) return receipt;
    const signature = (p: ReservationRequest) => JSON.stringify({ productos: [...p.productos].sort((a, b) => a.productoId - b.productoId), modalidad: p.modalidad, telefono: p.telefono, direccion: p.direccion || '', notas: p.notas || '' });
    return receipt.confirmedAt >= startedAt && signature(saved.request) === signature(intent.request) ? receipt : null;
  } catch { return null; }
}

export const canCancelReservation = (r: Reservation, now = Date.now()) => r.estado === 'ACTIVA' && !r.pago_registrado && Date.parse(r.vence_en) > now;
export function reservationTime(r: Reservation, now = Date.now()): string {
  if (r.estado === 'COORDINADA') return 'Se conserva hasta la entrega o cancelación del personal.';
  if (r.estado !== 'ACTIVA') return r.estado === 'VENCIDA' ? 'La reserva venció y el stock fue liberado.' : '';
  const ms = Date.parse(r.vence_en) - now;
  if (ms <= 0) return 'Plazo cumplido. Verificando el estado de la reserva…';
  const minutes = Math.ceil(ms / 60_000);
  return `Quedan ${Math.floor(minutes / 60)} h ${minutes % 60} min para coordinar con el personal.`;
}
export function reservationWhatsApp(r: Reservation): string {
  const text = `Hola Raymer, quiero coordinar ${r.modalidad === 'DELIVERY' ? 'el delivery' : 'el recojo'} de mi reserva ${r.reserva_id}.\n${r.productos.map(p => `• ${p.nombre} x${p.cantidad}`).join('\n')}`;
  return `https://wa.me/59172768877?text=${encodeURIComponent(text)}`;
}
