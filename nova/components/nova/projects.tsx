'use client';
import { useState } from 'react';
import { Plus, Search, ArrowRight, FileText, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { api, useData, Loading, Failure, Empty, PageHead, Modal, Choice, SaveButton, kinds, num, date } from './ui';
import { useAccount } from './account-context';
type ProjectRow = {
    id: string;
    title: string;
    kind: string;
    description: string;
    chapters: number;
    sources: number;
    words: number;
    goal: number;
    archived: number;
    updated: string;
};
export default function Projects() {
    const { data, error, loading, reload } = useData('projects'), { preferences } = useAccount();
    const [search, setSearch] = useState(''), [filter, setFilter] = useState('active'), [order, setOrder] = useState('updated');
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [kind, setKind] = useState('novela'), [createError, setCreateError] = useState('');
    if (loading)
        return <Loading />;
    if (error)
        return <Failure error={error} retry={reload}/>;
    const all = data as ProjectRow[];
    const rows = all.filter(p => (filter === 'all' || (filter === 'archived' ? p.archived : !p.archived)) && p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => order === 'title' ? a.title.localeCompare(b.title, 'es') : order === 'words' ? b.words - a.words : b.updated.localeCompare(a.updated));
    function newProject() { setCreateError(''); setOpen(true); }
    return <>
    <PageHead eyebrow="ESPACIO DE TRABAJO" title="Proyectos" description="Organiza tus manuscritos, consulta tus fuentes y continúa tu trabajo." action={<button className="btn" onClick={newProject}><Plus size={18}/>Nuevo proyecto</button>}/>
    <div className="library-summary"><div><span>Proyectos activos</span><strong>{num(all.filter(p => !p.archived).length)}</strong></div><div><span>Palabras guardadas</span><strong>{num(all.reduce((n, p) => n + p.words, 0))}</strong></div><div><span>Fuentes disponibles</span><strong>{num(all.reduce((n, p) => n + p.sources, 0))}</strong></div></div>
    <div className="library-toolbar"><label className="search-box"><Search size={18}/><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título" aria-label="Buscar proyectos"/></label><Choice label="Estado de los proyectos" value={filter} onChange={setFilter} items={{ active: 'Activos', archived: 'Archivados', all: 'Todos' }}/><Choice label="Orden de los proyectos" value={order} onChange={setOrder} items={{ updated: 'Última actualización', title: 'Título: A–Z', words: 'Más palabras' }}/></div>
    <div className="library-caption"><h2>Biblioteca de proyectos</h2><span>{rows.length} {rows.length === 1 ? 'proyecto' : 'proyectos'}</span></div>
    {rows.length ? <ul className="project-library">{rows.map(p => <li key={p.id}><div className={'project-file ' + p.kind} aria-hidden="true"><FileText size={24} strokeWidth={1.4}/></div><div className="project-library-title"><a href={'/proyectos/' + p.id}>{p.title}</a><p>{kinds[p.kind]} · {num(p.chapters)} capítulos{p.archived ? ' · Archivado' : ''}</p>{p.description && <small>{p.description}</small>}</div><div className="project-library-progress"><span>{num(p.words)} <small>/ {num(p.goal)} palabras</small></span><Progress value={Math.min(100, p.words / p.goal * 100)} aria-label={`Avance de ${p.title}: ${Math.round(p.words / p.goal * 100)} por ciento`}/></div><div className="project-library-date"><span>Actualizado</span><time dateTime={p.updated}>{date(p.updated)}</time></div><a className="project-open" href={'/proyectos/' + p.id} aria-label={`Abrir ${p.title}`}><ArrowRight size={20}/></a></li>)}</ul> : <Empty title={search ? 'No se encontraron proyectos' : filter === 'archived' ? 'No hay proyectos archivados' : 'Crea tu primer proyecto'}><p>{search ? 'Prueba otro título o cambia el filtro de estado.' : filter === 'archived' ? 'Los proyectos que archives aparecerán aquí.' : 'Comienza con una novela, un ensayo o un libro académico.'}</p>{search ? <button className="btn secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Restablecer búsqueda</button> : filter !== 'archived' ? <button className="btn" onClick={newProject}><Plus size={17}/>Crear proyecto</button> : <button className="btn secondary" onClick={() => setFilter('active')}>Ver proyectos activos</button>}</Empty>}
    <div className="library-bottom"><BookOpen size={18}/><p>Define tu estilo y tus referencias antes de empezar.</p><a href="/mi-voz">Configurar mi voz<ArrowRight size={16}/></a></div>
    <Modal open={open} onOpenChange={v => { if (!busy)
        setOpen(v); }} title="Nuevo proyecto" description="Configura tu manuscrito. Puedes modificar estos datos más adelante."><form className="form-stack" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setCreateError(''); try {
        const p = await api('projects', 'POST', { title: f.get('title'), kind, description: f.get('description'), goal: Number(f.get('goal')) });
        window.location.assign('/proyectos/' + p.id);
    }
    catch (e) {
        setCreateError((e as Error).message);
        setBusy(false);
    } }}><fieldset disabled={busy} className="profile-fields form-stack"><label>Título<input name="title" required maxLength={160} placeholder="Título del manuscrito"/></label><label>Tipo de obra<Choice label="Tipo de obra" value={kind} onChange={setKind} items={kinds}/></label><label>Descripción<textarea name="description" maxLength={5000} rows={3} placeholder="Tema, premisa u objetivo del proyecto"/></label><label>Meta de palabras<input name="goal" type="number" min={1} max={2000000} defaultValue={preferences.defaultGoal} required/></label>{createError && <p role="alert" className="author-error">{createError}</p>}<SaveButton busy={busy} label="Crear proyecto"/></fieldset></form></Modal>
  </>;
}
