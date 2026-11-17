'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Categoria, Producto } from '@/lib/models';
import { asset, money, normalize } from '@/lib/api';
import { useStore } from './store';
import { Protected } from './protected';
import { ImmersiveHero } from './immersive-hero';
import { CatalogLoading } from './experience-loader';
import { Icon } from './icons';
import { Reveal } from './motion';
import { filterProducts, textKey, hasAvailableStock } from '@/lib/catalog-filters.mjs';
import { FilterPicker } from './filter-picker';
import { Pagination } from './pagination';

export function ProductImage({ src, name }: { src: string | null; name: string }) {
  return <img src={asset(src)} alt={name} loading="lazy" onError={e => { if (!e.currentTarget.src.endsWith('/no-product.svg')) e.currentTarget.src='/no-product.svg'; }}/>;
}

export function ProductCard({ p }: { p: Producto }) {
  const s=useStore(); const favorite=s.favorites.includes(p.producto_id);
  const quantity=s.items.find(i=>i.producto.producto_id===p.producto_id)?.cantidad||0;
  return <Reveal as="article" className="product-card">
    <div className="product-visual"><span className="product-category">{p.tipo_producto_nombre||'CATÁLOGO RAYMER'}</span><Link href={`/productos/${p.producto_id}`}><ProductImage src={p.imagen_url} name={p.nombre}/></Link><button className={`heart ${favorite?'selected':''}`} aria-label={`${favorite?'Quitar de':'Agregar a'} favoritos: ${p.nombre}`} aria-pressed={favorite} onClick={()=>s.toggleFavorite(p.producto_id)}><Icon name="heart" fill={favorite?'currentColor':'none'}/></button><Link className="product-discover" href={`/productos/${p.producto_id}`}>Ver producto <Icon name="arrow"/></Link></div>
    <div className="product-info"><small>{p.marca||'RAYMER'}</small><Link href={`/productos/${p.producto_id}`}><h3>{p.nombre}</h3></Link><p className={p.stock_disponible>0?'stock':'muted'}>{p.stock_disponible>0?`● Disponible · ${p.stock_disponible} ${p.stock_disponible===1?'unidad':'unidades'}`:'Sin stock'}</p><div className="product-bottom"><div><small>PRECIO REFERENCIAL</small><strong>{money(p.precio_venta)}</strong></div><button disabled={quantity>=p.stock_disponible} onClick={()=>s.add(p)} aria-label={`Agregar ${p.nombre} a cotización`}><span>+</span> Cotizar</button></div></div>
  </Reveal>;
}

