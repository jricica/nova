'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Save, History, Trash2, Search, BookOpen, Sparkles, Download, Check, AlignLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, Modal, Confirm, SaveButton, Empty, Loading, num, date } from './ui';
import { useAccount } from './account-context';
import { draftKey, readDraft, writeDraft, removeDraft, type LocalDraft } from '@/lib/draft-recovery';
import { analyze } from '@/lib/text';
export default function Editor({ project: p, reload }: {
    project: any;
    reload: () => Promise<void>;
}) {
    const [chapter, setChapter] = useState<any>(null), [text, setText] = useState(''), [title, setTitle] = useState(''), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [create, setCreate] = useState(false), [remove, setRemove] = useState(false), [history, setHistory] = useState<any[] | null>(null), [query, setQuery] = useState(''), [results, setResults] = useState<any[] | null>(null), [searching, setSearching] = useState(false), [focus, setFocus] = useState(false);
    const { session } = useAccount();
    const [recovery,setRecovery]=useState<LocalDraft|null>(null),[localState,setLocalState]=useState<'pending'|'saved'|'failed'|''>(''),[saveError,setSaveError]=useState('');
    const keyFor=(cid:string)=>draftKey(session.email,p.id,cid);
    const draftSnapshot=useRef<{key:string;draft:LocalDraft}|null>(null);
    useEffect(()=>{
        draftSnapshot.current=dirty&&chapter&&!recovery?{key:keyFor(chapter.id),draft:{title,content:text,version:chapter.version,updated:Date.now()}}:null;
        if(!draftSnapshot.current)return;
        setLocalState('pending');
        const timer=setTimeout(()=>{const d=draftSnapshot.current;if(d){try{setLocalState(writeDraft(localStorage,d.key,d.draft)?'saved':'failed')}catch{setLocalState('failed')}}},250);
        return ()=>clearTimeout(timer);
    },[dirty,chapter?.id,chapter?.version,title,text,recovery,session.email]);
    useEffect(()=>{const flush=()=>{const d=draftSnapshot.current;if(d){try{writeDraft(localStorage,d.key,d.draft)}catch{}}};window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',flush);return()=>{flush();window.removeEventListener('pagehide',flush);window.removeEventListener('beforeunload',flush)}},[]);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const requestId = useRef(0);
    const base = 'projects/' + p.id;
    const load = async (id: string) => { const serial = ++requestId.current; setLoading(true); try {
        const c = await api(base + '/chapters/' + id);
        if (serial !== requestId.current)
            return;
        let local:LocalDraft|null=null;
        try{local=readDraft(localStorage,keyFor(c.id));if(local&&local.title===c.title&&local.content===c.content){removeDraft(localStorage,keyFor(c.id));local=null}}catch{}
        setRecovery(local);setSaveError('');setLocalState('');
        setChapter(c);
        setText(c.content);
        setTitle(c.title);
        setDirty(false);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        if (serial === requestId.current)
            setLoading(false);
    } };
    useEffect(() => { if (p.chapters.length)
        void load(p.chapters[0].id); return () => { requestId.current++; }; }, [p.id]);
    useEffect(() => { if (!dirty)
        return; const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', stop); return () => window.removeEventListener('beforeunload', stop); }, [dirty]);
    async function save() { if (!chapter || busy)
        return; setBusy(true); setSaveError(''); const snapshot = text, t = title; try {
        const c = await api(base + '/chapters/' + chapter.id, 'PUT', { title: t, content: snapshot, version: chapter.version });
        setChapter(c);
        setDirty(false);draftSnapshot.current=null;setLocalState('');try{removeDraft(localStorage,keyFor(chapter.id))}catch{}
        toast.success('Capítulo guardado y versión creada.');
        await reload();
    }
    catch (e) {
        setSaveError((e as Error).message);toast.error((e as Error).message, { duration: 9000 });
    }
    finally {
        setBusy(false);
    } }
    const a = analyze(text);
    return <>{recovery&&<div className="recovery-notice" role="status"><div><strong>Hay un borrador recuperable en este navegador.</strong><p>Copia del {new Date(recovery.updated).toLocaleString('es')}. {recovery.version!==chapter?.version?'La versión de tu cuenta cambió; compara el texto antes de guardarlo.':'No se ha guardado en tu cuenta.'}</p></div><div className="pilot-actions"><button className="btn secondary" onClick={()=>{setTitle(recovery.title);setText(recovery.content);setDirty(true);setRecovery(null)}}>Recuperar borrador</button><button className="btn plain" onClick={()=>{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([recovery.title+'\n\n'+recovery.content],{type:'text/plain;charset=utf-8'}));link.download='nova-borrador.txt';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}}>Descargar copia</button><button className="btn plain" onClick={()=>{try{removeDraft(localStorage,keyFor(chapter.id))}catch{}setRecovery(null)}}>Descartar copia local</button></div></div>}{saveError&&<p className="recovery-notice" role="alert">No se guardó en tu cuenta: {saveError}</p>}<div className="editor-tools"><p><span className={dirty ? 'save-dot pending' : 'save-dot'}/>{dirty ? 'Cambios sin guardar' : chapter ? 'Guardado en tu cuenta · '+new Date(chapter.updated).toLocaleString('es') : 'Sin capítulo seleccionado'}</p><div><button className="btn plain" onClick={() => setFocus(!focus)}><AlignLeft size={16}/>{focus ? 'Mostrar contexto' : 'Modo enfoque'}</button><button className="btn" disabled={!chapter || !dirty || busy} onClick={save}><Save size={16}/>{busy ? 'Guardando…' : 'Guardar'}</button></div></div><p className="draft-status" aria-live="polite">{dirty?(localState==='saved'?'Copia de recuperación disponible en este navegador. Pulsa Guardar para conservar una versión en tu cuenta.':localState==='failed'?'No se pudo crear una copia local. Mantén esta página abierta y guarda en tu cuenta.':'Preparando copia de recuperación…'):'Recuperación local: hasta 7 días y 20 capítulos por navegador. Evita escribir en un dispositivo compartido.'}</p><div className={'editor-layout ' + (focus ? 'focus-mode' : '')}><aside className="chapters-panel"><div className="panel-heading"><span>CAPÍTULOS</span><button className="icon-btn" onClick={() => { if (dirty)
        return toast.info('Guarda tu capítulo antes de crear otro.'); setCreate(true); }} aria-label="Nuevo capítulo"><Plus size={18}/></button></div>{p.chapters.length ? <ol>{p.chapters.map((c: any, i: number) => <li key={c.id}><button className={chapter?.id === c.id ? 'selected' : ''} onClick={() => { if (c.id === chapter?.id)
        return; if (dirty)
        return toast.info('Guarda los cambios antes de cambiar de capítulo.'); void load(c.id); }}><span>{String(i + 1).padStart(2, '0')}</span><div>{c.title}<small>{num(c.words)} palabras</small></div></button></li>)}</ol> : <p className="panel-empty">Añade el primer capítulo de tu obra.</p>}<button className="chapter-add" onClick={() => { if (dirty)
        return toast.info('Guarda los cambios antes de continuar.'); setCreate(true); }}><Plus size={16}/>Añadir capítulo</button></aside><section className="manuscript-panel">{loading ? <Loading /> : chapter ? <><div className="document-top"><span>MANUSCRITO / VERSIÓN {chapter.version}</span><div><button className="icon-btn" aria-label="Ver historial" disabled={busy} onClick={async () => { try {
        setHistory(await api(base + '/chapters/' + chapter.id + '/revisions'));
    }
    catch (e) {
        toast.error((e as Error).message);
    } }}><History size={18}/></button><button className="icon-btn" aria-label="Eliminar capítulo" disabled={busy} onClick={() => setRemove(true)}><Trash2 size={17}/></button></div></div><input className="chapter-title" aria-label="Título del capítulo" value={title} disabled={busy || !!recovery} maxLength={160} onChange={e => { setTitle(e.target.value); setDirty(true); }}/><textarea className="manuscript" aria-label="Texto del capítulo" value={text} ref={textarea} disabled={busy || !!recovery} maxLength={300000} onChange={e => { setText(e.target.value); setDirty(true); }} placeholder="Comienza a escribir el contenido del capítulo…"/><div className="document-footer"><span>{num(a.words)} palabras</span><span>{a.readingMinutes} min de lectura estimada</span></div></> : <Empty title="Añade el primer capítulo"><p>Crea un capítulo para empezar a escribir. Cada guardado conserva una versión recuperable.</p><button className="btn" onClick={() => setCreate(true)}><Plus size={17}/>Crear capítulo</button></Empty>}</section>{!focus ? <aside className="context-panel"><div className="panel-heading"><span>TU CONTEXTO</span><BookOpen size={17}/></div><section><h3>Encuentra en tus fuentes</h3><p>Busca palabras en los documentos de este proyecto.</p><form className="context-search" onSubmit={async (e) => { e.preventDefault(); setSearching(true); try {
        const r = await api(base + '/search?q=' + encodeURIComponent(query));
        setResults(r.results);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setSearching(false);
    } }}><input aria-label="Buscar en fuentes" placeholder="Un tema, nombre o concepto" value={query} onChange={e => setQuery(e.target.value)} minLength={2} maxLength={400} required/><button className="icon-btn" aria-label="Buscar" disabled={searching}><Search size={18}/></button></form>{searching ? <p role="status">Buscando…</p> : results ? results.length ? <div className="search-results">{results.slice(0, 4).map((r: any, i: number) => <article key={i}><a href={'/proyectos/' + p.id + '/fuentes?fuente=' + r.source}>{r.title} · fragmento {r.position}</a><p>{r.content.slice(0, 350)}{r.content.length > 350 ? '…' : ''}</p><button className="link-button" disabled={!chapter || busy} onClick={() => { const el = textarea.current; const pos = el?.selectionStart ?? text.length; const cite = ` [${r.title}, fragmento ${r.position}]`; setText(text.slice(0, pos) + cite + text.slice(pos)); setDirty(true); toast.info('Referencia insertada. Revisa que respalde tu afirmación.'); }}>Insertar referencia</button></article>)}</div> : <p className="no-results">Sin coincidencias. Prueba otras palabras o añade una fuente.</p> : null}<small>Coincidencias de texto, no verificación factual.</small></section><section className="ai-pending"><Sparkles size={22}/><h3>Asistencia de escritura</h3><p>Continuar, reescribir y revisar con IA estarán disponibles cuando se integre el proveedor.</p><a href="/ajustes">Ver estado de integración</a></section><section><h3>Tu texto, en números</h3><dl className="small-stats"><div><dt>Párrafos</dt><dd>{a.paragraphs}</dd></div><div><dt>Palabras por oración</dt><dd>{a.average}</dd></div></dl><small>Cálculo aproximado del texto abierto.</small></section></aside> : null}</div><Modal open={create} onOpenChange={setCreate} title="Nuevo capítulo" description="Una escena, una sección o una nueva idea."><form className="form-stack" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); try {
        const c = await api(base + '/chapters', 'POST', { title: f.get('title') });
        setCreate(false);
        await reload();
        await load(c.id);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><label>Título<input name="title" required maxLength={160} placeholder={'Capítulo ' + (p.chapters.length + 1)}/></label><SaveButton busy={busy} label="Crear capítulo"/></form></Modal><Modal open={history !== null} onOpenChange={v => { if (!v)
        setHistory(null); }} title="Historial del capítulo" description="Los últimos 40 guardados. Recuperar una versión la lleva al editor; guarda para confirmarla.">{history?.length ? <div className="revision-list">{history.map(r => <article key={r.id}><div><strong>Versión {r.version}</strong><small>{date(r.created)} · {num(r.words)} palabras</small></div><p>{r.content.slice(0, 150) || 'Capítulo vacío'}</p><button className="btn secondary" onClick={() => { if (dirty)
        return toast.info('Guarda tus cambios actuales antes de recuperar otra versión.'); setText(r.content); setTitle(r.title); setDirty(true); setHistory(null); toast.info('Versión recuperada en el editor. Guarda para conservarla.'); }}>Recuperar</button></article>)}</div> : <p>El historial aparecerá cuando guardes tu primer texto.</p>}</Modal><Confirm open={remove} onOpenChange={setRemove} title="¿Eliminar este capítulo?" description="Se eliminarán el texto y todo su historial. Esta acción no se puede deshacer." action={async () => { await api(base + '/chapters/' + chapter.id, 'DELETE'); try{removeDraft(localStorage,keyFor(chapter.id))}catch{}draftSnapshot.current=null;setRecovery(null); setChapter(null); setText(''); setDirty(false); await reload(); toast.success('Capítulo eliminado.'); }}/></>;
}
