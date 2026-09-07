'use client';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Library, Network, Feather, Settings2, Download } from 'lucide-react';
import { useData, Loading, Failure, kinds, num } from './ui';
import Editor from './editor';
import { ProjectVoice } from './pilot';
import Sources from './sources';
import Memory from './memory';
import Style from './style';
import ProjectSettings from './project-settings';
export default function Project({ id, section = 'editor' }: {
    id: string;
    section?: string;
}) { const { data: p, error, loading, reload, setData } = useData('projects/' + id); if (loading)
    return <Loading />; if (error)
    return <Failure error={error} retry={reload}/>; const base = '/proyectos/' + id; return <><div className="project-heading"><a className="back-link" href="/proyectos"><ArrowLeft size={15}/>Mis proyectos</a><div><div><p className="eyebrow">{kinds[p.kind]}{p.archived ? ' · ARCHIVADO' : ''}</p><h1>{p.title}</h1></div><a className="btn secondary" href={'/api/nova/projects/' + id + '/export'} download><Download size={16}/>Exportar manuscrito</a></div></div><nav className="project-nav" aria-label="Páginas del proyecto">{[['editor', 'Manuscrito', BookOpen], ['fuentes', 'Fuentes', Library], ['memoria', 'Memoria', Network], ['estilo', 'Mi voz', Feather], ['configuracion', 'Proyecto', Settings2]].map(([key, label, Icon]: any) => <a key={key} className={section === key ? 'active' : ''} href={base + (key === 'editor' ? '' : '/' + key)} aria-current={section === key ? 'page' : undefined}><Icon size={16}/>{label}{key === 'fuentes' ? <span>{p.sources.length}</span> : null}</a>)}</nav><ProjectVoice id={id}/>{section === 'editor' ? <Editor project={p} reload={reload}/> : section === 'fuentes' ? <Sources project={p} reload={reload}/> : section === 'memoria' ? <Memory project={p} reload={reload}/> : section === 'estilo' ? <Style project={p} reload={reload}/> : <ProjectSettings project={p} reload={reload}/>}</>; }
