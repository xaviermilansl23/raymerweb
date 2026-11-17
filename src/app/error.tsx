'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="empty"><h1>No pudimos cargar esta página</h1><button onClick={reset}>Reintentar</button></section>; }
