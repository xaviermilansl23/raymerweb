'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { money } from '@/lib/api';
import { ExperienceLoader } from './experience-loader';
import { Reveal } from './motion';
import { Icon } from './icons';
import { BrandMark, SocialLinks } from './brand';

export function Shell({ children }: { children: React.ReactNode }) {
  const s = useStore(); const pathname = usePathname(); const dialog = useRef<HTMLDialogElement>(null);
  const [dark, setDark] = useState(false); const [menu, setMenu] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [serviceNotice,setServiceNotice]=useState(false);
  useEffect(() => {
    setServiceNotice(false);
    if (!s.authenticated || !s.clienteId) return;
    let active = true; let running = false;
    let rows: { actualizado_en: string }[] = [];
    const key = `raymer_servicio_visto_${s.clienteId}`;
    const updateNotice = () => {
      let seen = 0;
      try { seen = Date.parse(localStorage.getItem(key) || '') || 0; } catch {}
      if (active) setServiceNotice(rows.some(r => Date.parse(r.actualizado_en) > seen));
    };
    const check = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const result = await s.api<{ actualizado_en: string }[]>('/mobile/servicio-tecnico');
        if (active) { rows = result; updateNotice(); }
      } catch { /* Conservar el aviso si una actualización falla temporalmente. */ }
      finally { running = false; }
    };
    const storage = (event: StorageEvent) => { if (event.key === key) updateNotice(); };
    void check(); const timer = window.setInterval(check, 30_000);
    window.addEventListener('servicio-visto', updateNotice); window.addEventListener('storage', storage);
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
    return () => {
      active = false; clearInterval(timer);
      window.removeEventListener('servicio-visto', updateNotice); window.removeEventListener('storage', storage);
      window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check);
    };
  }, [s.api, s.authenticated, s.clienteId, s.session]);
  useEffect(() => {
    let value=false;
    try { const saved=localStorage.getItem('raymer-theme'); value=saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { /* Mantener el modo claro si el almacenamiento está bloqueado. */ }
    setDark(value); document.documentElement.dataset.theme=value?'dark':'light';
  }, []);
  const toggleTheme=()=>{
    const next=!dark; setDark(next); document.documentElement.dataset.theme=next?'dark':'light';
    try { localStorage.setItem('raymer-theme',next?'dark':'light'); } catch { /* El cambio funciona también sin guardar la preferencia. */ }
  };
  useEffect(() => { if (s.cartOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [s.cartOpen]);
  useEffect(() => { setMenu(false); s.setCartOpen(false); }, [pathname]); // Close navigation surfaces when changing pages.
  const total = s.items.reduce((n, i) => n + Math.round(i.producto.precio_venta * 100) * i.cantidad, 0) / 100;
  const count = s.items.reduce((n, i) => n + i.cantidad, 0);
  async function download() {
    if (!s.items.length || pdfBusy) return;
    setPdfBusy(true);
    try { const { createQuotationPdf, quotationFilename } = await import('@/lib/quotation-pdf'); const date = new Date(); const pdf = await createQuotationPdf(s.items, date); await pdf.save(quotationFilename(date), { returnPromise: true }); }
    catch { s.setNotice('No se pudo generar el PDF. Intenta nuevamente.'); } finally { setPdfBusy(false); }
  }
  const text = `Hola, quiero una cotización de:\n${s.items.map(i => `• ${i.producto.nombre} x${i.cantidad} — ${money(Math.round(i.producto.precio_venta * 100) * i.cantidad / 100)}`).join('\n')}\nTotal: ${money(total)}`;
  return <>
    <ExperienceLoader/>
    <a className="skip" href="#contenido">Saltar al contenido</a>
    <div className="topbar"><span><span className="status-dot"/> COMPUTACIÓN, GAMING Y SERVICIO TÉCNICO</span><a href="https://wa.me/59172768877" target="_blank" rel="noreferrer">Cochabamba, Bolivia <span>·</span> WhatsApp ↗</a></div>
    <header><div className="nav-wrap"><Link href="/productos" className="brand" aria-label="Raymer · Inicio"><BrandMark/></Link>
      <button className="mobile-menu" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'}/></button>
      <nav aria-label="Principal" className={menu ? 'expanded' : ''}>{[['/arma-tu-pc', 'Arma tu PC'], ['/productos', 'Productos'], ['/servicio-tecnico', serviceNotice ? 'Servicio técnico •' : 'Servicio técnico'], ['/combos', 'Combos'], ['/nosotros', 'Nosotros'], ['/favoritos', 'Favoritos'], ['/reservas', 'Mis reservas']].map(([href, label]) => <Link key={href} href={href} onClick={()=>setMenu(false)} className={`${pathname.startsWith(href) ? 'active' : ''} ${href==='/arma-tu-pc'?'nav-builder':''}`}>{label}</Link>)}</nav>
      <div className="nav-actions"><button className="theme-toggle" aria-label={dark?'Activar modo claro':'Activar modo oscuro'} title={dark?'Activar modo claro':'Activar modo oscuro'} onClick={toggleTheme}><Icon name={dark?'sun':'moon'}/><span>{dark?'Claro':'Oscuro'}</span></button>
      {s.authenticated ? <><Link href="/perfil">Mi cuenta</Link><button className="icon-button" onClick={s.logout}>Salir</button></> : <Link href="/login">Ingresar</Link>}
      <button className="button quote-button" aria-label={`Mi cotización, ${count} productos`} onClick={() => s.setCartOpen(true)}><Icon name="bag"/><span>Cotización</span> <span className="count">{count}</span></button></div>
    </div></header>
    <main id="contenido"><div className="page-transition" key={pathname}>{children}</div></main>
    <Reveal as="section" className="contact-band"><div><small>DESARROLLO WEB Y SOFTWARE</small><h2>Páginas web y software,<br/><em>a la medida de tus ideas.</em></h2><p>Desarrollamos páginas web, aplicaciones y sistemas personalizados para tu empresa o emprendimiento. Cuéntanos tu idea y escríbenos para más información.</p></div><div className="contact-web-action"><a className="button button-primary" href={`https://wa.me/59171522250?text=${encodeURIComponent('Hola, quisiera más información sobre el desarrollo de páginas web y software a medida.')}`} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <Icon name="arrow"/></a><span>+591 71522250</span></div><Icon name="web" className="contact-chip"/></Reveal>
    <footer className="site-footer">
      <div className="footer-brand"><Link href="/productos" aria-label="Raymer · Inicio"><BrandMark/></Link><p>Equipos, componentes y periféricos para trabajar, estudiar y jugar. Armado de PCs y servicio técnico en Cochabamba.</p><SocialLinks/></div>
      <div><b>También te ayudamos con</b><a href="https://wa.me/59172768877?text=Hola%20Raymer%2C%20quiero%20armar%20una%20PC." target="_blank" rel="noreferrer">Armado de PCs</a><a href="https://wa.me/59172768877?text=Hola%20Raymer%2C%20necesito%20servicio%20t%C3%A9cnico." target="_blank" rel="noreferrer">Reparaciones informáticas</a><Link href="/nosotros#servicios">Repuestos y actualizaciones</Link><button className="footer-quote" onClick={()=>s.setCartOpen(true)}>Preparar una cotización ↗</button></div>
      <div><b>Visítanos o escríbenos</b><a href="tel:+59172768877">+591 72768877</a><a href="mailto:corpraymer991@gmail.com">corpraymer991@gmail.com</a><a href="https://maps.app.goo.gl/jcVJNeUoKU4yUeJv7" target="_blank" rel="noreferrer">Av. Ayacucho, Calle Ecuador<br/>Edif. Lumina Center · Cochabamba ↗</a></div>
      <div className="footer-bottom"><small>© {new Date().getFullYear()} Corpraymer S.R.L.</small><span>Tecnología en tus manos.</span><span className="brand-spectrum" aria-hidden="true"/></div>
    </footer>
    {s.notice && <div className="toast" role="status">{s.notice}<button aria-label="Cerrar aviso" onClick={() => s.setNotice('')}>×</button></div>}
    <dialog ref={dialog} className="cart" onCancel={() => s.setCartOpen(false)} onClose={() => s.setCartOpen(false)}><div className="row"><h2>Mi cotización</h2><button aria-label="Cerrar cotización" onClick={() => s.setCartOpen(false)}>×</button></div><p className="muted">Cotiza sin iniciar sesión. Tu selección se conserva en esta pestaña; descarga el PDF para guardarla.</p>
      {!s.items.length ? <div className="empty"><h3>Tu cotización está vacía</h3><p>Agrega productos desde el catálogo.</p><button onClick={() => s.setCartOpen(false)}>Explorar productos</button></div> : <>
      <div className="cart-list">{s.items.map(i => <div className="cart-item" key={i.producto.producto_id}><div><strong>{i.producto.nombre}</strong><p>{money(i.producto.precio_venta)}</p><small>Stock: {i.producto.stock_disponible}</small></div><div className="quantity"><button aria-label={`Restar ${i.producto.nombre}`} onClick={() => s.quantity(i.producto.producto_id, i.cantidad - 1)}>−</button><span>{i.cantidad}</span><button aria-label={`Sumar ${i.producto.nombre}`} disabled={i.cantidad >= i.producto.stock_disponible} onClick={() => s.quantity(i.producto.producto_id, i.cantidad + 1)}>+</button></div><button aria-label={`Eliminar ${i.producto.nombre}`} onClick={() => s.quantity(i.producto.producto_id, 0)}>×</button></div>)}</div>
      <div className="row total"><span>Total estimado</span><strong>{money(total)}</strong></div><p className="muted">Precios sujetos a confirmación. La cotización no reserva productos.</p><a className="button whatsapp" href={`https://wa.me/59172768877?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Enviar por WhatsApp ↗</a><button className="button secondary" disabled={pdfBusy} onClick={download}>{pdfBusy ? 'Generando…' : 'Descargar PDF'}</button><Link className="button secondary" href="/reservas/nueva" onClick={() => s.setCartOpen(false)}>Reservar por 24 horas <Icon name="arrow"/></Link>{!s.authenticated && <p className="muted">Para reservar necesitas iniciar sesión. Conservaremos tu selección.</p>}<button className="clear" onClick={s.clear}>Vaciar cotización</button></>}
    </dialog>
  </>;
}


