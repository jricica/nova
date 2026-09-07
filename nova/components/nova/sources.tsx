'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, Modal, Confirm, SaveButton, Empty, num, date } from './ui';
export default function Sources({ project: p, reload }: {
    project: any;
    reload: () => Promise<void>;
}) {
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [remove, setRemove] = useState<any>(null), [view, setView] = useState<any>(null), [query, setQuery] = useState(''), [results, setResults] = useState<any[] | null>(null), [searching, setSearching] = useState(false), [content, setContent] = useState(''), [filename, setFilename] = useState('fuente.txt');
    const base = 'projects/' + p.id;
    async function inspect(id: string) { try {
        setView(await api(base + '/sources/' + id));
    }
    catch (e) {
        toast.error((e as Error).message);
    } }
    useEffect(() => { const source = new URLSearchParams(window.location.search).get('fuente'); if (source)
        void inspect(source); }, [p.id]);
    return <><div className="section-top"><div><h2>Fuentes del proyecto</h2><p>Guarda texto, conserva su procedencia y busca los pasajes que necesitas.</p></div><button className="btn" onClick={() => setOpen(true)}><Plus size={17}/>Añadir fuente</button></div><div className="info-banner"><FileText size={20}/><p>Importa archivos <b>TXT o Markdown en UTF-8</b>, o pega un fragmento. Cada fuente conserva su texto completo y se divide en pasajes para buscar. Hasta 500.000 caracteres por fuente.</p></div><form className="filter-bar" onSubmit={async (e) => { e.preventDefault(); setSearching(true); try {
        const r = await api(base + '/search?q=' + encodeURIComponent(query));
        setResults(r.results);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setSearching(false);
    } }}><label className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar dentro de tus documentos…" aria-label="Buscar en el contenido de las fuentes" required minLength={2} maxLength={400}/></label><button className="btn secondary" disabled={searching}>{searching ? 'Buscando…' : 'Buscar pasajes'}</button>{results !== null ? <button type="button" className="link-button" onClick={() => { setResults(null); setQuery(''); }}>Ver todas</button> : null}</form>{results !== null ? <div className="source-results"><h3>{results.length} pasajes encontrados</h3><p className="muted">Búsqueda por coincidencias de palabras. No acredita la veracidad del contenido.</p>{results.length ? results.map((r: any, i: number) => <article className="source-result" key={i}><button className="link-button" onClick={() => inspect(r.source)}>{r.title} · fragmento {r.position}</button><p>{r.content}</p><small>{r.author || 'Autor no indicado'}</small></article>) : <Empty title="No hay coincidencias."><p>Prueba con términos más breves o añade más fuentes al proyecto.</p></Empty>}</div> : p.sources.length ? <div className="source-list">{p.sources.map((s: any) => <article key={s.id}><FileText className="source-file-icon"/><div><button className="source-title" onClick={() => inspect(s.id)}>{s.title}</button><p>{s.author || 'Autor no indicado'} · {num(Math.ceil(s.bytes / 1024))} KB</p><small>Añadida el {date(s.created)}</small></div><button className="icon-btn" aria-label={'Eliminar ' + s.title} onClick={() => setRemove(s)}><Trash2 size={17}/></button></article>)}</div> : <Empty title="Añade la primera fuente"><p>Añade la primera fuente y tendrás su contenido a mano mientras escribes.</p><button className="btn" onClick={() => setOpen(true)}><Plus size={17}/>Añadir mi primera fuente</button></Empty>}<Modal open={open} onOpenChange={setOpen} title="Añadir una fuente" description="Los archivos se guardan en el servidor de tu espacio. No se envían a un proveedor de IA."><form className="form-stack" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const f = new FormData(e.currentTarget); try {
        await api(base + '/sources', 'POST', { title: f.get('title'), author: f.get('author'), url: f.get('url'), content, filename });
        setOpen(false);
        setContent('');
        setFilename('fuente.txt');
        await reload();
        toast.success('Fuente guardada y preparada para buscar.');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><label>Título<input name="title" required maxLength={160}/></label><div className="form-row"><label>Autor<input name="author" maxLength={300}/></label><label>Enlace de origen<input name="url" type="url" maxLength={2000} placeholder="https://…"/></label></div><label className="file-input-label"><Upload size={18}/>Importar TXT o Markdown<input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; if (file.size > 1500000)
        return toast.error('El archivo es demasiado grande. Máximo 1,5 MB.'); if (!/\.(txt|md|markdown)$/i.test(file.name))
        return toast.error('Importa un archivo TXT o Markdown.'); try {
        const t = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
        if (t.length > 500000)
            throw new Error('Máximo 500.000 caracteres.');
        setContent(t);
        setFilename(file.name);
        toast.success('Texto importado. Revisa los datos y guarda.');
    }
    catch (e) {
        toast.error('No se pudo importar: ' + (e as Error).message);
    } }}/></label><label>Contenido<textarea rows={8} value={content} onChange={e => setContent(e.target.value)} maxLength={500000} required placeholder="Pega el texto de la fuente…"/></label><small>{num(content.length)} / 500.000 caracteres · {filename}</small><SaveButton busy={busy} label="Guardar fuente"/></form></Modal><Modal open={!!view} onOpenChange={v => { if (!v)
        setView(null); }} title={view?.title || 'Fuente'} description={view?.author || 'Autor no indicado'}>{view?.url ? <a className="link-button" href={view.url} target="_blank" rel="noreferrer">Abrir enlace original <ExternalLink size={15}/></a> : null}<div className="source-full">{view?.content}</div></Modal><Confirm open={!!remove} onOpenChange={v => { if (!v)
        setRemove(null); }} title="¿Eliminar esta fuente?" description="Se eliminarán el archivo y sus pasajes de búsqueda. Las referencias escritas en el manuscrito no se borrarán automáticamente." action={async () => { await api(base + '/sources/' + remove.id, 'DELETE'); await reload(); setResults(null); toast.success('Fuente eliminada.'); }}/></>;
}
