'use client';
import { useEffect, useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, PageHead } from './ui';
import { Checkbox } from '@/components/ui/checkbox';
async function authApi(action: string, body?: unknown) { const r = await fetch('/api/auth/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); const d = await r.json(); if (!r.ok)
    throw new Error(d.error || 'No se pudo completar la solicitud.'); return d; }
export function PasswordField({ label = 'Contraseña', name = 'password', newPassword = false }: {
    label?: string;
    name?: string;
    newPassword?: boolean;
}) { const id = useId(); const [visible, setVisible] = useState(false); return <label htmlFor={id} className="auth-label">{label}<span className="auth-input"><LockKeyhole size={18}/><input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} minLength={newPassword ? 12 : 1} maxLength={128} required placeholder={newPassword ? 'Al menos 12 caracteres' : 'Tu contraseña'}/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></span></label>; }
export function ChatGPTButton() { const [busy, setBusy] = useState(false); return <button className="auth-provider" disabled={busy} onClick={async () => { setBusy(true); try {
    const d = await authApi('start-chatgpt');
    window.location.assign(d.url);
}
catch (e) {
    toast.error((e as Error).message);
    setBusy(false);
} }}>{busy ? <LoaderCircle className="animate-spin" size={18}/> : <KeyRound size={18}/>}Continuar con ChatGPT</button>; }
export function LogoutButton({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { const [busy, setBusy] = useState(false); return <button {...props} type="button" className={className} disabled={busy} onClick={async (e) => { props.onClick?.(e); setBusy(true); try {
    await authApi('logout');
    window.location.assign('/login');
}
catch (e) {
    toast.error((e as Error).message);
    setBusy(false);
} }}><LogOut size={16}/>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>; }
function RecoveryCode({ code, onContinue }: {
    code: string;
    onContinue: () => void;
}) { const [ack, setAck] = useState(false); return <Modal open={!!code} onOpenChange={() => { }} title="Guarda tu código de recuperación" description="Este código permite recuperar tu cuenta si olvidas la contraseña. Solo se muestra ahora; guárdalo en un lugar privado."><div className="recovery-code"><ShieldCheck size={28}/><code>{code}</code><div className="pilot-actions"><button className="btn secondary" onClick={async () => { try {
    await navigator.clipboard.writeText(code);
    toast.success('Código copiado. Guárdalo en un lugar seguro.');
}
catch {
    toast.error('No pudimos copiar. Selecciona el código o descárgalo.');
} }}><Copy size={16}/>Copiar</button><button className="btn secondary" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['NOVA — Código de recuperación\n\n' + code + '\n\nMantén este archivo privado. El código reemplaza tu contraseña y se renueva después de utilizarlo.'], { type: 'text/plain;charset=utf-8' })); a.download = 'nova-recuperacion.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }}><Download size={16}/>Descargar</button></div><label className="recovery-ack"><Checkbox checked={ack} onCheckedChange={v => setAck(v === true)}/>He guardado el código en un lugar seguro.</label><button className="btn" disabled={!ack} onClick={onContinue}>Continuar <ArrowRight size={16}/></button></div></Modal>; }
export function AuthPage({ mode }: {
    mode: 'login' | 'signup' | 'recover';
}) {
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [code, setCode] = useState('');
    const signup = mode === 'signup', recover = mode === 'recover';
    useEffect(() => { if (new URLSearchParams(window.location.search).get('error') === 'chatgpt') setError('No se pudo completar el acceso con ChatGPT. Vuelve a intentarlo desde este botón.'); }, []);
    return <main className="auth-layout"><aside className="auth-story"><a href="/" className="auth-wordmark">NOVA</a><div className="auth-orbits" aria-hidden="true"><i /><i /><i /></div><div className="auth-story-copy"><h1>Tu voz merece<br />su propio espacio.</h1><p>Escribe, organiza y vuelve a tus ideas.</p></div><p className="auth-story-footer">Manuscritos <span>·</span> Fuentes <span>·</span> Tu voz</p></aside><section className="auth-main"><a href="/" className="auth-back"><ArrowLeft size={17}/>Volver al inicio</a><div className="auth-form-wrap"><h2>{signup ? 'Empieza tu próxima página.' : recover ? 'Vuelve a tu espacio.' : 'Qué bueno verte.'}</h2><p className="auth-intro">{signup ? 'Crea tu cuenta personal de NOVA.' : recover ? 'Usa tu código de respaldo para crear una nueva contraseña.' : 'Entra a tu espacio de escritura.'}</p><form className="auth-form" onSubmit={async (e) => { e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); if (mode !== 'login' && f.get('password') !== f.get('confirm')) {
        setError('Las contraseñas no coinciden.');
        return;
    } setBusy(true); try {
        const result = await authApi(mode, { username: f.get('username'), password: f.get('password'), ...(signup ? { name: f.get('name') } : {}), ...(recover ? { recoveryCode: String(f.get('recoveryCode')).trim() } : {}) });
        if (result.recoveryCode) {
            setCode(result.recoveryCode);
            toast.success(signup ? 'Tu cuenta está lista.' : 'Contraseña actualizada.');
        }
        else
            window.location.assign('/inicio');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><fieldset disabled={busy || !!code}>
 {signup && <label className="auth-label">Tu nombre<span className="auth-input"><UserRound size={18}/><input name="name" autoComplete="name" required maxLength={100} placeholder="Cómo quieres que te llamemos"/></span></label>}
 <label className="auth-label">Usuario<span className="auth-input"><UserRound size={18}/><input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]+" required placeholder="Tu usuario de NOVA"/></span>{signup && <small>3–32 letras, números, puntos o guiones. Sin espacios.</small>}</label>
 {recover && <label className="auth-label">Código de recuperación<textarea name="recoveryCode" autoComplete="off" required minLength={64} maxLength={64} rows={3} placeholder="El código que guardaste al crear tu cuenta"/></label>}
 <PasswordField newPassword={mode !== 'login'} label={recover ? 'Nueva contraseña' : 'Contraseña'}/>{mode !== 'login' && <PasswordField name="confirm" label="Confirmar contraseña" newPassword/>}
 {mode === 'login' && <a href="/recuperar" className="auth-forgot">¿Olvidaste tu contraseña?</a>}{error && <p className="auth-error" role="alert">{error}</p>}
 <button className="auth-submit" disabled={busy || !!code}>{busy ? <><LoaderCircle size={18} className="animate-spin"/>Un momento…</> : <>{signup ? 'Crear mi cuenta' : recover ? 'Restablecer contraseña' : 'Entrar a NOVA'}<ArrowRight size={19}/></>}</button></fieldset></form>
 {!recover && <><div className="auth-divider"><span>o continúa con</span></div><ChatGPTButton /></>}
 <p className="auth-switch">{signup ? '¿Ya tienes cuenta? ' : recover ? '¿Recuerdas tu contraseña? ' : '¿Primera vez aquí? '}<a href={mode === 'login' ? '/registro' : '/login'}>{mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}</a></p>
 {signup && <p className="auth-footnote">Al crear tu cuenta recibirás un código de recuperación. No necesitamos tu correo para registrarte.</p>}{recover && <p className="auth-footnote">Si tu cuenta tiene ChatGPT, también puedes entrar con él. Sin contraseña, código o acceso vinculado no es posible recuperar la cuenta automáticamente.</p>}
 </div><p className="auth-bottom">Tu escritura sigue siendo tuya.</p></section>{code && <RecoveryCode code={code} onContinue={() => window.location.assign('/inicio')}/>}</main>;
}
export function Security() {
    const [user, setUser] = useState<any>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [code, setCode] = useState(''), [confirm, setConfirm] = useState(false);
    async function load() { setLoading(true); try {
        const r = await fetch('/api/auth/me');
        if (!r.ok)
            throw new Error('No se pudo cargar la seguridad de tu cuenta.');
        const d = await r.json();
        if (!d.user) {
            window.location.assign('/login');
            return;
        }
        setUser(d.user);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setLoading(false);
    } }
    useEffect(() => { void load(); }, []);
    return <><PageHead eyebrow="CUENTA" title="Tu cuenta, bajo tu control." description="Configura tu acceso independiente a NOVA y protege tu escritura."/>{loading ? <p role="status">Cargando tu cuenta…</p> : user ? <div className="pilot-form-grid"><form className="setup-card auth-form" onSubmit={async (e) => { e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); if (f.get('password') !== f.get('confirm')) {
        setError('Las contraseñas no coinciden.');
        return;
    } setBusy(true); try {
        const d = await authApi('credentials', { username: f.get('username'), password: f.get('password'), currentPassword: f.get('currentPassword') || '' });
        setCode(d.recoveryCode);
        toast.success('Acceso actualizado. Las otras sesiones se cerraron.');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><fieldset disabled={busy || !!code}><h2>{user.hasPassword ? 'Actualizar mi acceso' : 'Crear mi acceso con contraseña'}</h2><p>Al guardar se renueva el código de recuperación y se cierran las otras sesiones.</p><label className="auth-label">Usuario<span className="auth-input"><UserRound size={18}/><input name="username" defaultValue={user.username || ''} autoComplete="username" required minLength={3} maxLength={32} placeholder="Elige tu usuario"/></span></label>{user.hasPassword && <PasswordField name="currentPassword" label="Contraseña actual"/>}<PasswordField label="Nueva contraseña" newPassword/><PasswordField name="confirm" label="Confirmar contraseña" newPassword/>{error && <p role="alert" className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar acceso'}<ArrowRight size={18}/></button></fieldset></form><aside className="setup-card security-summary"><ShieldCheck size={28}/><h2>Acceso y recuperación</h2><dl><div><dt>Usuario</dt><dd>{user.username || 'Aún sin configurar'}</dd></div><div><dt>Contraseña</dt><dd>{user.hasPassword ? 'Configurada' : 'Pendiente'}</dd></div><div><dt>ChatGPT</dt><dd>{user.chatgpt ? 'Vinculado' : 'No vinculado'}</dd></div><div><dt>Sesión</dt><dd>Hasta 30 días</dd></div></dl><p>Tu código de recuperación es personal. El código anterior deja de funcionar después de usarlo o cambiar la contraseña.</p>{user.chatgpt && <><p>Tu acceso con ChatGPT conserva los proyectos de tu cuenta original.</p><ChatGPTButton /></>}<button className="btn secondary" onClick={() => setConfirm(true)}><LogOut size={17}/>Cerrar todas las sesiones</button></aside></div> : <div role="alert"><p>{error}</p><button className="btn" onClick={() => void load()}>Reintentar</button></div>}
 {code && <RecoveryCode code={code} onContinue={() => window.location.assign('/seguridad')}/>}
 <Modal open={confirm} onOpenChange={setConfirm} title="¿Cerrar todas tus sesiones?" description="También saldrás de este dispositivo. Tu trabajo guardado permanecerá en tu cuenta."><button disabled={busy} className="btn" onClick={async () => { setBusy(true); try {
        await authApi('logout-all');
        window.location.assign('/login');
    }
    catch (e) {
        toast.error((e as Error).message);
        setBusy(false);
    } }}>{busy ? 'Cerrando…' : 'Cerrar todas las sesiones'}</button></Modal></>;
}
export function SessionGuard() { const [expired, setExpired] = useState(false); useEffect(() => { async function check() { if (document.visibilityState !== 'visible')
    return; try {
    const r = await fetch('/api/auth/me');
    if (r.ok && !(await r.json()).user)
        setExpired(true);
}
catch { /* Offline state is handled by the workspace. */ } } window.addEventListener('focus', check); return () => window.removeEventListener('focus', check); }, []); return <Modal open={expired} onOpenChange={() => { }} title="Tu sesión terminó" description="Vuelve a entrar para guardar en tu cuenta. El editor conserva su recuperación local cuando está disponible."><a className="btn" href="/login">Volver a iniciar sesión <ArrowRight size={16}/></a></Modal>; }
