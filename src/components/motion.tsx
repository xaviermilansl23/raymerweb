'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Cada bloque observa su propia raíz después de hidratarse.
export function Reveal({ children, className = '', as: Tag = 'div' }: {
  children: ReactNode; className?: string; as?: 'div' | 'section' | 'article';
}) {
  const root = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState('idle');
  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPhase('ready');
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setPhase('visible'); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={node => { root.current = node; }} data-reveal className={`${className} ${phase === 'ready' ? 'reveal-ready' : phase === 'visible' ? 'reveal-ready is-visible' : ''}`.trim()}>{children}</Tag>;
}
