import { z } from 'zod';
import { writingProvider } from './ai-provider';
import { wordCount, normalize, splitText } from './text';
type Services = {
    DB: any;
    BUCKET: any;
};
class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
const title = z.string().trim().min(1, 'Escribe un título.').max(160);
const projectSchema = z.object({ title, kind: z.enum(['novela', 'ensayo', 'academico']), description: z.string().max(5000).default(''), goal: z.number().int().min(1).max(2000000).default(50000) });
const chapterSchema = z.object({ title, content: z.string().max(300000), version: z.number().int().positive() });
const sourceSchema = z.object({ title, author: z.string().max(300).default(''), url: z.string().max(2000).refine(x => !x || /^https?:\/\//i.test(x), 'Utiliza un enlace http o https.').default(''), content: z.string().trim().min(1).max(500000), filename: z.string().max(180).default('fuente.txt') });
const memorySchema = z.object({ kind: z.enum(['personaje', 'lugar', 'regla', 'evento', 'nota']), title, content: z.string().trim().min(1).max(20000), date: z.string().max(100).default('') });
const json = (x: unknown, status = 200) => Response.json(x, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
async function body(req: Request) { if (!req.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(415, 'Se requiere JSON.'); if (Number(req.headers.get('content-length') || 0) > 2200000)
    throw new ApiError(413, 'El contenido supera el límite permitido.'); const reader = req.body?.getReader(); if (!reader)
    throw new ApiError(400, 'Falta el contenido de la solicitud.'); let total = 0; const decoder = new TextDecoder(); let raw = ''; for (;;) {
    const part = await reader.read();
    if (part.done)
        break;
    total += part.value.byteLength;
    if (total > 2200000) {
        await reader.cancel();
        throw new ApiError(413, 'El contenido supera el límite permitido.');
    }
    raw += decoder.decode(part.value, { stream: true });
} raw += decoder.decode(); try {
    return JSON.parse(raw);
}
catch {
    throw new ApiError(400, 'JSON no válido.');
} }
export async function handleApi(req: Request, services: Services) {
    try {
        const user = req.headers.get('oai-authenticated-user-id');
        if (!user)
            throw new ApiError(401, 'Inicia sesión con ChatGPT para acceder a tu espacio.');
        const url = new URL(req.url), method = req.method;
        if (!['GET', 'HEAD'].includes(method)) {
            const origin = req.headers.get('origin');
            if (!origin || origin !== url.origin)
                throw new ApiError(403, 'Origen de solicitud no permitido.');
        }
        const parts = url.pathname.replace(/^\/api\/nova\/?/, '').split('/').filter(Boolean);
        const db = services.DB;
        if (!db || !services.BUCKET)
            throw new ApiError(503, 'El almacenamiento no está disponible. Intenta nuevamente.');
        const q = (sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args);
        const all = async (sql: string, ...args: unknown[]) => ((await q(sql, ...args).all()).results || []);
        async function project(pid: string) { const p = await q('SELECT * FROM projects WHERE id=? AND owner=?', pid, user).first(); if (!p)
            throw new ApiError(404, 'Proyecto no encontrado.'); return p; }
        async function chapter(pid: string, cid: string) { await project(pid); const c = await q('SELECT * FROM chapters WHERE id=? AND project=?', cid, pid).first(); if (!c)
            throw new ApiError(404, 'Capítulo no encontrado.'); return c; }
        if (parts[0] === 'status' && method === 'GET')
            return json({ storage: true, ai: { available: writingProvider.available, reason: writingProvider.available ? 'Proveedor conectado' : 'Proveedor pendiente de integración' }, user: { email: req.headers.get('oai-authenticated-user-email') || '' } });
        if (parts[0] === 'stats' && method === 'GET') {
            const [projects, chapters, sources, memories, activity] = await Promise.all([
                all('SELECT p.id,p.title,p.kind,p.goal,p.archived,COALESCE((SELECT SUM(words) FROM chapters WHERE project=p.id),0) words,(SELECT COUNT(*) FROM chapters WHERE project=p.id) chapters FROM projects p WHERE owner=? ORDER BY updated DESC', user),
                q('SELECT COUNT(*) count,COALESCE(SUM(c.words),0) words FROM chapters c JOIN projects p ON p.id=c.project WHERE p.owner=?', user).first(),
                q('SELECT COUNT(*) count,COALESCE(SUM(s.bytes),0) bytes FROM sources s JOIN projects p ON p.id=s.project WHERE p.owner=?', user).first(),
                q('SELECT COUNT(*) count FROM memories m JOIN projects p ON p.id=m.project WHERE p.owner=?', user).first(),
                all("SELECT substr(r.created,1,10) day,COUNT(*) saves FROM revisions r JOIN chapters c ON c.id=r.chapter JOIN projects p ON p.id=c.project WHERE p.owner=? AND r.created>=? GROUP BY day ORDER BY day", user, new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
            ]);
            return json({ projects, chapters: chapters.count, words: chapters.words, sources: sources.count, bytes: sources.bytes, memories: memories.count, activity, aiRequests: 0 });
        }
        if (parts[0] !== 'projects')
            throw new ApiError(404, 'Ruta no encontrada.');
        if (parts.length === 1) {
            if (method === 'GET')
                return json(await all('SELECT p.*,COALESCE((SELECT SUM(words) FROM chapters WHERE project=p.id),0) words,(SELECT COUNT(*) FROM chapters WHERE project=p.id) chapters,(SELECT COUNT(*) FROM sources WHERE project=p.id) sources FROM projects p WHERE owner=? ORDER BY updated DESC', user));
            if (method === 'POST') {
                const total = await q('SELECT COUNT(*) n FROM projects WHERE owner=?', user).first();
                if (total.n >= 100)
                    throw new ApiError(400, 'El espacio admite hasta 100 proyectos.');
                const b = projectSchema.parse(await body(req)), pid = id(), stamp = now();
                await q('INSERT INTO projects(id,owner,title,kind,description,goal,created,updated) VALUES(?,?,?,?,?,?,?,?)', pid, user, b.title, b.kind, b.description, b.goal, stamp, stamp).run();
                return json(await project(pid), 201);
            }
        }
        const pid = parts[1];
        const p = await project(pid);
        if (parts.length === 2) {
            if (method === 'GET') {
                const [chapters, sources, memories] = await Promise.all([all('SELECT id,title,position,version,words,updated FROM chapters WHERE project=? ORDER BY position', pid), all('SELECT * FROM sources WHERE project=? ORDER BY created DESC', pid), all('SELECT * FROM memories WHERE project=? ORDER BY date,title', pid)]);
                return json({ ...p, chapters, sources: sources.map(({ object_key, ...s }: any) => s), memories });
            }
            if (method === 'PATCH') {
                const b = projectSchema.extend({ style: z.string().max(20000).default(''), sample: z.string().max(100000).default(''), archived: z.number().int().min(0).max(1).default(0) }).parse(await body(req));
                await q('UPDATE projects SET title=?,kind=?,description=?,goal=?,style=?,sample=?,archived=?,updated=? WHERE id=? AND owner=?', b.title, b.kind, b.description, b.goal, b.style, b.sample, b.archived, now(), pid, user).run();
                return json(await project(pid));
            }
            if (method === 'DELETE') {
                const objects = await all('SELECT object_key FROM sources WHERE project=?', pid);
                await q('DELETE FROM projects WHERE id=? AND owner=?', pid, user).run();
                try {
                    for (const o of objects)
                        await services.BUCKET.delete(o.object_key);
                }
                catch {
                    console.error('NOVA: R2 cleanup failed after project deletion');
                }
                return json({ ok: true });
            }
        }
        const section = parts[2], item = parts[3];
        if (section === 'chapters') {
            if (!item && method === 'POST') {
                const count = await q('SELECT COUNT(*) n FROM chapters WHERE project=?', pid).first();
                if (count.n >= 300)
                    throw new ApiError(400, 'El proyecto admite hasta 300 capítulos.');
                const b = z.object({ title }).parse(await body(req)), cid = id(), stamp = now();
                await q('INSERT INTO chapters(id,project,title,position,updated) VALUES(?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM chapters WHERE project=?),?)', cid, pid, b.title, pid, stamp).run();
                return json(await chapter(pid, cid), 201);
            }
            const c = await chapter(pid, item);
            if (parts[4] === 'revisions' && method === 'GET')
                return json(await all('SELECT * FROM revisions WHERE chapter=? ORDER BY version DESC LIMIT 40', item));
            if (method === 'GET')
                return json(c);
            if (method === 'PUT') {
                const b = chapterSchema.parse(await body(req));
                const total = await q('SELECT COALESCE(SUM(length(content)),0) n FROM chapters WHERE project=? AND id<>?', pid, item).first();
                if (total.n + b.content.length > 5000000)
                    throw new ApiError(413, 'El manuscrito supera el límite de 5 millones de caracteres.');
                if (b.version !== c.version)
                    throw new ApiError(409, 'Este capítulo cambió en otra ventana. Copia tu texto y recarga antes de guardar.');
                const stamp = now(), version = b.version + 1;
                const results = await db.batch([q('UPDATE chapters SET title=?,content=?,words=?,version=version+1,updated=? WHERE id=? AND project=? AND version=?', b.title, b.content, wordCount(b.content), stamp, item, pid, b.version), q('INSERT OR IGNORE INTO revisions(id,chapter,title,content,version,words,created) SELECT ?,id,title,content,version,words,updated FROM chapters WHERE id=? AND version=?', id(), item, version), q('UPDATE projects SET updated=? WHERE id=? AND owner=?', stamp, pid, user)]);
                if (!results[0].meta.changes)
                    throw new ApiError(409, 'Se detectó otro guardado. Copia tu texto y recarga.');
                return json(await chapter(pid, item));
            }
            if (method === 'DELETE') {
                await q('DELETE FROM chapters WHERE id=? AND project=?', item, pid).run();
                return json({ ok: true });
            }
        }
        if (section === 'sources') {
            if (!item && method === 'POST') {
                const b = sourceSchema.parse(await body(req));
                const count = await q('SELECT COUNT(*) n FROM sources WHERE project=?', pid).first();
                if (count.n >= 100)
                    throw new ApiError(400, 'El proyecto admite hasta 100 fuentes.');
                const total = await q('SELECT COALESCE(SUM(bytes),0) n FROM sources WHERE project=?', pid).first();
                if (total.n + new TextEncoder().encode(b.content).length > 10000000)
                    throw new ApiError(413, 'El proyecto admite hasta 10 MB de texto en fuentes.');
                const sid = id(), key = `${user}/${pid}/${sid}.txt`, content = b.content.replace(/\r\n/g, '\n'), bits = splitText(content);
                if (bits.length > 350)
                    throw new ApiError(413, 'Reduce el tamaño de la fuente.');
                await services.BUCKET.put(key, content, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
                try {
                    await db.batch([q('INSERT INTO sources(id,project,title,author,url,object_key,filename,bytes,created) VALUES(?,?,?,?,?,?,?,?,?)', sid, pid, b.title, b.author, b.url, key, b.filename, new TextEncoder().encode(content).length, now()), ...bits.map((s, i) => q('INSERT INTO chunks(id,source,position,content,search) VALUES(?,?,?,?,?)', id(), sid, i + 1, s, normalize(s)))]);
                }
                catch (e) {
                    await services.BUCKET.delete(key);
                    throw e;
                }
                return json({ id: sid, chunks: bits.length }, 201);
            }
            const s = await q('SELECT * FROM sources WHERE id=? AND project=?', item, pid).first();
            if (!s)
                throw new ApiError(404, 'Fuente no encontrada.');
            if (method === 'GET') {
                const object = await services.BUCKET.get(s.object_key);
                if (!object)
                    throw new ApiError(503, 'El archivo no está disponible.');
                const content = await object.text();
                return json({ ...s, object_key: undefined, content });
            }
            if (method === 'DELETE') {
                await q('DELETE FROM sources WHERE id=? AND project=?', item, pid).run();
                try {
                    await services.BUCKET.delete(s.object_key);
                }
                catch {
                    console.error('NOVA: source cleanup failed');
                }
                return json({ ok: true });
            }
        }
        if (section === 'search' && method === 'GET') {
            const query = (url.searchParams.get('q') || '').trim();
            if (query.length < 2 || query.length > 400)
                throw new ApiError(400, 'Busca entre 2 y 400 caracteres.');
            const stop = new Set(['para', 'como', 'desde', 'entre', 'esta', 'este', 'esto', 'sobre', 'que', 'los', 'las', 'una', 'del', 'con', 'por', 'the', 'and']);
            const terms = [...new Set((normalize(query).match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length > 2 && !stop.has(t)))].slice(0, 8);
            if (!terms.length)
                return json({ results: [], method: 'lexical' });
            const rows = await all(`SELECT c.content,c.position,s.title,s.id source,s.author,s.url,(${terms.map(() => '(CASE WHEN instr(c.search,?)>0 THEN 1 ELSE 0 END)').join('+')}) score FROM chunks c JOIN sources s ON s.id=c.source WHERE s.project=? AND (${terms.map(() => 'instr(c.search,?)>0').join(' OR ')}) ORDER BY score DESC,c.position ASC LIMIT 12`, ...terms, pid, ...terms);
            return json({ results: rows, method: 'lexical' });
        }
        if (section === 'memory') {
            if (!item && method === 'POST') {
                const total = await q('SELECT COUNT(*) n FROM memories WHERE project=?', pid).first();
                if (total.n >= 500)
                    throw new ApiError(400, 'El proyecto admite hasta 500 entradas de memoria.');
                const b = memorySchema.parse(await body(req)), mid = id();
                await q('INSERT INTO memories(id,project,kind,title,content,date,updated) VALUES(?,?,?,?,?,?,?)', mid, pid, b.kind, b.title, b.content, b.date, now()).run();
                return json({ id: mid }, 201);
            }
            const m = await q('SELECT * FROM memories WHERE id=? AND project=?', item, pid).first();
            if (!m)
                throw new ApiError(404, 'Entrada no encontrada.');
            if (method === 'PUT') {
                const b = memorySchema.parse(await body(req));
                await q('UPDATE memories SET kind=?,title=?,content=?,date=?,updated=? WHERE id=? AND project=?', b.kind, b.title, b.content, b.date, now(), item, pid).run();
                return json({ ok: true });
            }
            if (method === 'DELETE') {
                await q('DELETE FROM memories WHERE id=? AND project=?', item, pid).run();
                return json({ ok: true });
            }
        }
        if (section === 'export' && method === 'GET') {
            const [chapters, memories, sourceRows] = await Promise.all([all('SELECT * FROM chapters WHERE project=? ORDER BY position', pid), all('SELECT * FROM memories WHERE project=? ORDER BY date,title', pid), all('SELECT * FROM sources WHERE project=? ORDER BY created', pid)]);
            const format = url.searchParams.get('format') || 'md';
            if (format === 'json') {
                const sources = [];
                for (const s of sourceRows) {
                    const file = await services.BUCKET.get(s.object_key);
                    if (!file)
                        throw new ApiError(503, 'Una fuente no está disponible; vuelve a exportar después.');
                    sources.push({ ...s, object_key: undefined, content: await file.text() });
                }
                return json({ schemaVersion: 1, exportedAt: now(), project: { ...p, owner: undefined }, chapters, memories, sources });
            }
            return new Response(`# ${p.title}\n\n${p.description}\n\n${chapters.map((c: any) => `## ${c.title}\n\n${c.content}`).join('\n\n---\n\n')}`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="manuscrito.md"' } });
        }
        if ((section === 'context' || section === 'ai') && method === 'POST') {
            const input = z.object({ chapterId: z.string().uuid(), action: z.enum(['continue', 'rewrite', 'verify']), instruction: z.string().trim().min(1).max(2000) }).parse(await body(req));
            const ch = await chapter(pid, input.chapterId);
            if (section === 'ai' && !writingProvider.available)
                return json({ error: 'La generación con IA está pendiente de integración. Tu manuscrito y tus fuentes permanecen disponibles.', code: 'AI_NOT_CONFIGURED' }, 503);
            const terms = [...new Set((normalize(input.instruction).match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length > 3))].slice(0, 8);
            const [memory, passages] = await Promise.all([
                all('SELECT id,kind,title,content,date FROM memories WHERE project=? ORDER BY updated DESC LIMIT 30', pid),
                terms.length ? all(`SELECT s.id sourceId,s.title,s.author,s.url,c.position,c.content FROM chunks c JOIN sources s ON s.id=c.source WHERE s.project=? AND (${terms.map(() => 'instr(c.search,?)>0').join(' OR ')}) ORDER BY c.position LIMIT 8`, pid, ...terms) : Promise.resolve([])
            ]);
            const context = { action: input.action, instruction: input.instruction, manuscript: { id: ch.id, title: ch.title, content: ch.content.slice(-30000), version: ch.version }, project: { title: p.title, kind: p.kind, description: p.description }, style: { rules: p.style, sample: p.sample.slice(0, 12000) }, memory, passages };
            if (section === 'context')
                return json({ context, limits: { manuscriptCharacters: 30000, styleSampleCharacters: 12000, memoryEntries: 30, passages: 8 }, retrieval: 'lexical' });
            return json({ proposal: await writingProvider.generate(context), basedOnVersion: ch.version });
        }
        throw new ApiError(405, 'Operación no disponible.');
    }
    catch (e) {
        if (e instanceof z.ZodError)
            return json({ error: e.issues.map(x => x.message).join(' ') }, 400);
        if (e instanceof ApiError)
            return json({ error: e.message }, e.status);
        console.error('NOVA API error', e instanceof Error ? e.message : 'unknown');
        return json({ error: 'No se pudo completar la operación. Tu texto permanece en el editor; intenta guardar nuevamente.' }, 500);
    }
}
