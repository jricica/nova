// Structural types for the subset of Sites Worker bindings used by NOVA.
interface D1Result<T=Record<string,unknown>>{results:T[];success:boolean;meta:{changes:number;last_row_id:number;duration:number}}
interface D1PreparedStatement{bind(...values:unknown[]):D1PreparedStatement;first<T=Record<string,unknown>>():Promise<T|null>;all<T=Record<string,unknown>>():Promise<D1Result<T>>;run<T=Record<string,unknown>>():Promise<D1Result<T>>;raw<T=unknown[]>():Promise<T[]>}
interface D1Database{prepare(sql:string):D1PreparedStatement;batch<T=Record<string,unknown>>(statements:D1PreparedStatement[]):Promise<D1Result<T>[]>;exec(sql:string):Promise<{count:number;duration:number}>}
interface Fetcher{fetch(request:Request|string,init?:RequestInit):Promise<Response>}
interface NovaBucket{put(key:string,value:string|ArrayBuffer,options?:{httpMetadata?:{contentType?:string}}):Promise<unknown>;get(key:string):Promise<{text():Promise<string>}|null>;delete(key:string):Promise<void>}
declare module 'cloudflare:workers'{export const env:{DB:D1Database;BUCKET:NovaBucket;[key:string]:unknown}}
