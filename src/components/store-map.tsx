'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from './icons';

export function StoreMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    let observer: IntersectionObserver | undefined;
    setStatus('loading');

    async function initialize() {
      try {
        // Se descarga el mapa al entrar en pantalla, sin cargar Leaflet en el catálogo.
        const L = await import('leaflet');
        if (cancelled || !element) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const instance = L.map(element, {
          center: [latitude, longitude], zoom: 17, scrollWheelZoom: false,
          zoomControl: false, zoomAnimation: !reduceMotion, fadeAnimation: !reduceMotion, markerZoomAnimation: !reduceMotion,
        });
        map.current = instance;
        instance.attributionControl.setPrefix(false);
        L.control.zoom({ zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(instance);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Colaboradores de OpenStreetMap</a>',
        });
        let hasTiles = false;
        tiles.on('tileload', () => { hasTiles = true; if (!cancelled) setStatus('ready'); });
        tiles.on('load', () => { if (!cancelled && !hasTiles) setStatus('error'); });
        tiles.addTo(instance);
        L.marker([latitude, longitude], {
          title: 'Raymer · Cochabamba', alt: 'Ubicación de Raymer',
          icon: L.divIcon({
            className: 'raymer-map-marker', iconSize: [50, 58], iconAnchor: [25, 58],
            html: '<span class="raymer-map-pin"><img src="/favicon.png" alt="" width="38" height="38"/></span>',
          }),
        }).addTo(instance).bindTooltip('RAYMER', {
          permanent: true, direction: 'bottom', offset: [0, 4], className: 'raymer-map-label',
        });
        // Conserva el centro incluso cuando cambia el ancho de la página.
        resize = new ResizeObserver(() => instance.invalidateSize({ animate: false }));
        resize.observe(element);
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer?.disconnect();
          void initialize();
        }
      });
      observer.observe(element);
    } else {
      void initialize();
    }
    return () => {
      cancelled = true;
      observer?.disconnect();
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude, attempt]);

  return <div className="store-map">
    <div ref={container} className="location-map" role="region" aria-label="Mapa interactivo de la ubicación de Raymer en Cochabamba"/>
    {status === 'ready' && <button className="map-recenter" onClick={() => map.current?.setView([latitude, longitude], 17, { animate: false })}><Icon name="pin"/> Centrar en Raymer</button>}
    {status !== 'ready' && <div className="map-placeholder" role="status">
      <Icon name="pin"/>
      <p>{status === 'error' ? 'El mapa no pudo cargar. Puedes abrir la ubicación con el botón Cómo llegar.' : 'Cargando la ubicación de Raymer…'}</p>
      {status === 'error' && <button className="text-link" onClick={() => setAttempt(value => value + 1)}>Volver a cargar el mapa</button>}
    </div>}
  </div>;
}
