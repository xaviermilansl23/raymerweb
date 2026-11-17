import type { SVGProps } from 'react';

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: 'arrow' | 'bag' | 'heart' | 'search' | 'sun' | 'moon' | 'menu' | 'close' | 'spark' | 'shield' | 'chat' | 'cube' | 'check' | 'monitor' | 'tools' | 'chip' | 'gamepad' | 'pin' | 'web' }) {
  const paths = {
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    moon: <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    spark: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-5"/></>,
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1L3 21l1.7-5.3a8.5 8.5 0 1 1 16.3-4.2Z"/><path d="M8 11h8M8 14h5"/></>,
    cube: <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10M7.5 4.5l9 5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
    web: <><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20M5 5.5h.01M8 5.5h.01m0 6-3 3 3 3m8-6 3 3-3 3m-3-7-2 8"/></>,
    tools: <><path d="m14 6 4 4m-9 5-5 5-2-2 5-5m7-7a5 5 0 0 0-6 6l10 10 3-3-10-10a5 5 0 0 0 6-6l-3 3-3-3 3-3"/></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M9 9h6v6H9z"/></>,
    gamepad: <><path d="M7 7h10a4 4 0 0 1 4 3l1 6a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2l1-6a4 4 0 0 1 4-3Z"/><path d="M6 10v4m-2-2h4m7-1h.01m3 2h.01"/></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
