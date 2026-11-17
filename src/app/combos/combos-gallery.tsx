'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { requestJson } from '@/lib/api';
import styles from './combos.module.css';

interface Combo {
  id: string;
  titulo: string;
  descripcion: string;
}

export function CombosGallery() {
  const [combos, setCombos] = useState<Combo[] | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<Combo[]>('/combos/publicados', { signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setCombos(items); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [intento]);

  return <section className={styles.seccion} aria-label="Publicaciones de combos">
    {error ? <div className="empty" role="alert">
      <h2>No pudimos cargar los combos</h2>
      <button className="button" onClick={() => { setError(false); setIntento(n => n + 1); }}>Volver a intentar</button>
    </div> : combos === null ? <p role="status">Cargando combos…</p> : combos.length === 0 ? <div className="empty">
      <h2>Prepara tu combinación ideal</h2>
      <p>Consulta con un asesor los combos y promociones disponibles.</p>
      <a className="button" href="https://wa.me/59172768877" target="_blank" rel="noreferrer">Consultar combos ↗</a>
      <Link className="text-link" href="/productos">Explorar catálogo →</Link>
    </div> : <div className={styles.galeria}>
      {combos.map((combo, index) => <article className={styles.combo} key={combo.id}>
        <img
          src={`/api/combos/publicados/${encodeURIComponent(combo.id)}/imagen`}
          alt={combo.titulo}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
        <div className={styles.info}>
          <h2>{combo.titulo}</h2>
          {combo.descripcion && <p>{combo.descripcion}</p>}
        </div>
      </article>)}
    </div>}
  </section>;
}
