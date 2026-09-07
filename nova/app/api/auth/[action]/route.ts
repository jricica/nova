import { env } from 'cloudflare:workers';
import { handleAuth } from '@/lib/auth-core';
export const dynamic='force-dynamic';
const handler=(request:Request)=>handleAuth(request,(env as any).DB);
export {handler as GET,handler as POST};
