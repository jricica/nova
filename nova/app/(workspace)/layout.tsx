import Shell from '@/components/nova/shell';
import { requireNovaUser } from '@/lib/auth-server';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: {
    children: React.ReactNode;
}) { const user = await requireNovaUser(); return <Shell user={user}>{children}</Shell>; }
