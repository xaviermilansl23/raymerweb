'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from './store';
import { errorMessage } from '@/lib/api';
import type { AuthResponse } from '@/lib/models';
import { safeReturnPath } from '@/lib/customer-state';
export function AuthForm({ register = false }: { register?: boolean }) {
  const s = useStore(); const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const completing = useRef(false);
  const returnPath = () => safeReturnPath(new URLSearchParams(window.location.search).get('returnUrl'));
  useEffect(() => { if (s.ready && s.authenticated && !completing.current) router.replace(returnPath()); }, [s.ready, s.authenticated, router]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const data = new FormData(e.currentTarget); const value = (key: string) => String(data.get(key) || '');
    if (register && value('password') !== value('confirmar')) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true); setError('');
    try {
      const payload = register ? { nombre: value('nombre').trim(), correo: value('correo').trim(), usuario: value('usuario').trim(), telefono: value('telefono').trim() || undefined, password: value('password') } : { login: value('login').trim(), password: value('password') };
      const response = await s.api<AuthResponse>(register ? '/auth-cliente/registrar' : '/auth-cliente/login', { method: 'POST', body: JSON.stringify(payload) });
      completing.current = true;
      s.save(response);
      router.replace(returnPath());
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <section className="auth-layout"><div className="auth-intro"><span className="eyebrow">BIENVENIDO A RAYMER</span><h1>Tu próximo equipo<br/>empieza aquí.</h1><p>Cotiza libremente. Con tu cuenta puedes guardar favoritos y reservar productos para recojo o delivery.</p><img src="/favicon.png" width="160" height="160" alt="Raymer"/></div><form className="form-card" onSubmit={submit}><span className="eyebrow">MI CUENTA</span><h2>{register ? 'Crea tu cuenta' : 'Qué gusto verte de nuevo'}</h2><p className="muted">{register ? 'Completa tus datos para comenzar.' : 'Ingresa con tu usuario o correo electrónico.'}</p>
    {register ? <><label>Nombre completo<input name="nombre" required minLength={2} autoComplete="name"/></label><label>Correo electrónico<input name="correo" type="email" required autoComplete="email"/></label><label>Usuario<input name="usuario" required minLength={3} pattern="[a-zA-Z0-9._\-]+" title="Letras, números, puntos, guiones y guion bajo" autoComplete="username"/></label><label>Teléfono (opcional)<input name="telefono" type="tel" autoComplete="tel"/></label></> : <label>Usuario o correo<input name="login" required autoComplete="username"/></label>}
    <label>Contraseña<input type="password" name="password" required minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'}/></label>{register && <label>Confirmar contraseña<input type="password" name="confirmar" required minLength={8} autoComplete="new-password"/></label>}
    {error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Procesando…' : register ? 'Crear cuenta →' : 'Ingresar →'}</button><p className="muted">{register ? '¿Ya tienes cuenta?' : '¿Primera vez en Raymer?'} <Link href={register ? '/login' : '/registro'} onClick={e => { e.preventDefault(); router.push(`${register ? '/login' : '/registro'}?returnUrl=${encodeURIComponent(returnPath())}`); }}>{register ? 'Inicia sesión' : 'Regístrate'}</Link></p></form></section>;
}
