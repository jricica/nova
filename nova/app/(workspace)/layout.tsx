import Shell from '@/components/nova/shell';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: {
    children: React.ReactNode;
}) { const user = await requireChatGPTUser('/proyectos'); return <Shell user={user}>{children}</Shell>; }
