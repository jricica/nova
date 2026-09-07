export type LocalDraft = { title: string; content: string; version: number; updated: number };
const prefix = 'nova-draft-v1:';
export const draftKey = (account: string, project: string, chapter: string) => prefix + encodeURIComponent(account.toLowerCase()) + ':' + project + ':' + chapter;
export function readDraft(storage: Storage, key: string): LocalDraft | null {
 try { const raw=storage.getItem(key); if(!raw)return null; const d=JSON.parse(raw); if(typeof d.title!=='string'||typeof d.content!=='string'||!Number.isInteger(d.version)||d.version<1||!Number.isFinite(d.updated)||d.updated>Date.now()+60000||Date.now()-d.updated>7*86400000||d.title.length>160||d.content.length>300000){storage.removeItem(key);return null}return d; }catch{return null}
}
export function writeDraft(storage: Storage, key: string, draft: LocalDraft): boolean {
 try { const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((k):k is string=>!!k&&k.startsWith(prefix));for(const k of keys)readDraft(storage,k); const valid=keys.filter(k=>storage.getItem(k)&&k!==key); if(valid.length>=20) { valid.sort((a,b)=>(readDraft(storage,a)?.updated||0)-(readDraft(storage,b)?.updated||0));for(const k of valid.slice(0,valid.length-19))storage.removeItem(k); }storage.setItem(key,JSON.stringify(draft));return true;}catch{return false}
}
export function removeDraft(storage: Storage,key:string){try{storage.removeItem(key)}catch{/* Browser storage may be unavailable. */}}
