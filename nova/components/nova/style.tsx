'use client';
import { useState, useEffect } from 'react';
import { Feather } from 'lucide-react';
import { toast } from 'sonner';
import { api, SaveButton, num } from './ui';
import { analyze } from '@/lib/text';
export default function Style({ project: p, reload }: {
    project: any;
    reload: () => Promise<void>;
}) { const [rules, setRules] = useState(p.style), [sample, setSample] = useState(p.sample), [busy, setBusy] = useState(false); const dirty = rules !== p.style || sample !== p.sample; useEffect(() => { if (!dirty)
    return; const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', stop); return () => window.removeEventListener('beforeunload', stop); }, [dirty]); const a = analyze(sample); return <><div className="section-top"><div><h2>Estilo del proyecto</h2><p>Conserva tus criterios de estilo y un fragmento representativo para este proyecto.</p><a href="/mi-voz" className="help-link">Configurar mi voz general →</a></div><Feather size={30} strokeWidth={1}/></div><form className="style-layout" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
    await api('projects/' + p.id, 'PATCH', { ...p, style: rules, sample });
    await reload();
    toast.success('Perfil de voz guardado.');
}
catch (e) {
    toast.error((e as Error).message);
}
finally {
    setBusy(false);
} }}><div className="form-stack surface"><label>Tus reglas de escritura<textarea rows={5} value={rules} onChange={e => setRules(e.target.value)} maxLength={20000} placeholder="Por ejemplo: tercera persona, frases breves, evitar adjetivos innecesarios…"/></label><label>Un fragmento que suene a ti<textarea className="style-sample" rows={12} value={sample} onChange={e => setSample(e.target.value)} maxLength={100000} placeholder="Pega un texto tuyo que quieras conservar como referencia de voz."/></label><div className="form-actions"><small>{dirty ? 'Cambios sin guardar' : 'Perfil guardado'}</small><SaveButton busy={busy}/></div></div><aside className="style-analysis"><h3>La forma de tu texto</h3><p>Mediciones del fragmento que acabas de introducir.</p><dl><div><dt>Palabras</dt><dd>{num(a.words)}</dd></div><div><dt>Párrafos</dt><dd>{num(a.paragraphs)}</dd></div><div><dt>Palabras por oración</dt><dd>{a.average}</dd></div><div><dt>Lectura estimada</dt><dd>{a.readingMinutes} min</dd></div></dl><h4>Palabras frecuentes</h4>{a.frequent.length ? <div className="word-tags">{a.frequent.map(([word, count]) => <span key={word}>{word} <b>{count}</b></span>)}</div> : <p>Añade un fragmento para comenzar.</p>}<small>Conteos aproximados. Se muestran términos de más de cuatro letras. No es una evaluación de calidad ni un perfil inferido por IA.</small></aside></form></>; }
