'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { BookOpen, BarChart3, Settings2, Feather, UserRound, CircleHelp, LogOut, ChevronDown, ChevronRight, Library, WifiOff, House, MessageSquare } from 'lucide-react';
import { Brand } from './ui';
import { AccountProvider, useAccount } from './account-context';
import { initials } from '@/lib/account';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
const workspaceLinks = [{ href: '/inicio', label: 'Inicio', Icon: House }, { href: '/proyectos', label: 'Proyectos', Icon: BookOpen }, { href: '/mi-voz', label: 'Mi voz', Icon: Feather }, { href: '/mi-memoria', label: 'Mi memoria', Icon: Library }, { href: '/estadisticas', label: 'Estadísticas', Icon: BarChart3 }];
const accountLinks = [{ href: '/perfil', label: 'Perfil', Icon: UserRound }, { href: '/ajustes', label: 'Configuración', Icon: Settings2 }, { href: '/ayuda', label: 'Ayuda', Icon: CircleHelp }, { href: '/feedback', label: 'Feedback del piloto', Icon: MessageSquare }];
export default function Shell({ children, user }: {
    children: ReactNode;
    user: ChatGPTUser;
}) {
    return <AccountProvider session={user}><WorkspaceShell>{children}</WorkspaceShell></AccountProvider>;
}
function WorkspaceShell({ children }: {
    children: ReactNode;
}) {
    const path = usePathname(), { name, session, preferences, error, reload } = useAccount();
    const [offline, setOffline] = useState(false);
    useEffect(() => { const update = () => setOffline(!navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
    const current = [...workspaceLinks, ...accountLinks].find(x => path === x.href || path.startsWith(x.href + '/'));
    const group = accountLinks.some(x => x.href === current?.href) ? 'Cuenta' : 'Espacio de trabajo';
    const section = path.startsWith('/proyectos/') ? (({ fuentes: 'Fuentes', memoria: 'Memoria', estilo: 'Estilo', configuracion: 'Configuración' } as Record<string, string>)[path.split('/')[3]] || 'Manuscrito') : '';
    return <SidebarProvider className="professional-workspace" style={{ '--sidebar-width': '15rem' } as React.CSSProperties}>
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <Sidebar className="nova-sidebar"><SidebarHeader><Brand /></SidebarHeader><SidebarContent>{[[workspaceLinks, 'ESPACIO DE TRABAJO'], [accountLinks, 'CUENTA']].map(([links, label]) => <SidebarGroup key={label as string}><SidebarGroupLabel>{label as string}</SidebarGroupLabel><SidebarMenu>{(links as typeof workspaceLinks).map(({ href, label, Icon }) => <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={path === href || path.startsWith(href + '/')}><a href={href} aria-current={path === href || path.startsWith(href + '/') ? 'page' : undefined}><Icon /><span>{label}</span></a></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup>)}</SidebarContent><SidebarFooter><a className="sidebar-account" href="/perfil"><span className="user-avatar" aria-hidden="true">{initials(name)}</span><span><strong>{name}</strong><small>Cuenta de ChatGPT</small></span></a><a className="sidebar-logout" href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut size={16}/>Cerrar sesión</a></SidebarFooter></Sidebar>
    <SidebarInset><header className="workspace-top"><div><SidebarTrigger aria-label="Abrir o cerrar navegación"/><nav className="workspace-breadcrumb" aria-label="Ruta actual"><span>{group}</span><ChevronRight size={14}/>{section ? <><a href="/proyectos">Proyectos</a><ChevronRight size={14}/><strong>{section}</strong></> : <strong>{current?.label || 'NOVA'}</strong>}</nav></div><DropdownMenu><DropdownMenuTrigger asChild><button className="user-menu-trigger" aria-label={`Abrir menú de ${name}`}><span className="user-avatar" aria-hidden="true">{initials(name)}</span><ChevronDown size={16}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="account-dropdown"><DropdownMenuLabel><strong>{name}</strong><span>{session.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><a href="/perfil"><UserRound />Mi perfil</a></DropdownMenuItem><DropdownMenuItem asChild><a href="/ajustes"><Settings2 />Configuración</a></DropdownMenuItem><DropdownMenuItem asChild><a href="/ayuda"><CircleHelp />Centro de ayuda</a></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem asChild><a href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut />Cerrar sesión</a></DropdownMenuItem></DropdownMenuContent></DropdownMenu></header>
    {offline && <div className="connection-notice" role="status"><WifiOff size={18}/><p>Sin conexión. Conserva esta página abierta y vuelve a guardar cuando recuperes la conexión.</p></div>}
    {error && <div className="connection-notice" role="alert"><p>No se pudieron cargar tus preferencias de cuenta.</p><button onClick={() => void reload()}>Reintentar</button></div>}
    <main id="contenido" tabIndex={-1} className={`workspace-main editor-font-${preferences.typography} editor-size-${preferences.textSize}`}>{children}</main><footer className="workspace-footer"><span>NOVA · Espacio de escritura</span><a href="/ayuda">Ayuda</a><a href="/confianza">Fuentes y datos</a></footer></SidebarInset>
  </SidebarProvider>;
}
