import Project from '@/components/nova/project';
import { notFound } from 'next/navigation';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
        section: string;
    }>;
}) { const { id, section } = await params; if (!['fuentes', 'memoria', 'estilo', 'configuracion'].includes(section))
    notFound(); return <Project id={id} section={section}/>; }
