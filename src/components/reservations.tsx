'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorMessage, money } from '@/lib/api';
import {
  canCancelReservation, pendingKey, readPending, reservationLabels, reservationTime, reservationWhatsApp,
  type Reservation, type ReservationPage, type ReservationStatus,
} from '@/lib/reservas';
import { Protected } from './protected';
import { useStore } from './store';
import { Icon } from './icons';

export const reservationDate = (value: string) => new Date(value).toLocaleString('es-BO', {
  timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'short',
});

export function ReservationProducts({ reservation }: { reservation: Reservation }) {
  return <ul className="reservation-products">{reservation.productos.map((p, index) => <li key={`${p.producto_id}-${index}`}>
    <div><strong>{p.nombre}</strong><span>{p.cantidad} × {money(Number(p.precio_unitario))}{Number(p.descuento_porcentaje) > 0 && <small> · Descuento {Number(p.descuento_porcentaje)}%</small>}</span></div>
    <b>{money(Number(p.subtotal))}</b>
  </li>)}</ul>;
}

export function Reservations() {
  const s = useStore();
  return <Protected><ReservationHistory key={s.session}/></Protected>;
}

function ReservationHistory() {
  const s = useStore();
  const [data, setData] = useState<ReservationPage | null>(null);
  const [page, setPage] = useState(1); const [status, setStatus] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false); const [pendingError, setPendingError] = useState('');
  const [attempt, setAttempt] = useState(0); const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [cancelId, setCancelId] = useState<string | null>(null); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const cancelling = useRef(false);
  useEffect(() => {
    if (!s.clienteId) return;
    const key = pendingKey(s.clienteId);
    const sync = () => {
      try { setPending(Boolean(readPending(localStorage.getItem(key), s.clienteId!))); setPendingError(''); }
      catch (e) { setPendingError(errorMessage(e)); }
    };
    const storage = (e: StorageEvent) => { if (e.key === key) sync(); };
    sync(); window.addEventListener('storage', storage);
    return () => window.removeEventListener('storage', storage);
  }, [s.clienteId]);
  useEffect(() => {
    let active = true; let running = false;
    setData(null); setError('');
    const load = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true; setRefreshing(true); setNow(Date.now());
      try {
        const result = await s.api<ReservationPage>(`/mobile/reservas?pagina=${page}${status ? `&estado=${status}` : ''}`);
        if (active) { setData(result); setError(''); }
      } catch (e) { if (active) setError(errorMessage(e)); }
      finally { running = false; if (active) setRefreshing(false); }
    };
    void load(); const timer = window.setInterval(load, 30_000);
    window.addEventListener('focus', load); document.addEventListener('visibilitychange', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
  }, [s.api, page, status, attempt]);

  async function cancel(e: FormEvent<HTMLFormElement>, reservation: Reservation) {
    e.preventDefault(); if (cancelling.current || !canCancelReservation(reservation)) return;
    if (reason.trim().length < 3) { setError('Escribe el motivo de la cancelación.'); return; }
    cancelling.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await s.api(`/mobile/reservas/${reservation.reserva_id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo: reason.trim() }) });
      if (s.sessionActive(s.session)) { setCancelId(null); setReason(''); setMessage('Reserva cancelada. Sus productos vuelven a estar disponibles.'); setAttempt(v => v + 1); }
    } catch (e) { if (s.sessionActive(s.session)) setError(errorMessage(e)); }
    finally { cancelling.current = false; if (s.sessionActive(s.session)) setBusy(false); }
  }

  return <>
    <section className="page-heading reservation-heading"><span className="eyebrow">MI CUENTA · RAYMER</span><h1>Mis reservas.</h1><p>Tus productos, separados para ti. Coordina el recojo o delivery con nuestro personal.</p></section>
    <section className="reservations-content">
      <div className="reservation-intro"><div className="reservation-guide"><Icon name="shield"/><p>Dispones de <strong>24 horas</strong> para recoger o coordinar. Cuando el personal confirme el acuerdo, conservaremos tu reserva hasta la entrega o su cancelación. Abrir WhatsApp no confirma el acuerdo.</p></div><Link className="button" href={s.items.length || pending ? '/reservas/nueva' : '/productos'}>{pending ? 'Revisar solicitud pendiente' : s.items.length ? 'Reservar mi cotización' : 'Seleccionar productos'}<Icon name="arrow"/></Link></div>
      {pending && <div className="reservation-notice" role="status"><strong>Hay una solicitud pendiente de confirmar.</strong><p>Comprueba su resultado antes de crear otra reserva.</p><Link href="/reservas/nueva" className="text-link">Recuperar solicitud →</Link></div>}
      {pendingError && <p className="error" role="alert">{pendingError}</p>}
      {message && <p className="success" role="status">{message}</p>}
      <div className="reservation-toolbar"><label>Estado<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); setCancelId(null); }}><option value="">Todos los estados</option>{Object.entries(reservationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button disabled={refreshing || busy} onClick={() => setAttempt(v => v + 1)}>{refreshing ? 'Actualizando…' : 'Actualizar'}</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p role="status">Cargando tus reservas…</p>}
      {data && !data.items.length && <div className="empty"><Icon name="bag" width="36" height="36"/><h2>{status ? 'No hay reservas con este estado' : 'Aún no tienes reservas'}</h2><p>Agrega uno o varios productos a tu cotización y elige «Reservar por 24 horas».</p><Link className="button secondary" href="/productos">Explorar productos</Link></div>}
      <div className="reservation-list">{data?.items.map(r => <article className="reservation-card" key={r.reserva_id}>
        <div className="reservation-card-head"><div><span className="eyebrow">RESERVA</span><h2>{r.modalidad === 'DELIVERY' ? 'Delivery' : 'Recojo en tienda'}</h2><span className="reservation-code">{r.reserva_id}</span></div><span className={`reservation-status status-${r.estado.toLowerCase()}`}>{reservationLabels[r.estado as ReservationStatus]}</span></div>
        <p className="reservation-created">Creada el {reservationDate(r.creada_en)} · Hora de Bolivia</p>
        <ReservationProducts reservation={r}/>
        <div className="reservation-total"><span>Total de productos</span><strong>{money(Number(r.total))}</strong></div>
        <div className="reservation-info"><p><strong>Contacto:</strong> {r.telefono}</p>{r.direccion && <p><strong>Dirección:</strong> {r.direccion}</p>}{r.notas_cliente && <p><strong>Tus indicaciones:</strong> {r.notas_cliente}</p>}<p><strong>Pago:</strong> {r.pago_registrado ? 'Registrado por el personal' : ['CANCELADA', 'VENCIDA'].includes(r.estado) ? 'Sin pago registrado' : 'Pendiente de coordinar con el personal'}</p></div>
        {r.estado === 'ACTIVA' && <p className="reservation-deadline">Coordina antes del {reservationDate(r.vence_en)} (Bolivia).</p>}
        {reservationTime(r, now) && <p className={`reservation-timing ${r.estado === 'COORDINADA' ? 'coordinated' : ''}`}>{reservationTime(r, now)}</p>}
        {r.estado === 'ENTREGADA' && r.entregada_en && <p className="reservation-timing coordinated">Entrega confirmada el {reservationDate(r.entregada_en)}.</p>}
        {(r.estado === 'ACTIVA' || r.estado === 'COORDINADA') && <><div className="reservation-actions"><a className="button whatsapp" href={reservationWhatsApp(r)} target="_blank" rel="noopener noreferrer"><Icon name="chat"/>Coordinar por WhatsApp</a>{canCancelReservation(r, now) && <button disabled={busy} onClick={() => { setCancelId(r.reserva_id); setReason(''); }}>Cancelar reserva</button>}</div><p className="reservation-footnote">{r.modalidad === 'DELIVERY' ? 'El costo y horario del delivery se acuerdan por separado. ' : ''}{r.estado === 'COORDINADA' ? 'Para modificar o cancelar esta reserva, contacta al personal.' : 'El personal debe registrar la coordinación para conservar tu reserva después del plazo.'}</p></>}
        {cancelId === r.reserva_id && canCancelReservation(r, now) && <form className="reservation-cancel" onSubmit={e => cancel(e, r)}><h3>Cancelar esta reserva</h3><p>Los productos quedarán disponibles para otros clientes.</p><label>Motivo<textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={3} maxLength={500} disabled={busy}/></label><div className="reservation-actions"><button className="button secondary" disabled={busy}>{busy ? 'Cancelando…' : 'Confirmar cancelación'}</button><button type="button" disabled={busy} onClick={() => setCancelId(null)}>Conservar reserva</button></div></form>}
      </article>)}</div>
      {data && (page > 1 || data.hayMas) && <nav className="reservation-pagination" aria-label="Páginas de reservas"><button disabled={page <= 1 || refreshing || busy} onClick={() => { setPage(p => p - 1); setCancelId(null); }}>Anterior</button><span>Página {page}</span><button disabled={!data.hayMas || refreshing || busy} onClick={() => { setPage(p => p + 1); setCancelId(null); }}>Siguiente</button></nav>}
      <p className="reservation-footnote">Los estados se actualizan cada 30 segundos mientras esta página está visible.</p>
    </section>
  </>;
}
