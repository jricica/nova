'use client';
import { useState } from 'react';
import { LogOut, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount } from './account-context';
import { api, Loading, Failure, PageHead, Choice } from './ui';
import { initials, type AccountRecord, type AccountData } from '@/lib/account';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
export default function Profile() {
    const { account, loading, error, reload } = useAccount();
    if (loading)
        return <Loading />;
    if (error || !account)
        return <Failure error={error || 'Perfil no disponible.'} retry={reload}/>;
    return <ProfileForm initial={account}/>;
}
function ProfileForm({ initial }: {
    initial: AccountRecord;
}) {
    const { setAccount, session } = useAccount();
    const [record, setRecord] = useState(initial), [draft, setDraft] = useState(initial.data), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const dirty = JSON.stringify(record.data) !== JSON.stringify(draft);
    useUnsavedChanges(dirty || busy);
    const name = draft.displayName || session.fullName || session.email.split('@')[0] || 'Autor';
    function change(p: Partial<AccountData>) { if (!busy) {
        setDraft(d => ({ ...d, ...p }));
        setError('');
    } }
    return <div className="profile-page"><PageHead eyebrow="CUENTA" title="Perfil" description="Administra tu identidad y tus preferencias de escritura."/>
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        const value = await api('account', 'PUT', { data: draft, version: record.version });
        setRecord(value);
        setDraft(value.data);
        setAccount(value);
        toast.success('Perfil actualizado.');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}>
      <div className="profile-layout"><fieldset disabled={busy} className="profile-fields">
        <div className="profile-identity"><div className="user-avatar large" aria-hidden="true">{initials(name)}</div><div><h2>{name}</h2><p>{draft.occupation || 'Tu espacio de escritura'}</p></div></div>
        <section className="profile-section form-stack"><h2>Información personal</h2><label>Nombre visible<input name="displayName" autoComplete="nickname" maxLength={100} value={draft.displayName} placeholder={session.fullName || 'Tu nombre o seudónimo'} onChange={e => change({ displayName: e.target.value })}/></label><label>Ocupación<input name="occupation" autoComplete="organization-title" maxLength={160} value={draft.occupation} placeholder="Por ejemplo, escritor o investigador" onChange={e => change({ occupation: e.target.value })}/></label><label>Biografía breve<textarea name="bio" rows={4} maxLength={2000} value={draft.bio} placeholder="Describe tu trabajo y tus intereses como autor." onChange={e => change({ bio: e.target.value })}/></label><small>Esta información pertenece a tu perfil privado de NOVA.</small></section>
        <section className="profile-section form-stack"><h2>Preferencias del editor</h2><div className="profile-preferences"><label>Tipografía<Choice label="Tipografía del manuscrito" value={draft.typography} items={{ serif: 'Clásica', sans: 'Contemporánea' }} onChange={v => change({ typography: v as AccountData['typography'] })}/></label><label>Tamaño del texto<Choice label="Tamaño del manuscrito" value={draft.textSize} items={{ standard: 'Estándar', large: 'Grande' }} onChange={v => change({ textSize: v as AccountData['textSize'] })}/></label><label>Meta inicial de palabras<input name="defaultGoal" type="number" required min={1} max={2000000} value={draft.defaultGoal || ''} onChange={e => change({ defaultGoal: Number(e.target.value) })}/></label></div><p className={'typography-preview ' + draft.typography + ' ' + draft.textSize}>La escritura empieza con una idea y encuentra su forma en cada revisión.</p><small>La tipografía y el tamaño se aplican al manuscrito. La meta se utiliza al crear nuevos proyectos.</small></section>
      </fieldset><aside className="profile-rail"><section><h2>Sesión y acceso</h2><h3>Acceso con ChatGPT</h3><p className="account-email">{session.email}</p><p>Tu correo y las opciones de acceso se administran desde tu cuenta de ChatGPT.</p><a className="logout-link" href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut size={18}/>Cerrar sesión</a></section><section><h2>Tu identidad de escritura</h2><p>Las muestras, el tono y los criterios de estilo se configuran en Mi voz.</p><a className="help-link" href="/mi-voz">Configurar mi voz<ArrowRight size={16}/></a></section></aside></div>
      {error && <p className="author-error" role="alert">{error} Tus cambios permanecen en el formulario.</p>}
      <div className="profile-save"><span role="status">{busy ? 'Guardando cambios…' : dirty ? 'Cambios sin guardar' : record.updated ? 'Todos los cambios están guardados' : 'Sin cambios pendientes'}</span><div><button type="button" className="btn secondary" disabled={!dirty || busy} onClick={() => { setDraft(record.data); setError(''); }}>Descartar cambios</button><button className="btn" disabled={!dirty || busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
    </form></div>;
}
