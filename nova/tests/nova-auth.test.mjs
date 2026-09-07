import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';

test('Native auth: real password KDF, cookies, recovery, CSRF, isolation and legacy ChatGPT ownership',async()=>{
 const built=await build({stdin:{contents:"import {handleAuth} from './lib/auth-core';import {handleApi} from './lib/api-core';export default {fetch:(r,e)=>new URL(r.url).pathname.includes('/nova/')?handleApi(r,e):handleAuth(r,e.DB)}",resolveDir:process.cwd(),sourcefile:'auth-test.ts'},bundle:true,write:false,format:'esm',platform:'browser',external:['node:crypto']});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-04-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
 try{
 const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(sql).run();
 async function call(path,body,cookie='',extra={},method=body===undefined?'GET':'POST'){
  const r=await mf.dispatchFetch('https://nova-test.chatgpt.site'+path,{method,headers:{origin:'https://nova-test.chatgpt.site','content-type':'application/json',cookie,'cf-connecting-ip':'192.0.2.1',...extra},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data,headers:r.headers,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
 }
 const localCapabilities=await mf.dispatchFetch('https://nva-app.com/api/auth/me');assert.equal((await localCapabilities.json()).capabilities.chatgpt,false);
 const providerCapabilities=await mf.dispatchFetch('https://nova-test.chatgpt.site/api/auth/me');assert.equal((await providerCapabilities.json()).capabilities.chatgpt,true);
 const untrustedProvider=await mf.dispatchFetch('https://nva-app.com/api/auth/start-chatgpt',{method:'POST',headers:{origin:'https://nva-app.com'}});assert.equal(untrustedProvider.status,403);
 const pw='A secure test phrase 938',newpw='Another test phrase 492';
 assert.equal((await call('/api/auth/signup',{username:'alice',name:'Alice',password:pw},'',{origin:'https://evil.test'})).status,403);
 assert.equal((await call('/api/auth/signup',{username:'alice',name:'Alice',password:'short'})).status,400);
 assert.equal((await call('/api/nova/projects',undefined,'',{'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'alice@test.invalid'})).status,401);
 const signup=await call('/api/auth/signup',{username:'Alice',name:'Alice',password:pw});assert.equal(signup.status,201,JSON.stringify(signup.data));assert.match(signup.data.recoveryCode,/^[a-f0-9]{64}$/);assert.match(signup.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.equal(signup.headers.get('cache-control'),'no-store');
 const a=signup.cookie;const u=(await call('/api/auth/me',undefined,a)).data.user;assert.equal(u.username,'alice');assert(u.id.startsWith('nova_'));
 const stored=await db.prepare('SELECT password,recovery FROM auth_users WHERE id=?').bind(u.id).first();assert.match(stored.password,/^scrypt-v1\$/);assert.notEqual(stored.recovery,signup.data.recoveryCode);
 const project=await call('/api/nova/projects',{title:'Private manuscript',kind:'novela'},a);assert.equal(project.status,201);
 assert.equal((await call('/api/auth/signup',{username:'alice',name:'Other',password:pw})).status,409);
 const other=await call('/api/auth/signup',{username:'bob',name:'Bob',password:pw});assert.equal(other.status,201);
 assert.equal((await call('/api/nova/projects/'+project.data.id,undefined,other.cookie)).status,404);
 assert.equal((await call('/api/auth/login',{username:'alice',password:'wrong password'})).status,401);
 const login=await call('/api/auth/login',{username:'ALICE',password:pw});assert.equal(login.status,200);assert.notEqual(login.cookie,a);
 assert.equal((await call('/api/auth/logout',{},login.cookie,{origin:'https://evil.test'})).status,403);
 assert.equal((await call('/api/auth/logout',{},login.cookie)).status,200);assert.equal((await call('/api/auth/me',undefined,login.cookie)).data.user,null);
 assert.equal((await call('/api/auth/credentials',{username:'alice',password:newpw,currentPassword:'wrong'},a)).status,401);
 const changed=await call('/api/auth/credentials',{username:'alice',password:newpw,currentPassword:pw},a);assert.equal(changed.status,200);assert.equal((await call('/api/auth/me',undefined,a)).data.user,null);
 assert.equal((await call('/api/auth/recover',{username:'alice',password:pw,recoveryCode:signup.data.recoveryCode})).status,401);
 const restored=await call('/api/auth/recover',{username:'alice',password:pw,recoveryCode:changed.data.recoveryCode});assert.equal(restored.status,200);assert.equal((await call('/api/auth/me',undefined,changed.cookie)).data.user,null);
 assert.equal((await call('/api/auth/recover',{username:'alice',password:newpw,recoveryCode:changed.data.recoveryCode})).status,401);
 assert.equal((await call('/api/nova/projects/'+project.data.id,undefined,restored.cookie)).status,200);
 await db.prepare('INSERT INTO projects(id,owner,title,kind,created,updated) VALUES(?,?,?,?,?,?)').bind('legacy-project','legacy-owner','Existing NOVA work','ensayo',new Date().toISOString(),new Date().toISOString()).run();
 const providerHeaders={'oai-authenticated-user-id':'legacy-owner','oai-authenticated-user-email':'legacy@example.test'};
 assert.equal((await call('/auth/chatgpt',undefined,'',providerHeaders)).status,403);
 const start=await call('/api/auth/start-chatgpt',{});assert.equal(start.status,200);assert.equal(start.data.url,'/signin-with-chatgpt?return_to=%2Fauth%2Fchatgpt');
 const legacy=await call('/auth/chatgpt',undefined,start.cookie,providerHeaders);assert.equal(legacy.status,303);assert.equal((await call('/api/nova/projects/legacy-project',undefined,legacy.cookie)).status,200);
 assert.equal((await call('/auth/chatgpt',undefined,start.cookie,providerHeaders)).status,403);
 assert.equal((await call('/api/nova/projects/legacy-project',undefined,restored.cookie,providerHeaders)).status,404);
 const configured=await call('/api/auth/credentials',{username:'legacy',password:pw},legacy.cookie,providerHeaders);assert.equal(configured.status,200);
 const independent=await call('/api/auth/login',{username:'legacy',password:pw});assert.equal(independent.status,200);assert.equal((await call('/api/nova/projects/legacy-project',undefined,independent.cookie)).status,200);
 assert.equal((await call('/api/auth/logout-all',{},independent.cookie)).status,200);assert.equal((await call('/api/auth/me',undefined,configured.cookie)).data.user,null);
 await db.prepare('UPDATE auth_sessions SET expires=0 WHERE user=?').bind(u.id).run();assert.equal((await call('/api/nova/projects',undefined,restored.cookie)).status,401);
 // Rate limiting happens before password hashing and returns 429 under repeated attempts.
 let last;for(let i=0;i<12;i++){last=await call('/api/auth/login',{username:'nonexistent',password:pw});if(last.status===429)break}assert.equal(last.status,429);
 }finally{await mf.dispose()}
});
