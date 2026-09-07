'use client';
export default function WorkspaceError({ reset }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    return <section className="empty" role="alert"><h1>No se pudo abrir esta página</h1><p>Intenta cargarla nuevamente. Si estabas editando texto en otra pestaña, consérvalo antes de cerrarla.</p><button className="btn" onClick={reset}>Intentar de nuevo</button><a className="link-button" href="/proyectos">Volver a proyectos</a></section>;
}