export function Catalog({ favoritesOnly=false }: { favoritesOnly?: boolean }) {
  const s=useStore();
  const [products,setProducts]=useState<Producto[]>([]); const [categories,setCategories]=useState<Categoria[]>([]);
  const [query,setQuery]=useState(''); const [selectedCategories,setSelectedCategories]=useState<string[]>([]); const [selectedBrands,setSelectedBrands]=useState<string[]>([]);
  const [min,setMin]=useState(''); const [max,setMax]=useState(''); const [sort,setSort]=useState('name');
  const [page,setPage]=useState(1); const [loading,setLoading]=useState(true); const [error,setError]=useState(false);
  const [attempt,setAttempt]=useState(0); const [categoryError,setCategoryError]=useState(false);
  const resultsPanel=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(favoritesOnly&&(!s.ready||!s.authenticated)) return;
    let active=true; let pending=false;
    const load=async(silent=false)=>{
      if(pending)return;
      pending=true;
      if(!silent){setLoading(true);setError(false);}
      try {
        const data=await s.api<Producto[]>(favoritesOnly?'/mobile/favoritos':'/mobile/productos');
        if(active){setProducts(data.map(normalize).filter(hasAvailableStock));setError(false);if(!silent)setPage(1);}
      } catch {if(active&&!silent)setError(true);}
      finally {pending=false;if(active&&!silent)setLoading(false);}
    };
    const refresh=()=>{if(!document.hidden)void load(true);};
    void load();
    window.addEventListener('focus',refresh); document.addEventListener('visibilitychange',refresh);
    return ()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[s.api,favoritesOnly,attempt,s.ready,s.authenticated,s.session]);
  useEffect(()=>{
    let active=true; setCategoryError(false);
    s.api<Categoria[]>('/mobile/tipo-producto').then(data=>{if(active)setCategories(data.filter(c=>!c.estado||['A','ACTIVO','ACTIVE','TRUE','1'].includes(String(c.estado).toUpperCase().trim())).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')));}).catch(()=>{if(active)setCategoryError(true);});
    return ()=>{active=false;};
  },[s.api,attempt]);
  const selection=useMemo(()=>products.filter(p=>!favoritesOnly||s.favorites.includes(p.producto_id)),[products,favoritesOnly,s.favorites]);
  const brands=useMemo(()=>{
    const values=new Map<string,string>(); selection.forEach(p=>{const name=p.marca?.trim();if(name&&!values.has(textKey(name)))values.set(textKey(name),name);});
    return Array.from(values,([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
  },[selection]);
  const filtered=filterProducts(selection,{categories:selectedCategories,brands:selectedBrands,query,min,max,sort});
  const pages=Math.max(1,Math.ceil(filtered.length/12)); const current=Math.min(page,pages);
  const toggleCategory=(value:string)=>{setSelectedCategories(values=>values.includes(value)?values.filter(v=>v!==value):[...values,value]);setPage(1);};
  const toggleBrand=(value:string)=>{setSelectedBrands(values=>values.includes(value)?values.filter(v=>v!==value):[...values,value]);setPage(1);};
  const reset=()=>{setSelectedCategories([]);setSelectedBrands([]);setMin('');setMax('');setQuery('');setPage(1);};
  const goToPage=(target:number)=>{
    if(!Number.isInteger(target)||target<1||target>pages||target===current)return;
    setPage(target);
    requestAnimationFrame(()=>resultsPanel.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
  };
  const selectedCount=selectedCategories.length+selectedBrands.length+Number(min!=='')+Number(max!=='');
  const hasFilters=!!(selectedCount||query);
  const content=<>
    {favoritesOnly?<section className="page-heading favorites-heading"><span className="eyebrow">TU SELECCIÓN RAYMER</span><h1>Tu próximo equipo.<br/><em>Guardado aquí.</em></h1><p>Los productos que te interesan, listos para comparar y cotizar.</p></section>:<ImmersiveHero/>}
    <section className="store-catalog" id="catalogo" aria-labelledby="catalog-title">
      <Reveal className="catalog-intro"><div><span className="eyebrow">{favoritesOnly?'TUS FAVORITOS':'EQUIPOS · COMPONENTES · ACCESORIOS'}</span><h2 id="catalog-title">{favoritesOnly?'Tu lista de favoritos.':'Encuentra lo que tu equipo necesita.'}</h2></div><p>Laptops, repuestos y periféricos.<br/> Tecnología para trabajar, estudiar y jugar.</p></Reveal>
      <div className="catalog-layout">
        <aside id="catalog-filter-panel" className="tag-filters compact-filters" aria-label="Filtros del catálogo">
          <div className="filter-heading"><span><Icon name="chip"/>Filtros</span><button className="text-link" onClick={reset} disabled={!hasFilters}>Limpiar</button></div>
          <FilterPicker label="Categorías" options={[...categories.map(c=>({value:String(c.tipo_producto_id),label:c.nombre})),...(selection.some(p=>p.tipo_producto_id==null)?[{value:'none',label:'Sin categoría'}]:[])]} selected={selectedCategories} onToggle={toggleCategory} onClear={()=>{setSelectedCategories([]);setPage(1);}} unavailable={categoryError}/>
          <FilterPicker label="Marcas" options={[...brands,...(selection.some(p=>!p.marca?.trim())?[{value:'none',label:'Sin marca'}]:[])]} selected={selectedBrands} onToggle={toggleBrand} onClear={()=>{setSelectedBrands([]);setPage(1);}}/>
          <details className="price-disclosure"><summary>Precio en Bs{(min||max)&&<span>Activo</span>}<Icon name="arrow"/></summary><fieldset className="price-filter"><legend className="sr-only">Rango de precio</legend><label><span className="sr-only">Precio mínimo</span><input type="number" min="0" value={min} placeholder="Desde" onChange={e=>{setMin(e.target.value);setPage(1);}}/></label><span>—</span><label><span className="sr-only">Precio máximo</span><input type="number" min="0" value={max} placeholder="Hasta" onChange={e=>{setMax(e.target.value);setPage(1);}}/></label></fieldset></details>
        </aside>
        <div ref={resultsPanel} className="catalog-results" aria-busy={loading}>
          <div className="search-row"><label className="search"><span className="sr-only">Buscar productos</span><Icon name="search"/><input type="search" placeholder="Buscar por producto, marca o modelo…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><label><span className="sr-only">Ordenar productos</span><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="name">Nombre: A–Z</option><option value="price-up">Menor precio</option><option value="price-down">Mayor precio</option></select></label></div>
          <div className="results-bar"><p className="results-count" aria-live="polite">{loading?'Cargando productos…':error?'Catálogo Raymer':`${filtered.length} ${filtered.length===1?'producto encontrado':'productos encontrados'}`}</p><div className="active-filters">{selectedCategories.map(value=>{const label=categories.find(c=>String(c.tipo_producto_id)===value)?.nombre||(value==='none'?'Sin categoría':value);return <button key={`category-${value}`} aria-label={`Quitar categoría ${label}`} onClick={()=>toggleCategory(value)}>{label}<Icon name="close"/></button>;})}{selectedBrands.map(value=>{const label=brands.find(b=>b.value===value)?.label||(value==='none'?'Sin marca':value);return <button key={`brand-${value}`} aria-label={`Quitar marca ${label}`} onClick={()=>toggleBrand(value)}>{label}<Icon name="close"/></button>;})}</div></div>
          {loading?<CatalogLoading/>:error?<div className="catalog-unavailable" role="alert"><div className="unavailable-icon"><Icon name="monitor"/></div><span className="eyebrow">CATÁLOGO RAYMER</span><h3>No pudimos cargar los productos.</h3><p>Vuelve a intentarlo o consulta con nuestro equipo por el producto que necesitas.</p><div><button className="button" onClick={()=>setAttempt(v=>v+1)}>Volver a intentar<Icon name="arrow"/></button><a className="text-link" href="https://wa.me/59172768877" target="_blank" rel="noreferrer">Consultar por WhatsApp ↗</a></div></div>:filtered.length?<><div className="product-grid">{filtered.slice((current-1)*12,current*12).map(p=><ProductCard key={p.producto_id} p={p}/>)}</div><Pagination current={current} pages={pages} totalItems={filtered.length} pageSize={12} onChange={goToPage}/></>:<div className="empty"><Icon name={favoritesOnly?'heart':'search'}/><h3>{favoritesOnly&&!hasFilters?'Aún no guardaste productos.':'No encontramos productos con esos filtros.'}</h3><p>{favoritesOnly&&!hasFilters?'Guarda los productos que te interesan tocando el corazón.':'Prueba otra búsqueda o cambia las etiquetas seleccionadas.'}</p>{favoritesOnly&&!hasFilters?<Link href="/productos" className="button">Explorar catálogo</Link>:<button onClick={reset}>Limpiar filtros</button>}</div>}
        </div>
      </div>
    </section>

  </>;
  return favoritesOnly?<Protected>{content}</Protected>:content;
}
