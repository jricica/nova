import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { resolveUser } from './auth-core';
export async function getNovaUser() { return resolveUser(new Headers(await headers()), (env as any).DB); }
export async function requireNovaUser() { const user = await getNovaUser(); if (!user)
    redirect('/login'); return user; }
