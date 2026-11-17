'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Protected } from './protected';
import { useStore } from './store';
import { errorMessage } from '@/lib/api';
import type { Cliente } from '@/lib/models';
export function Profile() {
  const s = useStore(); const [profile, setProfile] = useState<Cliente | null>(null); const [error, setError] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(''); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!s.authenticated) return;
    let active = true; setError(''); setProfile(null);
    s.api<Cliente>('/mobile/clientes/perfil').then(p => { if (active) setProfile(p); }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [s.api, s.authenticated, s.session, attempt]);
  async function submit(e: FormEvent<HTMLFormElement>, password = false) {
    e.preventDefault(); if (busy) return;
    const form = e.currentTarget; const data = Object.fromEntries(new FormData(form));
    setError(''); setMessage('');
    if (password && data.nueva !== data.confirmar) { setError('La confirmación no coincide.'); return; }
    setBusy(password ? 'password' : 'profile');
    try {
      const response = await s.api<{ perfil: Cliente }>(`/mobile/clientes/perfil${password ? '/password' : ''}`, { method: 'PUT', body: JSON.stringify(data) });
      if (password) { form.reset(); s.logout(); s.setNotice('Contraseña actualizada. Inicia sesión nuevamente.'); }
      else setProfile(response.perfil);
      setMessage(password ? 'Contraseña actualizada correctamente.' : 'Tus datos se guardaron correctamente.');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(''); }
  }
  return <Protected><section className="page-heading"><span className="eyebrow">MI CUENTA</span><h1>Hola{profile ? `, ${profile.nombre.split(' ')[0]}` : ''}.</h1><p>Administra tus datos y la seguridad de tu cuenta.</p></section><section className="profile-content">{error && <p className="error" role="alert">{error}{!profile && <button onClick={() => setAttempt(v => v + 1)}>Reintentar</button>}</p>}{message && <p className="success" role="status">{message}</p>}{profile ? <div className="profile-grid"><form key={profile.cliente_id} className="form-card" onSubmit={e => submit(e)}><h2>Datos personales</h2><label>Nombre<input name="nombre" defaultValue={profile.nombre} required minLength={2}/></label><label>Correo<input name="correo" type="email" defaultValue={profile.correo} required/></label><label>Usuario<input name="usuario" defaultValue={profile.usuario} required minLength={3} pattern="[a-zA-Z0-9._\-]+"/></label><label>Teléfono<input name="telefono" type="tel" defaultValue={profile.telefono || ''}/></label><button className="button" disabled={!!busy}>{busy === 'profile' ? 'Guardando…' : 'Guardar cambios'}</button></form><form className="form-card" onSubmit={e => submit(e, true)}><h2>Cambiar contraseña</h2><label>Contraseña actual<input name="actual" type="password" required autoComplete="current-password"/></label><label>Nueva contraseña<input name="nueva" type="password" required minLength={8} autoComplete="new-password"/></label><label>Confirmar contraseña<input name="confirmar" type="password" required minLength={8} autoComplete="new-password"/></label><button className="button" disabled={!!busy}>{busy === 'password' ? 'Guardando…' : 'Actualizar contraseña'}</button></form></div> : !error && <p role="status">Cargando tus datos…</p>}</section></Protected>;
}
