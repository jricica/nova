import { env } from 'cloudflare:workers';
import { handleApi } from '@/lib/api-core';
export const dynamic = 'force-dynamic';
const handler = (request: Request) => handleApi(request, env as any);
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
