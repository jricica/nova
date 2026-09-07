'use client';
import { useState } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { Download, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, SaveButton, Choice, Confirm, kinds } from './ui';
export default function ProjectSettings({ project: p, reload }: {
    project: any;
    reload: () => Promise<void>;
}) {
    const [dirty, setDirty] = useState(false);
    useUnsavedChanges(dirty);
    const [kind, setKind] = useState(p.kind), [busy, setBusy] = useState(false), [remove, setRemove] = useState(false);
    async function archive() {
        if (dirty) {
            toast.info('Guarda los cambios del proyecto antes de archivarlo.');
            return;
        }
        setBusy(true);
        try {
            await api('projects/' + p.id, 'PATCH', { ...p, archived: p.archived ? 0 : 1 });
            await reload();
            toast.success(p.archived ? 'Proyecto reactivado.' : 'Proyecto archivado.');
        }
        catch (e) {
            toast.error((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function backup() {
        setBusy(true);
        try {
            const data = await api('projects/' + p.id + '/export?format=json');
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nova-proyecto.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast.success('Copia del proyecto descargada.');
        }
        catch (e) {
            toast.error((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <><div className="section-top"><div><h2>Configuración del proyecto</h2><p>Objetivo, tipo de obra y opciones para conservar tu trabajo.</p></div></div><div className="settings-grid"><form className="form-stack surface" onChange={() => setDirty(true)} onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
                await api('projects/' + p.id, 'PATCH', { ...p, title: f.get('title'), description: f.get('description'), goal: Number(f.get('goal')), kind });
                await reload();
                setDirty(false);
                toast.success('Proyecto actualizado.');
            }
            catch (e) {
                toast.error((e as Error).message);
            }
            finally {
                setBusy(false);
            }
        }}><fieldset disabled={busy} className="profile-fields form-stack"><label>Título<input name="title" defaultValue={p.title} maxLength={160} required/></label><label>Tipo<Choice value={kind} onChange={v => { setKind(v); setDirty(true); }} label="Tipo de proyecto" items={kinds}/></label><label>Descripción<textarea name="description" defaultValue={p.description} rows={5} maxLength={5000}/></label><label>Meta de palabras<input type="number" name="goal" min={1} max={2000000} defaultValue={p.goal} required/></label><small role="status">{dirty ? 'Cambios sin guardar' : 'Configuración guardada'}</small><SaveButton busy={busy}/></fieldset></form><div className="settings-options"><section className="surface"><Download size={22}/><h3>Exportar proyecto</h3><p>Exporta el manuscrito como Markdown o descarga un JSON con el proyecto, sus capítulos, fuentes y memoria. El JSON no incluye el historial de versiones.</p><a className="btn secondary" href={'/api/nova/projects/' + p.id + '/export'} download>Descargar Markdown</a><button className="btn secondary" disabled={busy} onClick={backup}>Descargar copia JSON</button></section><section className="surface"><Archive size={22}/><h3>{p.archived ? 'Proyecto archivado' : 'Archivar proyecto'}</h3><p>Archivar la separa de los proyectos activos. Puedes seguir abriéndola y reactivarla cuando quieras.</p><button className="btn secondary" disabled={busy} onClick={archive}>{p.archived ? 'Reactivar proyecto' : 'Archivar proyecto'}</button></section><section className="danger-zone"><h3>Eliminar proyecto</h3><p>Se borrarán capítulos, versiones, fuentes y memoria.</p><button className="btn danger" onClick={() => setRemove(true)}><Trash2 size={16}/>Eliminar proyecto</button></section></div></div><Confirm open={remove} onOpenChange={setRemove} title={'¿Eliminar “' + p.title + '”?'} description="Esta acción es definitiva. Descarga una copia antes si quieres conservar el manuscrito o sus fuentes." action={async () => { await api('projects/' + p.id, 'DELETE'); window.location.assign('/proyectos'); }}/></>;
}
