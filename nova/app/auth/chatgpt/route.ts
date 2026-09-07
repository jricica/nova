import { env } from 'cloudflare:workers';
import { handleAuth } from '@/lib/auth-core';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    const result = await handleAuth(request, (env as any).DB);
    if (result.status >= 400) return new Response(null, { status: 303, headers: { Location: '/login?error=chatgpt', 'Cache-Control': 'no-store' } });
    return result;
}
