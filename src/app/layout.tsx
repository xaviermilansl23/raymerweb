import type { Metadata } from 'next';
import { StoreProvider } from '@/components/store';
import { Shell } from '@/components/shell';
import './globals.css';
import './experience.css';
import './reservations.css';
import './pc-builder.css';
export const metadata: Metadata = { title: 'Raymer | Computación, gaming y servicio técnico', description: 'Laptops, PCs gamer, componentes, repuestos, cables y periféricos. Armado de PCs y servicio técnico de reparaciones informáticas en Cochabamba. Corpraymer S.R.L.', icons: { icon: '/favicon.png' } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="es" data-scroll-behavior="smooth"><body><noscript><style>{'.experience-loader { display: none !important; }'}</style></noscript><StoreProvider><Shell>{children}</Shell></StoreProvider></body></html>;
}
