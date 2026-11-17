'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { paginationItems } from '@/lib/pagination.mjs';

export function Pagination({ current, pages, totalItems, pageSize, onChange }: {
  current: number; pages: number; totalItems: number; pageSize: number; onChange: (page: number) => void;
}) {
  const [jump, setJump] = useState(String(current));
  useEffect(() => setJump(String(current)), [current, pages]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const target = Number(jump);
    if (Number.isInteger(target) && target >= 1 && target <= pages) onChange(target);
  };
  return <div className="advanced-pagination">
    <div className="pagination-top"><p aria-live="polite"><strong>Página {current} de {pages}</strong><span>Mostrando {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, totalItems)} de {totalItems} productos</span></p>
      <form className="page-jump" onSubmit={submit}><label>Ir a página<input type="number" min="1" max={pages} step="1" required inputMode="numeric" value={jump} onChange={event => setJump(event.target.value)}/></label><button type="submit">Ir →</button></form>
    </div>
    <nav className="pagination-nav" aria-label="Paginación del catálogo">
      <button aria-label="Primera página" title="Primera página" disabled={current <= 1} onClick={() => onChange(1)}>«</button>
      <button aria-label="Página anterior" title="Página anterior" disabled={current <= 1} onClick={() => onChange(current - 1)}>‹</button>
      {paginationItems(current, pages).map((item, index) => item === 'gap' ? <span className="page-gap" key={`gap-${index}`} aria-hidden="true">…</span> : <button key={item} aria-label={`Ir a la página ${item}`} aria-current={item === current ? 'page' : undefined} onClick={() => onChange(item)}>{item}</button>)}
      <button aria-label="Página siguiente" title="Página siguiente" disabled={current >= pages} onClick={() => onChange(current + 1)}>›</button>
      <button aria-label="Última página" title="Última página" disabled={current >= pages} onClick={() => onChange(pages)}>»</button>
    </nav>
  </div>;
}
