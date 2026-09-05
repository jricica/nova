import Project from '@/components/nova/project';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; return <Project id={id}/>; }
