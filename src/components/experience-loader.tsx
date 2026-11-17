'use client';

import { useEffect, useState } from 'react';

export function ExperienceLoader() {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'done'>('loading');
  useEffect(() => {
    let active = true;
    let finished = false;
    let exitTimer: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (!active || finished) return;
      finished = true;
      setPhase('leaving');
      exitTimer = setTimeout(() => { if (active) setPhase('done'); }, 600);
    };
    try {
      if (sessionStorage.getItem('raymer-visited-v2')) { setPhase('done'); return; }
      sessionStorage.setItem('raymer-visited-v2', '1');
    } catch { /* La experiencia también funciona sin almacenamiento. */ }
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { once: true }));
    Promise.all([loaded, document.fonts.ready]).then(finish);
    // Una imagen externa lenta nunca debe impedir entrar al catálogo.
    const safety = setTimeout(finish, 2200);
    return () => { active = false; clearTimeout(safety); clearTimeout(exitTimer); };
  }, []);
  if (phase === 'done') return null;
  return <div className={`experience-loader ${phase}`} role="status" aria-live="polite">
    <div className="loader-logo"><img src="/favicon.png" alt="Logo de Raymer" width="128" height="128"/></div>
    <span className="loader-wordmark">RAYMER<span>®</span></span>
    <p>Tecnología en tus manos.</p>
    <div className="loader-track" aria-hidden="true"><span/></div>
    <span className="loader-caption">PREPARANDO TU EXPERIENCIA</span>
    <button onClick={() => setPhase('done')} className="loader-skip">Entrar al sitio ↗</button>
  </div>;
}

export function CatalogLoading() {
  return <div className="catalog-loading" role="status" aria-live="polite"><div className="loading-label"><span className="mini-orbit"/>Cargando equipos y componentes…</div><div className="product-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="product-skeleton"><div className="skeleton-image"/><div className="skeleton-copy"><i/><i/><i/></div></div>)}</div></div>;
}
