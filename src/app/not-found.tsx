import Link from 'next/link';
export default function NotFound() { return <section className="empty"><h1>Página no encontrada</h1><Link href="/productos" className="button">Volver al catálogo</Link></section>; }
