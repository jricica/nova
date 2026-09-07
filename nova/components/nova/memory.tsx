'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Network } from 'lucide-react';
import { toast } from 'sonner';
import { api, Modal, Confirm, SaveButton, Empty, Choice, memoryKinds } from './ui';
export default function Memory({ project: p, reload }: {
    project: any;
    reload: () => Promise<void>;
}) { const [filter, setFilter] = useState('all'), [edit, setEdit] = useState<any>(null), [kind, setKind] = useState('personaje'), [busy, setBusy] = useState(false), [remove, setRemove] = useState<any>(null); const rows = p.memories.filter((m: any) => filter === 'all' || m.kind === filter); return <><div className="section-top"><div><h2>Memoria del proyecto</h2><p>Personajes, lugares y reglas. Un registro escrito por ti para mantener la continuidad.</p></div><button className="btn" onClick={() => { setKind('personaje'); setEdit({}); }}><Plus size={17}/>Nueva entrada</button></div><div className="filter-bar"><span>{p.memories.length} entradas en el proyecto</span><Choice label="Filtrar memoria" value={filter} onChange={setFilter} items={{ all: 'Todas las entradas', ...memoryKinds }}/></div>{rows.length ? <div className="memory-grid">{rows.map((m: any) => <article className={'memory-card ' + m.kind} key={m.id}><div className="memory-card-head"><span>{memoryKinds[m.kind]}</span><div><button className="icon-btn" aria-label={'Editar ' + m.title} onClick={() => { setKind(m.kind); setEdit(m); }}><Pencil size={16}/></button><button className="icon-btn" aria-label={'Eliminar ' + m.title} onClick={() => setRemove(m)}><Trash2 size={16}/></button></div></div><h3>{m.title}</h3>{m.date ? <small>{m.date}</small> : null}<p>{m.content}</p></article>)}</div> : <Empty title="Sin entradas de memoria"><p>Registra un personaje, una regla de tu mundo, una fecha o una nota de investigación.</p><button className="btn" onClick={() => { setKind('personaje'); setEdit({}); }}><Plus size={17}/>Crear una entrada</button></Empty>}<div className="quiet-note"><Network size={18}/><p>Este registro es manual. La detección automática de contradicciones necesita la futura integración de IA.</p></div><Modal open={!!edit} onOpenChange={v => { if (!v)
    setEdit(null); }} title={edit?.id ? 'Editar memoria' : 'Nueva entrada de memoria'} description="Define hechos y reglas que deban permanecer consistentes."><form className="form-stack" key={edit?.id || 'new'} onSubmit={async (e) => { e.preventDefault(); setBusy(true); const f = new FormData(e.currentTarget); try {
    await api('projects/' + p.id + '/memory' + (edit.id ? '/' + edit.id : ''), edit.id ? 'PUT' : 'POST', { kind, title: f.get('title'), content: f.get('content'), date: f.get('date') });
    setEdit(null);
    await reload();
    toast.success('Memoria guardada.');
}
catch (e) {
    toast.error((e as Error).message);
}
finally {
    setBusy(false);
} }}><label>Tipo<Choice label="Tipo de entrada" value={kind} onChange={setKind} items={memoryKinds}/></label><label>Nombre o título<input name="title" defaultValue={edit?.title || ''} required maxLength={160}/></label><label>Fecha o referencia temporal (opcional)<input name="date" defaultValue={edit?.date || ''} maxLength={100} placeholder="1837 · Capítulo 3 · Después de la llegada…"/></label><label>Descripción<textarea name="content" defaultValue={edit?.content || ''} rows={6} required maxLength={20000}/></label><SaveButton busy={busy}/></form></Modal><Confirm open={!!remove} onOpenChange={v => { if (!v)
    setRemove(null); }} title="¿Eliminar esta entrada?" description="El registro se eliminará de la memoria del proyecto." action={async () => { await api('projects/' + p.id + '/memory/' + remove.id, 'DELETE'); await reload(); }}/></>; }
