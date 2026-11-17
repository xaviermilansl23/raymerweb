import type { Metadata } from 'next';
import { CombosGallery } from './combos-gallery';

export const metadata: Metadata = {
  title: 'Combos y PCs armadas | Raymer',
  description: 'Explora las computadoras armadas y promociones que publica Raymer.',
};

export default function Combos() {
  return <>
    <section className="page-heading">
      <span className="eyebrow">EQUIPA TU PRÓXIMO SETUP</span>
      <h1>Combos y PCs armadas</h1>
      <p>Explora los equipos y promociones que Raymer publica para trabajar, estudiar y jugar.</p>
    </section>
    <CombosGallery />
  </>;
}
