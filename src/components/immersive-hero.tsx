'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Icon } from './icons';

function SetupFallback() {
  return <div className="setup-fallback" aria-hidden="true"><div className="fallback-monitor"><img src="/favicon.png" alt=""/><b>RAYMER</b><span>TU PRÓXIMO NIVEL</span></div><div className="fallback-stand"/><div className="fallback-tower"><i/><i/><i/></div><div className="fallback-keyboard"/></div>;
}
const GamingSetup = dynamic(() => import('./gaming-setup'), { ssr: false, loading: SetupFallback });

export function ImmersiveHero() {
  const [paused, setPaused] = useState(false);
  return <>
    <section className="immersive-hero" aria-labelledby="hero-title">
      <div className="hero-noise" aria-hidden="true"/>
      <div className="hero-copy">
        <span className="hero-kicker">COMPUTACIÓN · GAMING · SERVICIO TÉCNICO</span>
        <h1 id="hero-title">Tu equipo.<br/>Tu estilo.<br/><em>Tu próximo nivel.</em></h1>
        <p>Laptops, componentes, periféricos y repuestos. Equipa tu día a día, arma tu PC gamer o dale una nueva vida a tu computadora.</p>
        <div className="hero-buttons"><Link href="/arma-tu-pc" className="button button-primary">Arma tu PC <Icon name="arrow"/></Link><a href="#catalogo" className="hero-advisor">Explorar productos <span>↗</span></a></div>
        <div className="hero-signature"><Icon name="shield"/><span>Asesoría para elegir. Soporte para seguir.</span></div>
      </div>
      <div className="hero-stage" aria-label="Ilustración 3D de una PC gamer con monitor y periféricos">
        <div className="stage-topline"><span><Icon name="gamepad"/> EL SETUP QUE VA CONTIGO</span><span>RAYMER / GAMING</span></div>
        <div className="setup-wrap"><GamingSetup paused={paused} fallback={<SetupFallback/>}/></div>
        <div className="stage-grid" aria-hidden="true"/>
        <div className="setup-label"><span className="rgb-dot"/><div>Hecha para tu manera de jugar.<small>Componentes, periféricos y armado a medida.</small></div></div>
        <div className="stage-bottomline"><span>ILUSTRACIÓN DE SETUP · EXPLÓRALO CON EL CURSOR</span><button className="motion-toggle" aria-label={paused ? 'Activar animación del equipo' : 'Pausar animación del equipo'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▷' : 'Ⅱ'}</button></div>
      </div>
    </section>
    <section className="benefit-rail" aria-label="Productos y servicios Raymer">
      <div><Icon name="monitor"/><span>Laptops y equipos</span><small>Para estudiar, trabajar y crear.</small></div>
      <div><Icon name="chip"/><span>Componentes y periféricos</span><small>Repuestos, cables y accesorios.</small></div>
      <div><Icon name="gamepad"/><span>Armado de PCs</span><small>Un setup pensado para ti.</small></div>
      <div><Icon name="tools"/><span>Servicio técnico</span><small>Reparaciones informáticas.</small></div>
    </section>
  </>;
}

