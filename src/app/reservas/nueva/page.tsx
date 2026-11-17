import type { Metadata } from 'next';
import { ReservationCheckout } from '@/components/reservation-checkout';

export const metadata: Metadata = { title: 'Reservar productos | Raymer', robots: { index: false, follow: false } };
export default function Page() { return <ReservationCheckout/>; }
