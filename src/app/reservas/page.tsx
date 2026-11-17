import type { Metadata } from 'next';
import { Reservations } from '@/components/reservations';

export const metadata: Metadata = { title: 'Mis reservas | Raymer', robots: { index: false, follow: false } };
export default function Page() { return <Reservations/>; }
