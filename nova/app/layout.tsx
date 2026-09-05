import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
export const metadata: Metadata = { title: 'NOVA — Tu obra. Tus fuentes. Tu voz.', description: 'Un espacio privado para escribir novelas, ensayos y libros académicos. Organiza tus manuscritos, guarda fuentes y conserva cada versión.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="es"><body>{children}<Toaster richColors theme="light" position="bottom-right"/></body></html>; }
