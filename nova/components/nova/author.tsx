'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Feather, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { api, useData, Loading, Failure, PageHead, Choice, Modal, Confirm, kinds, num } from './ui';
import { analyze } from '@/lib/text';
import { profileRules, writingPrompts, tones, rhythms, type AuthorData } from '@/lib/author-profile';

type Sample = { id: string; title: string; kind: string; words: number; created: string };
type Stored = { data: AuthorData; samples: Sample[]; version: number; confirmed: string | null };
const steps = ['Tu intención', 'Tus muestras', 'Tu criterio', 'Tu perfil'];

export default function Author({ memoryOnly = false }: { memoryOnly?: boolean }) {
  const profile = useData('author'), projects = useData('projects');
  if (profile.loading || projects.loading) return <Loading />;
  if (profile.error || projects.error) return <Failure error={profile.error || projects.error} retry={() => { void profile.reload(); void projects.reload(); }} />;
  return <AuthorForm initial={profile.data} projects={projects.data} memoryOnly={memoryOnly} />;
}

function AuthorForm({ initial, projects, memoryOnly }: { initial: Stored; projects: Array<{id:string;title:string}>; memoryOnly:boolean }) {
  const [data, setData] = useState(initial.data), [version, setVersion] = useState(initial.version);
  const [saved, setSaved] = useState(JSON.stringify(initial.data)), [confirmed, setConfirmed] = useState(initial.confirmed);
  const [samples, setSamples] = useState(initial.samples), [busy, setBusy] = useState(false), [saveError, setSaveError] = useState('');
  const [sampleOpen, setSampleOpen] = useState(false), [sampleTitle, setSampleTitle] = useState(''), [sampleKind, setSampleKind] = useState('ensayo'), [sampleText, setSampleText] = useState('');
  const [preview, setPreview] = useState<{title:string;content:string}|null>(null), [remove, setRemove] = useState<Sample|null>(null);
  const [memoryText, setMemoryText] = useState(''), [scope, setScope] = useState('all'), [editMemory, setEditMemory] = useState<string|null>(null);
  const dirty = JSON.stringify(data) !== saved;
  const pending = dirty || !!sampleText || !!sampleTitle || !!memoryText || busy;
  useEffect(() => {
    if (!pending) return;
    const before = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const click = (e: MouseEvent) => { const a = (e.target as Element).closest('a[href]'); if (a && !window.confirm('Hay cambios sin guardar. ¿Quieres salir de esta página?')) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('beforeunload', before); document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', before); document.removeEventListener('click', click, true); };
  }, [pending]);
  function patch(p: Partial<AuthorData>) { if (!busy) { setData(d => ({ ...d, ...p })); setSaveError(''); } }
  async function save(next = data, approve = false) {
    setBusy(true); setSaveError('');
    try { const result = await api('author', 'PUT', { data: next, version, confirm: approve }); setData(next); setSaved(JSON.stringify(next)); setVersion(result.version); setConfirmed(result.confirmed); toast.success(approve ? 'Perfil aprobado. Tu voz está preparada.' : 'Borrador guardado. Puedes continuar después.'); }
    catch (e) { setSaveError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function uploadText(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 120000) { toast.error('Selecciona TXT o Markdown UTF-8 de hasta 120 KB.'); return; }
    setBusy(true);
    try { const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); if (text.length > 30000) throw new Error('La muestra admite hasta 30.000 caracteres.'); setSampleText(text); setSampleTitle(file.name.replace(/\.[^.]+$/, '').slice(0,160)); }
    catch (e) { toast.error(e instanceof TypeError ? 'El archivo debe estar codificado en UTF-8.' : (e as Error).message); }
    finally { setBusy(false); }
  }
  const measurements = analyze(sampleText), exerciseStats = analyze(data.exercise);
  const usableProfile = !!confirmed && !dirty;
  const projectNames = Object.fromEntries(projects.map(p => [p.id, p.title]));
  return <div className="author-workspace">
    <PageHead eyebrow="TU IDENTIDAD DE AUTOR" title={memoryOnly ? 'Mi memoria' : 'Mi voz'} description={memoryOnly ? 'Decide qué preferencias conservar y dónde aplicarlas.' : 'Configura tus muestras, criterios y preferencias de escritura.'} action={<a className="btn secondary" href={memoryOnly ? '/mi-voz' : '/mi-memoria'}>{memoryOnly ? 'Ver mi perfil' : 'Mi memoria'}<ArrowRight size={16}/></a>} />
    <div className="author-status" role="status"><span>{dirty ? 'Cambios sin guardar' : usableProfile ? 'Perfil aprobado por ti' : version ? 'Borrador guardado' : 'Aún no has guardado tu perfil'}</span><span>Configuración guiada · sin IA</span></div>
    {saveError && <p className="author-error" role="alert">{saveError} Tus respuestas siguen aquí. Si necesitas recargar, copia primero tus cambios.</p>}
    <fieldset disabled={busy} className="author-fieldset">
    {!memoryOnly ? <>
      <nav className="author-steps" aria-label="Pasos del perfil">{steps.map((s,i) => <button type="button" key={s} aria-current={data.step === i ? 'step' : undefined} onClick={() => patch({step:i})}><span>{i+1}</span>{s}</button>)}</nav>
      <Progress value={(data.step+1)*25} aria-label={`Paso ${data.step+1} de 4`} />
      <div className="author-columns">
        <section className="surface form-stack author-main">
          <p className="eyebrow">PASO {data.step+1} DE 4</p>
          {data.step === 0 && <>
            <h2>¿Qué quieres que reconozcamos en tu escritura?</h2>
            <label>¿Cómo te llamas como autor?<input maxLength={100} value={data.name} onChange={e => patch({name:e.target.value})} placeholder="Tu nombre o seudónimo" /></label>
            <label>¿Con qué tipo de escritura quieres empezar?<Choice label="Tipo de escritura" value={data.genre} items={kinds} onChange={v => { patch({genre:v as AuthorData['genre'],promptIndex:0}); }} /></label>
            <label>¿Para quién escribes?<textarea rows={2} maxLength={2000} value={data.audience} onChange={e => patch({audience:e.target.value})} placeholder="Por ejemplo, personas que se acercan por primera vez a mi tema" /></label>
            <label>¿Qué quieres provocar o explicar?<textarea rows={3} maxLength={2000} value={data.purpose} onChange={e => patch({purpose:e.target.value})} placeholder="Quiero que el lector…" /></label>
            <div className="author-pair"><label>Tono que prefieres<Choice label="Tono" value={data.tone} items={tones} onChange={v => patch({tone:v as AuthorData['tone']})} /></label><label>Ritmo que prefieres<Choice label="Ritmo" value={data.rhythm} items={rhythms} onChange={v => patch({rhythm:v as AuthorData['rhythm']})} /></label></div>
            <label>¿Qué te hace pensar «yo nunca escribiría eso»?<textarea rows={2} maxLength={2000} value={data.avoid} onChange={e => patch({avoid:e.target.value})} placeholder="Palabras, adornos o hábitos que quieres evitar" /></label>
          </>}
          {data.step === 1 && <>
            <h2>Muéstranos textos que sí suenen a ti.</h2><p>Guarda hasta 12 fragmentos propios. Puedes pegar texto o cargar archivos TXT y Markdown. Para PDF o Word, copia aquí el fragmento.</p>
            <button type="button" className="btn" disabled={samples.length >= 12} onClick={() => { setSampleKind(data.genre); setSampleOpen(true); }}><Plus size={16}/>Añadir una muestra</button>
            {samples.length ? <ul className="author-samples">{samples.map(s => <li key={s.id}><div><strong>{s.title}</strong><small>{s.kind === 'habla' ? 'Habla transcrita' : kinds[s.kind]} · {num(s.words)} palabras</small></div><button type="button" className="btn secondary" onClick={async () => { setBusy(true); try { setPreview(await api('author-samples/'+s.id)); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); } }}>Leer</button><button type="button" className="author-icon" aria-label={`Eliminar ${s.title}`} onClick={() => setRemove(s)}><Trash2 size={17}/></button></li>)}</ul> : <div className="author-note">Todavía no hay muestras. Puedes continuar y añadirlas después.</div>}
            <label>¿Qué expresiones o giros reconoces como tuyos?<textarea rows={3} maxLength={2000} value={data.expressions} onChange={e => patch({expressions:e.target.value})} placeholder="Expresiones que usas y que quieres conservar" /></label>
            <label>¿Qué cambia entre tu forma de hablar y de escribir?<textarea rows={3} maxLength={2000} value={data.spoken} onChange={e => patch({spoken:e.target.value})} placeholder="Por ejemplo, al hablar uso humor, pero mis ensayos son más sobrios" /></label>
            <p className="author-note">Para tu voz hablada puedes añadir una transcripción como muestra. La grabación y transcripción automática se conectarán después.</p>
          </>}
          {data.step === 2 && <>
            <h2>Afina tu criterio con un ejercicio.</h2>
            <div className="author-prompt"><small>DISPARADOR DE ESCRITURA · PLANTILLA</small><p>{writingPrompts(data)[data.promptIndex]}</p><button type="button" className="btn secondary" onClick={() => patch({promptIndex:(data.promptIndex+1)%3})}>Ver otra idea</button></div>
            <label>Escríbelo a tu manera<textarea rows={8} maxLength={10000} value={data.exercise} onChange={e => patch({exercise:e.target.value})} placeholder="Este ejercicio es opcional. No se modifica ni se genera por IA." /></label><small>{num(exerciseStats.words)} palabras · {exerciseStats.paragraphs} párrafos</small>
            <h3>Dos maneras de contar lo mismo</h3><p>Son ejemplos fijos para comparar. Elige el que se acerque más a tu preferencia.</p>
            <blockquote>«Volví al pueblo para vender la casa. Al abrir la puerta, cambié de opinión.»</blockquote>
            <blockquote>«Había regresado al pueblo decidido a vender la casa, pero el crujido familiar de la puerta puso en duda aquella decisión.»</blockquote>
            <Choice label="Ejemplo preferido" value={data.comparison} items={{directo:'El primero: más directo',narrativo:'El segundo: más descriptivo',ninguno:'Ninguno / depende del contexto'}} onChange={v => patch({comparison:v as AuthorData['comparison']})} />
            <label>¿Qué conservarías o cambiarías?<textarea rows={3} maxLength={2000} value={data.review} onChange={e => patch({review:e.target.value})} placeholder="Explica qué sí te representa. Esto tendrá más peso que una elección aislada." /></label>
          </>}
          {data.step === 3 && <>
            <h2>Revisa el perfil que has definido.</h2><p>Este resumen se arma con tus respuestas. No es un análisis automático de tus textos.</p>
            <div className="author-profile"><h3>{data.name || 'Tu perfil de autor'}</h3><p className="author-prewrap">{profileRules(data)}</p><p>Primer género: {kinds[data.genre]}. Referencia comparada: {data.comparison === 'ninguno' ? 'depende del contexto' : data.comparison === 'directo' ? 'ejemplo directo' : 'ejemplo descriptivo'}.</p>{data.spoken && <p>Habla y escritura: {data.spoken}</p>}</div>
            <label>Ajustes y matices de tu perfil<textarea rows={4} maxLength={2000} value={data.review} onChange={e => patch({review:e.target.value})} /></label>
            <p>{samples.length} muestras guardadas · {num(exerciseStats.words)} palabras de ejercicio · {data.memories.length} preferencias en memoria.</p>
            {(!data.audience.trim() || !data.purpose.trim()) && <p className="author-note">Completa tu audiencia y objetivo en el paso 1 para aprobar el perfil.</p>}
            <button type="button" className="btn" disabled={!data.audience.trim() || !data.purpose.trim()} onClick={() => void save(data,true)}><Check size={17}/>Aprobar mi perfil</button>
            <p className="author-note">Aprobar conserva estas preferencias para la futura integración de IA. No entrena un modelo ni activa la generación.</p>
          </>}
        </section>
        <aside className="author-aside"><Feather size={30} strokeWidth={1}/><h3>Tu voz, definida por ti.</h3><p>Las preguntas cambian de enfoque según lo que quieres escribir. Puedes volver a cualquier paso.</p><dl><div><dt>Muestras propias</dt><dd>{samples.length}/12</dd></div><div><dt>Preferencias guardadas</dt><dd>{data.memories.length}</dd></div><div><dt>Estado</dt><dd>{usableProfile ? 'Aprobado' : 'En preparación'}</dd></div></dl><p>Las ideas son ejercicios seleccionados de una biblioteca de plantillas. Tus respuestas y textos se guardan en tu espacio privado.</p><a className="help-link" href="/mi-memoria">Revisar mi memoria <ArrowRight size={15}/></a></aside>
      </div>
      <div className="author-actions"><button type="button" className="btn secondary" disabled={data.step === 0} onClick={() => patch({step:data.step-1})}>Anterior</button><button type="button" className="btn secondary" onClick={() => void save()}>{busy ? 'Guardando…' : 'Guardar borrador'}</button>{data.step < 3 && <button type="button" className="btn" onClick={() => void save({...data,step:data.step+1})}>Guardar y continuar<ArrowRight size={16}/></button>}</div>
    </> : <>
      <div className="author-columns"><section className="surface form-stack author-main"><h2>{editMemory ? 'Editar preferencia' : '¿Qué quieres que NOVA recuerde?'}</h2>
        <label>Preferencia o decisión<textarea rows={3} maxLength={2000} value={memoryText} onChange={e => setMemoryText(e.target.value)} placeholder="Por ejemplo: explicar los términos técnicos la primera vez que aparezcan" /></label>
        <label>¿Dónde aplica?<Choice label="Alcance del recuerdo" value={scope} onChange={setScope} items={{all:'En todos mis proyectos',...projectNames}} /></label>
        <div className="author-actions"><button type="button" className="btn" disabled={!memoryText.trim() || (!editMemory && data.memories.length >= 100)} onClick={() => { const m = {id:editMemory || crypto.randomUUID(),content:memoryText.trim(),project:scope === 'all' ? null : scope,enabled:true,updated:new Date().toISOString()}; patch({memories:editMemory ? data.memories.map(x => x.id === editMemory ? m : x) : [...data.memories,m]}); setMemoryText(''); setEditMemory(null); }}>Añadir a la revisión</button>{editMemory && <button type="button" className="btn secondary" onClick={() => { setEditMemory(null); setMemoryText(''); }}>Cancelar edición</button>}</div>
        <p>Origen: indicado por ti. Los cambios se conservan al pulsar «Guardar memoria».</p>
        {!data.memories.length && <div className="author-note">Aún no has añadido preferencias. Puedes guardar hasta 100 y desactivar cualquiera sin borrarla.</div>}
        <ul className="author-memories">{data.memories.map(m => <li key={m.id}><p>{m.content}</p><small>{m.project ? projectNames[m.project] : 'Todos mis proyectos'} · {m.enabled ? 'Activa' : 'Desactivada'} · Indicada por ti · {new Date(m.updated).toLocaleDateString('es')}</small><div className="author-actions"><button type="button" className="btn secondary" onClick={() => { setEditMemory(m.id); setMemoryText(m.content); setScope(m.project || 'all'); }}>Editar</button><button type="button" className="btn secondary" onClick={() => patch({memories:data.memories.map(x => x.id === m.id ? {...x,enabled:!x.enabled,updated:new Date().toISOString()} : x)})}>{m.enabled ? 'Desactivar' : 'Activar'}</button><button type="button" className="btn secondary" onClick={() => { patch({memories:data.memories.filter(x => x.id !== m.id)}); if (editMemory === m.id) { setEditMemory(null); setMemoryText(''); } }}>Quitar</button></div></li>)}</ul>
        <button type="button" className="btn" disabled={!!memoryText.trim()} onClick={() => void save(data,!!confirmed)}>{busy ? 'Guardando…' : 'Guardar memoria'}</button>
        {!!memoryText.trim() && <small>Añade el texto a la revisión o cancela su edición antes de guardar.</small>}
      </section><aside className="author-aside"><h3>Tú decides qué permanece.</h3><p>Una preferencia general puede tener una excepción dentro de un proyecto. Las decisiones de ese proyecto se entregarán con su alcance.</p><p>Los hechos de una novela siguen en la memoria de la obra. Las afirmaciones sobre el mundo real necesitan fuentes.</p><p>Quitar y guardar elimina el recuerdo de futuras recuperaciones. No hay aprendizaje automático activo.</p></aside></div>
    </>}
    </fieldset>
    <Modal open={sampleOpen} onOpenChange={v => { if (!busy) setSampleOpen(v); }} title="Una muestra de tu voz" description="Texto propio, hasta 30.000 caracteres. Las transcripciones se conservan separadas de la escritura.">
      <form className="form-stack" onSubmit={async e => { e.preventDefault(); setBusy(true); try { const s = await api('author-samples','POST',{title:sampleTitle,kind:sampleKind,content:sampleText}); setSamples(v => [s,...v]); setSampleTitle(''); setSampleText(''); setSampleOpen(false); toast.success('Muestra guardada.'); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); } }}>
        <fieldset disabled={busy} className="author-fieldset form-stack"><label>Título<input required maxLength={160} value={sampleTitle} onChange={e => setSampleTitle(e.target.value)} /></label><Choice label="Tipo de muestra" value={sampleKind} onChange={setSampleKind} items={{...kinds,habla:'Habla transcrita'}} /><label>Cargar TXT o Markdown<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={uploadText} /></label><label>Texto<textarea required rows={8} maxLength={30000} value={sampleText} onChange={e => setSampleText(e.target.value)} /></label><small>{num(measurements.words)} palabras · {measurements.paragraphs} párrafos · {measurements.average} palabras por oración (aproximado). No evalúa tu estilo.</small><button className="btn" disabled={!sampleText.trim() || !sampleTitle.trim()}>{busy ? 'Guardando…' : 'Guardar muestra'}</button></fieldset>
      </form>
    </Modal>
    <Modal open={!!preview} onOpenChange={v => { if(!v) setPreview(null); }} title={preview?.title || 'Muestra'} description="Tu texto original, sin modificaciones."><p className="author-prewrap author-preview">{preview?.content}</p></Modal>
    <Confirm open={!!remove} onOpenChange={v => { if(!v) setRemove(null); }} title="¿Eliminar esta muestra?" description="Se eliminará el texto guardado y dejará de estar disponible como referencia." action={async () => { if(!remove) return; await api('author-samples/'+remove.id,'DELETE'); setSamples(v => v.filter(s => s.id !== remove.id)); setRemove(null); }} />
  </div>;
}
