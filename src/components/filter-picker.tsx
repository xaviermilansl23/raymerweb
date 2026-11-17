'use client';

import { useId, useRef, useState } from 'react';
import { textKey } from '@/lib/catalog-filters.mjs';
import { Icon } from './icons';

type Option = { value: string; label: string };

export function FilterPicker({ label, options, selected, onToggle, onClear, unavailable = false }: {
  label: string; options: Option[]; selected: string[]; onToggle: (value: string) => void;
  onClear: () => void; unavailable?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const visible = options.filter(option => textKey(option.label).includes(textKey(search)));
  const close = () => dialog.current?.close();
  const show = () => { setSearch(''); dialog.current?.showModal(); setOpen(true); };
  return <>
    <button className={`filter-picker-trigger ${selected.length ? 'has-selection' : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={show}>
      <span>{label}<small>{selected.length ? `${selected.length} seleccionadas` : 'Todas'}</small></span>
      {selected.length > 0 && <b>{selected.length}</b>}<Icon name="arrow"/>
    </button>
    <dialog ref={dialog} id={id} className="filter-picker-dialog" aria-labelledby={`${id}-title`} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="filter-picker-content">
        <div className="filter-picker-heading"><div><span className="eyebrow">FILTRA TU CATÁLOGO</span><h2 id={`${id}-title`}>{label}</h2></div><button aria-label={`Cerrar ${label.toLowerCase()}`} onClick={close}><Icon name="close"/></button></div>
        <p className="filter-picker-hint">Selecciona todas las que quieras. Puedes combinarlas.</p>
        <label className="filter-picker-search"><span className="sr-only">Buscar {label.toLowerCase()}</span><Icon name="search"/><input autoFocus type="search" value={search} placeholder={`Buscar ${label.toLowerCase()}…`} onChange={event => setSearch(event.target.value)}/></label>
        <fieldset className="filter-picker-options"><legend className="sr-only">{label}</legend><div className={`filter-tags ${label === 'Marcas' ? 'brand-tags' : ''}`}>
          {visible.map(option => <label className="filter-tag" key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(option.value)}/><span>{selected.includes(option.value) && <Icon name="check"/>}{option.label}</span></label>)}
        </div>{!visible.length && <p className="filter-picker-empty">{unavailable ? 'No se pudieron cargar las opciones. Puedes buscar el producto por su nombre.' : search ? 'No encontramos opciones con ese nombre.' : 'Las opciones aparecerán al cargar los productos.'}</p>}</fieldset>
        <div className="filter-picker-footer"><button className="text-link" onClick={onClear} disabled={!selected.length}>Limpiar selección</button><span role="status">{selected.length} seleccionadas</span><button className="button" onClick={close}>Listo<Icon name="check"/></button></div>
      </div>
    </dialog>
  </>;
}
