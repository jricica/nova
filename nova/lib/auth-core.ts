import { scryptSync, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
export const SESSION_COOKIE = '__Host-nova_session';
const LIFE = 30 * 86400000;
const usernameSchema = z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9][a-z0-9._-]+$/, 'Usa de 3 a 32 letras, números, puntos o guiones.');
const passwordSchema = z.string().min(12, 'Usa al menos 12 caracteres.').max(128);
const nameSchema = z.string().trim().min(1).max(100);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('hex');
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
    // OWASP's equivalent low-memory scrypt configuration: N=2^14,r=8,p=5.
    return `scrypt-v1$${salt}$${scryptSync(password, salt, 32, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 }).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string | null) {
    const fallback = 'scrypt-v1$00000000000000000000000000000000$' + '0'.repeat(64);
    const value = stored || fallback;
    const pieces = value.split('$');
    if (pieces.length !== 3 || pieces[0] !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(pieces[1]) || !/^[a-f0-9]{64}$/.test(pieces[2]))
        return false;
    const actual = hashPassword(password, pieces[1]).split('$')[2];
    return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(pieces[2], 'hex')) && !!stored;
}
export type NovaUser = {
    id: string;
    username: string | null;
    displayName: string;
    email: string;
    fullName: string;
    hasPassword: boolean;
    chatgpt: boolean;
};
export function tokenFrom(headers: Headers) {
    const value = (headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(SESSION_COOKIE + '='))?.slice(SESSION_COOKIE.length + 1);
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export async function resolveUser(headers: Headers, db: any): Promise<NovaUser | null> {
    const token = tokenFrom(headers);
    if (!token || !db)
        return null;
    const u = await db.prepare('SELECT u.* FROM auth_sessions s JOIN auth_users u ON u.id=s.user WHERE s.token=? AND s.expires>?').bind(digest(token), Date.now()).first();
    return u ? { id: u.id, username: u.username, displayName: u.name, fullName: u.name, email: u.email, hasPassword: !!u.password, chatgpt: !!u.chatgpt } : null;
}
const cookie = (value: string, age = LIFE / 1000) => `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const reply = (data: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
class AuthError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
function sameOrigin(req: Request) { if (req.headers.get('origin') !== new URL(req.url).origin)
    throw new AuthError(403, 'Solicitud no permitida.'); }
async function readBody(req: Request) {
    if (!req.headers.get('content-type')?.includes('application/json'))
        throw new AuthError(415, 'Se requiere JSON.');
    const reader = req.body?.getReader();
    if (!reader)
        throw new AuthError(400, 'Faltan los datos.');
    let bytes = 0, raw = '';
    const dec = new TextDecoder();
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        bytes += value.byteLength;
        if (bytes > 8192) {
            await reader.cancel();
            throw new AuthError(413, 'Solicitud demasiado grande.');
        }
        raw += dec.decode(value, { stream: true });
    }
    raw += dec.decode();
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new AuthError(400, 'Datos inválidos.');
    }
}
async function rate(db: any, key: string, max: number, windowMs: number) {
    const now = Date.now(), bucket = Math.floor(now / windowMs), k = digest(key) + ':' + bucket;
    const r = await db.prepare('INSERT INTO auth_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(k, (bucket + 1) * windowMs).first();
    if (r.count > max)
        throw new AuthError(429, 'Demasiados intentos. Espera unos minutos antes de volver a intentar.');
}
async function session(db: any, uid: string, expectedPassword?: string) {
    const token = secret(), stamp = Date.now();
    const results = await db.batch([
        db.prepare('DELETE FROM auth_sessions WHERE expires<?').bind(stamp),
        db.prepare('DELETE FROM auth_sessions WHERE user=? AND token NOT IN (SELECT token FROM auth_sessions WHERE user=? ORDER BY created DESC LIMIT 9)').bind(uid, uid),
        expectedPassword === undefined ? db.prepare('INSERT INTO auth_sessions(token,user,expires,created) VALUES(?,?,?,?)').bind(digest(token), uid, stamp + LIFE, stamp) : db.prepare('INSERT INTO auth_sessions(token,user,expires,created) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM auth_users WHERE id=? AND password=?)').bind(digest(token), uid, stamp + LIFE, stamp, uid, expectedPassword),
    ]);
    if (!results[2].meta.changes)
        throw new AuthError(409, 'La contraseña cambió. Vuelve a iniciar sesión.');
    return cookie(token);
}
export async function handleAuth(req: Request, db: any) {
    try {
        if (!db)
            throw new AuthError(503, 'El acceso está temporalmente indisponible.');
        const route = new URL(req.url).pathname.split('/').filter(Boolean).at(-1), method = req.method;
        if (method === 'GET' && route === 'me')
            return reply({ user: await resolveUser(req.headers, db), capabilities: { chatgpt: new URL(req.url).hostname.endsWith('.chatgpt.site') } });
        // SIWC owns provider authentication. This route only creates a NOVA session;
        // it never links accounts by email or changes ownership of existing records.
        const trustedSite = new URL(req.url).hostname.endsWith('.chatgpt.site');
        if ((route === 'chatgpt' || route === 'start-chatgpt') && !trustedSite)
            throw new AuthError(403, 'El acceso con ChatGPT solo está habilitado en el alojamiento de Sites. Usa tu cuenta de NOVA.');
        if (method === 'GET' && route === 'chatgpt') {
            const providerId = req.headers.get('oai-authenticated-user-id');
            if (!providerId)
                return Response.redirect(new URL('/login', req.url), 303);
            const nonce = (req.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-nova_oauth=([a-f0-9]{64})(?:;|$)/)?.[1];
            if (!nonce)
                throw new AuthError(403, 'Inicia el acceso con ChatGPT desde NOVA.');
            const used = await db.prepare('DELETE FROM auth_limits WHERE key=? AND expires>? RETURNING key').bind('oauth:' + digest(nonce), Date.now()).first();
            if (!used)
                throw new AuthError(403, 'El intento de acceso venció. Vuelve a iniciar sesión.');
            let name = req.headers.get('oai-authenticated-user-email')?.split('@')[0] || 'Autor';
            if (req.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
                try {
                    name = decodeURIComponent(req.headers.get('oai-authenticated-user-full-name') || '') || name;
                }
                catch { }
            }
            await db.prepare('INSERT OR IGNORE INTO auth_users(id,name,email,chatgpt,created) VALUES(?,?,?,?,?)').bind(providerId, name.slice(0, 100), req.headers.get('oai-authenticated-user-email') || '', providerId, Date.now()).run();
            const mapped = await db.prepare('SELECT id FROM auth_users WHERE chatgpt=?').bind(providerId).first();
            if (!mapped)
                throw new AuthError(409, 'No se pudo asociar la identidad.');
            const headers = new Headers({ 'Location': '/inicio', 'Cache-Control': 'no-store' });
            headers.append('Set-Cookie', await session(db, mapped.id));
            headers.append('Set-Cookie', '__Host-nova_oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
            return new Response(null, { status: 303, headers });
        }
        if (method !== 'POST')
            throw new AuthError(404, 'Ruta no encontrada.');
        sameOrigin(req);
        if (route === 'logout') {
            const token = tokenFrom(req.headers);
            if (token)
                await db.prepare('DELETE FROM auth_sessions WHERE token=?').bind(digest(token)).run();
            return reply({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
        }
        if (route === 'logout-all') {
            const user = await resolveUser(req.headers, db);
            if (!user)
                throw new AuthError(401, 'Inicia sesión para continuar.');
            await db.prepare('DELETE FROM auth_sessions WHERE user=?').bind(user.id).run();
            return reply({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
        }
        const ip = req.headers.get('cf-connecting-ip') || 'unknown';
        await rate(db, 'global', 300, 900000);
        await rate(db, 'ip:' + ip, 40, 900000);
        await db.prepare('DELETE FROM auth_limits WHERE expires<?').bind(Date.now() - 86400000).run();
        if (route === 'start-chatgpt') {
            const nonce = secret();
            await db.prepare('INSERT INTO auth_limits(key,count,expires) VALUES(?,0,?)').bind('oauth:' + digest(nonce), Date.now() + 600000).run();
            return reply({ url: '/signin-with-chatgpt?return_to=%2Fauth%2Fchatgpt' }, 200, { 'Set-Cookie': `__Host-nova_oauth=${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600` });
        }
        const b = await readBody(req);
        if (route === 'signup') {
            const d = z.object({ username: usernameSchema, password: passwordSchema, name: nameSchema }).parse(b);
            await rate(db, 'signup:' + ip, 5, 3600000);
            const uid = 'nova_' + crypto.randomUUID(), recovery = secret(), stamp = Date.now(), password = hashPassword(d.password);
            const created = await db.prepare('INSERT OR IGNORE INTO auth_users(id,username,password,name,recovery,created) VALUES(?,?,?,?,?,?)').bind(uid, d.username, password, d.name, digest(recovery), stamp).run();
            if (!created.meta.changes)
                throw new AuthError(409, 'Ese usuario no está disponible. Elige otro o inicia sesión.');
            return reply({ ok: true, recoveryCode: recovery }, 201, { 'Set-Cookie': await session(db, uid) });
        }
        if (route === 'login') {
            const d = z.object({ username: usernameSchema, password: z.string().min(1).max(128) }).parse(b);
            await rate(db, 'login:' + d.username, 10, 900000);
            const u = await db.prepare('SELECT id,password FROM auth_users WHERE username=?').bind(d.username).first();
            if (!verifyPassword(d.password, u?.password || null))
                throw new AuthError(401, 'Usuario o contraseña incorrectos.');
            return reply({ ok: true }, 200, { 'Set-Cookie': await session(db, u.id, u.password) });
        }
        if (route === 'recover') {
            const d = z.object({ username: usernameSchema, recoveryCode: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema }).parse(b);
            await rate(db, 'recover:' + d.username, 5, 900000);
            const u = await db.prepare('SELECT id FROM auth_users WHERE username=? AND recovery=?').bind(d.username, digest(d.recoveryCode)).first();
            if (!u)
                throw new AuthError(401, 'No se pudo recuperar la cuenta con esos datos.');
            const recovery = secret(), password = hashPassword(d.password);
            const changed = await db.prepare('UPDATE auth_users SET password=?,recovery=? WHERE id=? AND recovery=? RETURNING id').bind(password, digest(recovery), u.id, digest(d.recoveryCode)).first();
            if (!changed)
                throw new AuthError(409, 'El código ya fue utilizado.');
            await db.prepare('DELETE FROM auth_sessions WHERE user=?').bind(u.id).run();
            return reply({ ok: true, recoveryCode: recovery }, 200, { 'Set-Cookie': await session(db, u.id, password) });
        }
        if (route === 'credentials') {
            const user = await resolveUser(req.headers, db);
            if (!user)
                throw new AuthError(401, 'Inicia sesión para continuar.');
            const d = z.object({ username: usernameSchema, password: passwordSchema, currentPassword: z.string().max(128).default('') }).parse(b);
            await rate(db, 'credentials:' + user.id, 5, 900000);
            const current = await db.prepare('SELECT password FROM auth_users WHERE id=?').bind(user.id).first();
            if (current.password) {
                if (!verifyPassword(d.currentPassword, current.password))
                    throw new AuthError(401, 'Tu contraseña actual es incorrecta.');
            }
            else if (req.headers.get('oai-authenticated-user-id') !== user.id)
                throw new AuthError(403, 'Vuelve a entrar con ChatGPT antes de configurar tu contraseña.');
            const exists = await db.prepare('SELECT id FROM auth_users WHERE username=? AND id<>?').bind(d.username, user.id).first();
            if (exists)
                throw new AuthError(409, 'Ese usuario no está disponible.');
            const recovery = secret(), password = hashPassword(d.password);
            try {
                const result = await db.prepare('UPDATE auth_users SET username=?,password=?,recovery=? WHERE id=? AND password IS ?').bind(d.username, password, digest(recovery), user.id, current.password).run();
                if (!result.meta.changes)
                    throw new AuthError(409, 'La cuenta cambió en otra ventana. Recarga e intenta de nuevo.');
            }
            catch (e) {
                if (e instanceof AuthError)
                    throw e;
                throw new AuthError(409, 'No se pudo actualizar. Comprueba el usuario e inténtalo de nuevo.');
            }
            await db.prepare('DELETE FROM auth_sessions WHERE user=?').bind(user.id).run();
            return reply({ ok: true, recoveryCode: recovery }, 200, { 'Set-Cookie': await session(db, user.id, password) });
        }
        throw new AuthError(404, 'Ruta no encontrada.');
    }
    catch (e) {
        if (e instanceof AuthError)
            return reply({ error: e.message }, e.status);
        if (e instanceof z.ZodError)
            return reply({ error: e.issues[0]?.message || 'Revisa tus datos.' }, 400);
        console.error('NOVA authentication unavailable');
        return reply({ error: 'No se pudo completar el acceso. Intenta nuevamente.' }, 500);
    }
}
