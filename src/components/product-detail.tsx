'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from './store';
import { ProductImage } from './catalog';
import { errorMessage, money, normalize } from '@/lib/api';
import type { Producto } from '@/lib/models';
export function ProductDetail({ id }: { id: string }) {
  const s = useStore(); const [p, setProduct] = useState<Producto | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [image, setImage] = useState<string | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    s.api<Producto | null>(`/mobile/productos/${encodeURIComponent(id)}`).then(data => { if (active) { const item = data ? normalize(data) : null; setProduct(item); setImage(item?.imagen_url || null); } }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, s.api, attempt]);
  if (loading) return <div className="empty" role="status">Cargando producto…</div>;
  if (error) return <div className="empty error" role="alert"><p>{error}</p><button onClick={() => setAttempt(v => v + 1)}>Reintentar</button></div>;
  if (!p) return <div className="empty"><h1>Producto no encontrado</h1><Link href="/productos">Volver al catálogo</Link></div>;
  const quantity = s.items.find(i => i.producto.producto_id === p.producto_id)?.cantidad || 0;
  const images = Array.from(new Set([p.imagen_url, ...(p.imagenes || [])].filter((v): v is string => !!v)));
  return <section className="detail"><Link href="/productos" className="muted">← Volver al catálogo</Link><div className="detail-grid"><div><div className="detail-image"><ProductImage src={image} name={p.nombre}/></div><div className="thumbnails">{images.map((src, i) => <button key={src} aria-label={`Ver imagen ${i + 1}`} aria-pressed={src === image} onClick={() => setImage(src)}><ProductImage src={src} name=""/></button>)}</div></div><div className="detail-info"><span className="eyebrow">{p.tipo_producto_nombre || 'CATÁLOGO RAYMER'}</span><h1>{p.nombre}</h1><p>{[p.marca, p.modelo].filter(Boolean).join(' · ')}</p><p className="detail-price">{money(p.precio_venta)}</p><p className="stock">{p.stock_disponible > 0 ? `● Disponible · ${p.stock_disponible} unidades` : 'Sin stock'}</p><p className="description">{p.descripcion || 'Consulta con nuestro equipo para conocer las especificaciones de este producto.'}</p><div className="detail-actions"><button className="button" disabled={quantity >= p.stock_disponible} onClick={() => s.add(p)}>+ Agregar a cotización</button><button onClick={() => s.toggleFavorite(p.producto_id)} aria-pressed={s.favorites.includes(p.producto_id)}>{s.favorites.includes(p.producto_id) ? '♥ Guardado' : '♡ Guardar favorito'}</button></div><p className="muted">Asesoramiento personalizado y respaldo de Corpraymer S.R.L.</p><a href={`https://wa.me/59172768877?text=${encodeURIComponent(`Hola, quisiera información sobre ${p.nombre}`)}`} target="_blank" rel="noreferrer" className="text-link">Consultar este producto por WhatsApp ↗</a></div></div></section>;
}
