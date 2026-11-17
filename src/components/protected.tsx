'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from './store';
export function Protected({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useStore(); const router = useRouter(); const path = usePathname();
  useEffect(() => { if (ready && !authenticated) router.replace(`/login?returnUrl=${encodeURIComponent(path)}`); }, [ready, authenticated, router, path]);
  return ready && authenticated ? children : <div className="empty" role="status">Comprobando sesión…</div>;
}
