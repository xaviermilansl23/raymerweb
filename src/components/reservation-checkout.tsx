'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorMessage, money } from '@/lib/api';
import type { Cliente } from '@/lib/models';
import { createPending, matchingReceipt, pendingKey, receiptKey, readPending, reservationLabels, reservationWhatsApp, type DeliveryMode, type PendingReservation, type Reservation } from '@/lib/reservas';
import { Protected } from './protected';
import { ReservationProducts, reservationDate } from './reservations';
import { useStore } from './store';
import { Icon } from './icons';

export function ReservationCheckout() {
  const s = useStore();
  return <Protected><Checkout key={s.session}/></Protected>;
}

function Checkout() {
  const s = useStore(); const selection = s.items;
  const [pending, setPending] = useState<PendingReservation | null>(null); const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(''); const [error, setError] = useState('');
  const [mode, setMode] = useState<DeliveryMode>('RECOJO'); const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(''); const [notes, setNotes] = useState('');
  const [result, setResult] = useState<Reservation | null>(null); const [busy, setBusy] = useState(false); const sending = useRef(false);
  useEffect(() => {
    if (!s.clienteId) { setStorageError('No pudimos identificar tu cuenta. Cierra sesión y vuelve a ingresar.'); return; }
    let active = true; const key = pendingKey(s.clienteId);
    const sync = () => {
      try { const saved = readPending(localStorage.getItem(key), s.clienteId!); setPending(saved); setStorageError(''); }
      catch (e) { setStorageError(errorMessage(e)); }
      setLoaded(true);
    };
    const storage = (e: StorageEvent) => { if (e.key === key && !sending.current) sync(); };
    sync(); window.addEventListener('storage', storage);
    s.api<Cliente>('/mobile/clientes/perfil').then(p => { if (active) setPhone(value => value || p.telefono || ''); }).catch(() => undefined);
    return () => { active = false; window.removeEventListener('storage', storage); };
  }, [s.api, s.clienteId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (sending.current || !loaded || storageError || !s.clienteId || result) return;
    sending.current = true; setBusy(true); setError('');
    const key = pendingKey(s.clienteId); const completedKey = receiptKey(s.clienteId); const startedAt = Date.now();
    let submitted: PendingReservation | null = null;
    try {
      const intent = readPending(localStorage.getItem(key), s.clienteId) || createPending(s.clienteId, selection, { modalidad: mode, telefono: phone, direccion: address, notas: notes });
      const finish = (reservation: Reservation, request: PendingReservation) => {
        if (s.sessionActive(s.session)) {
          if (['ACTIVA', 'COORDINADA', 'ENTREGADA'].includes(reservation.estado)) s.clearReserved(request.request.productos, s.session);
          setPending(null); setResult(reservation);
        }
      };
      const send = async () => {
        if (!s.sessionActive(s.session)) throw new Error('La sesión cambió. Vuelve a iniciar sesión para revisar tu solicitud.');
        const existing = readPending(localStorage.getItem(key), s.clienteId!);
        const receipt = matchingReceipt(localStorage.getItem(completedKey), intent, startedAt);
        if (!existing && receipt) {
          finish(await s.api<Reservation>(`/mobile/reservas/${receipt.reservaId}`), receipt.pending); return;
        }
        submitted = existing || intent;
        const saved = JSON.stringify(submitted);
        localStorage.setItem(key, saved);
        if (localStorage.getItem(key) !== saved) throw new Error('No pudimos guardar la solicitud. Revisa el almacenamiento de tu navegador.');
        setPending(submitted);
        const reservation = await s.api<Reservation>('/mobile/reservas', { method: 'POST', body: JSON.stringify(submitted.request) });
        localStorage.setItem(completedKey, JSON.stringify({ pending: submitted, reservaId: reservation.reserva_id, confirmedAt: Date.now() }));
        if (localStorage.getItem(key) === saved) localStorage.removeItem(key);
        finish(reservation, submitted);
      };
      if (navigator.locks) await navigator.locks.request(`raymer-reserva-${s.clienteId}`, send);
      else await send();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 400 || status === 404 || status === 409) {
        try {
          if (submitted && localStorage.getItem(key) === JSON.stringify(submitted)) localStorage.removeItem(key);
          if (s.sessionActive(s.session)) setPending(null);
        } catch {}
      }
      if (s.sessionActive(s.session)) setError(errorMessage(e));
    } finally { sending.current = false; if (s.sessionActive(s.session)) setBusy(false); }
  }

  const summary = pending?.summary || selection.map(i => ({ productoId: i.producto.producto_id, nombre: i.producto.nombre, cantidad: i.cantidad, precio: i.producto.precio_venta }));
  const estimate = summary.reduce((sum, i) => sum + Math.round(i.precio * 100) * i.cantidad, 0) / 100;
  return <>
    <section className="page-heading reservation-heading"><span className="eyebrow">MI CUENTA · RAYMER</span><h1>{result ? 'Reserva registrada.' : 'Reserva tus productos.'}</h1><p>{result ? 'Consulta el estado y acuerda la entrega con nuestro personal.' : 'Uno o varios productos, separados por 24 horas para coordinar el recojo o delivery.'}</p></section>
    <section className="reservations-content"><Link href="/reservas" className="text-link">← Mis reservas</Link>
      {result ? <article className="reservation-card reservation-confirmation"><div className="reservation-success-icon"><Icon name="check" width="28" height="28"/></div><h2>{result.estado === 'ACTIVA' ? 'Tus productos ya están reservados' : 'Solicitud recuperada'}</h2><p className="reservation-code">{result.reserva_id}</p><p>Estado: <strong>{reservationLabels[result.estado]}</strong></p><ReservationProducts reservation={result}/><div className="reservation-total"><span>Total de productos</span><strong>{money(Number(result.total))}</strong></div>{result.estado === 'ACTIVA' && <p>Coordina antes del <strong>{reservationDate(result.vence_en)}</strong> (hora de Bolivia). El plazo se cuenta desde que se registró la reserva.</p>}{(result.estado === 'ACTIVA' || result.estado === 'COORDINADA') && <><a className="button whatsapp" href={reservationWhatsApp(result)} target="_blank" rel="noopener noreferrer"><Icon name="chat"/>Coordinar por WhatsApp</a><p className="reservation-footnote">El personal debe registrar el acuerdo. {result.modalidad === 'DELIVERY' && 'El costo y horario del delivery se coordinan por separado.'}</p></>}<Link href="/reservas" className="button secondary">Ver mis reservas</Link></article> : <>
        {storageError && <p className="error" role="alert">{storageError}</p>}
        {error && <p className="error" role="alert">{error}{pending && ' La solicitud permanece guardada para comprobar el resultado sin duplicarla.'}</p>}
        {!loaded && !storageError ? <p role="status">Preparando tu solicitud…</p> : !summary.length && !storageError ? <div className="empty"><h2>Selecciona tus productos</h2><p>Agrega productos a tu cotización y vuelve aquí para reservarlos.</p><Link href="/productos" className="button">Explorar productos</Link></div> : <div className="reservation-checkout-grid">
          <form className="form-card reservation-form" onSubmit={submit}>
            <h2>{pending ? 'Comprobar solicitud pendiente' : '¿Cómo recibirás tus productos?'}</h2>
            {pending && <div className="reservation-notice" role="status"><strong>Tu solicitud está guardada.</strong><p>Comprueba su resultado con el mismo botón. Si ya se registró, recuperarás la misma reserva y el plazo original.</p></div>}
            <fieldset disabled={busy || Boolean(pending) || Boolean(storageError)}><legend className="sr-only">Datos de la reserva</legend><label>Modalidad<select value={pending?.request.modalidad || mode} onChange={e => setMode(e.target.value as DeliveryMode)}><option value="RECOJO">Recojo en tienda</option><option value="DELIVERY">Delivery coordinado</option></select></label><label>Teléfono de contacto<input type="tel" autoComplete="tel" required minLength={7} maxLength={30} value={pending?.request.telefono ?? phone} onChange={e => setPhone(e.target.value)} placeholder="Ej. +591 70000000"/></label>{(pending?.request.modalidad || mode) === 'DELIVERY' && <label>Dirección de entrega<textarea autoComplete="street-address" required minLength={5} maxLength={500} value={pending?.request.direccion ?? address} onChange={e => setAddress(e.target.value)} placeholder="Zona, calle, número y referencia"/></label>}<label>Indicaciones (opcional)<textarea maxLength={500} value={pending?.request.notas ?? notes} onChange={e => setNotes(e.target.value)} placeholder="Cuéntanos si necesitas alguna indicación adicional"/></label></fieldset>
            <p>Si no recoges ni coordinas dentro de 24 horas, la reserva vence y los productos vuelven a estar disponibles. Si el personal confirma el acuerdo, se conserva hasta su entrega o cancelación.</p><p>El pago se acuerda con el personal. El delivery se cotiza por separado.</p>
            <button className="button" disabled={busy || !loaded || Boolean(storageError) || !summary.length}>{busy ? 'Comprobando reserva…' : pending ? 'Comprobar / reintentar solicitud' : 'Confirmar reserva por 24 horas'}</button>
          </form>
          <aside className="reservation-card reservation-summary"><span className="eyebrow">TU SELECCIÓN</span><h2>{summary.reduce((sum, i) => sum + i.cantidad, 0)} unidades</h2><ul className="reservation-products">{summary.map(p => <li key={p.productoId}><div><strong>{p.nombre}</strong><span>{p.cantidad} × {money(p.precio)}</span></div><b>{money(Math.round(p.precio * 100) * p.cantidad / 100)}</b></li>)}</ul><div className="reservation-total"><span>Total estimado</span><strong>{money(estimate)}</strong></div><p className="reservation-footnote">Al confirmar se verifican las existencias y los descuentos de cada lote. El total definitivo aparecerá en tu reserva.</p>{!pending && <Link className="text-link" href="/productos">Volver al catálogo para cambiar la selección →</Link>}</aside>
        </div>}
      </>}
    </section>
  </>;
}
