'use client';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ArrowUpRight, RefreshCw, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
export const kinds: Record<string, string> = { novela: 'Novela', ensayo: 'Ensayo', academico: 'Libro académico' };
export const memoryKinds: Record<string, string> = { personaje: 'Personaje', lugar: 'Lugar', regla: 'Regla', evento: 'Evento', nota: 'Nota' };
export const num = (n: number) => new Intl.NumberFormat('es').format(n || 0);
export const date = (s: string) => new Date(s).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
export async function api(path: string, method = 'GET', body?: unknown) { const r = await fetch('/api/nova/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); const data = await r.json(); if (!r.ok)
    throw new Error(data.error || 'No se pudo completar la solicitud.'); return data; }
export function useData(path: string) { const [data, setData] = useState<any>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true); const load = useCallback(async () => { setError(''); try {
    const d = await api(path);
    setData(d);
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setLoading(false);
} }, [path]); useEffect(() => { let live = true; setLoading(true); setError(''); api(path).then(d => { if (live)
    setData(d); }).catch(e => { if (live)
    setError(e.message); }).finally(() => { if (live)
    setLoading(false); }); return () => { live = false; }; }, [path]); return { data, setData, error, loading, reload: load }; }
export function Loading() { return <div className="loading" role="status" aria-label="Cargando"><Skeleton className="h-10 w-2/3"/><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/></div>; }
export function Failure({ error, retry }: {
    error: string;
    retry: () => void;
}) { return <div className="empty error" role="alert"><h2>No pudimos cargar este espacio.</h2><p>{error}</p><button className="btn secondary" onClick={retry}><RefreshCw size={16}/>Intentar de nuevo</button></div>; }
export function Empty({ title, children }: {
    title: string;
    children: ReactNode;
}) { return <div className="empty"><BookOpen size={32} strokeWidth={1.2}/><h2>{title}</h2>{children}</div>; }
export function Modal({ open, onOpenChange, title, description, children }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
}) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="nova-dialog"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>{children}</DialogContent></Dialog>; }
export function Confirm({ open, onOpenChange, title, description, action }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    action: () => Promise<void>;
}) { const [busy, setBusy] = useState(false); return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={async (e) => { e.preventDefault(); setBusy(true); try {
    await action();
    onOpenChange(false);
}
catch (e) {
    toast.error((e as Error).message);
}
finally {
    setBusy(false);
} }}>{busy ? 'Eliminando…' : 'Eliminar definitivamente'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>; }
export function Choice({ value, onChange, items, label }: {
    value: string;
    onChange: (v: string) => void;
    items: Record<string, string>;
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger className="choice" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(items).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>; }
export function SaveButton({ busy, label = 'Guardar cambios' }: {
    busy: boolean;
    label?: string;
}) { return <button className="btn" disabled={busy}>{busy ? <><LoaderCircle size={16} className="animate-spin"/>Guardando…</> : label}</button>; }
export function PageHead({ eyebrow, title, description, action }: {
    eyebrow: string;
    title: string;
    description: string;
    action?: ReactNode;
}) { return <div className="page-head"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
export function Brand() { return <a className="brand" href="/" aria-label="NOVA, inicio"><span>n.</span>NOVA</a>; }
export function ExternalIcon() { return <ArrowUpRight size={17}/>; }
