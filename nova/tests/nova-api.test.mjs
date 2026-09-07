import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';

test('NOVA API: ownership, persistence, versions, source retrieval, metrics and deletion',async()=>{
 const built=await build({stdin:{contents:"import {handleApi} from './lib/api-core'; export default {fetch:(req,env)=>handleApi(req,env)}",resolveDir:process.cwd(),sourcefile:'test-worker.ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['node:crypto']});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-04-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
 try{const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql'))){for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(sql).run();}
 const {createHash}=await import('node:crypto');
 const sessionTokens={alice:'a'.repeat(64),bob:'b'.repeat(64)};
 for(const who of ['alice','bob']){await db.prepare('INSERT INTO auth_users(id,name,email,created) VALUES(?,?,?,?)').bind(who,who,who+'@example.test',Date.now()).run();await db.prepare('INSERT INTO auth_sessions(token,user,expires,created) VALUES(?,?,?,?)').bind(createHash('sha256').update(sessionTokens[who]).digest('hex'),who,Date.now()+86400000,Date.now()).run()}
 async function call(p,method='GET',data,owner='alice',origin='https://nova.test'){const headers={'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.test',origin,cookie:sessionTokens[owner]?'__Host-nova_session='+sessionTokens[owner]:''};if(data)headers['content-type']='application/json';const response=await mf.dispatchFetch('https://nova.test/api/nova/'+p,{method,headers,body:data?JSON.stringify(data):undefined});const text=await response.text();let body;try{body=JSON.parse(text)}catch{body=text}return {status:response.status,body};}
 assert.equal((await call('projects','GET',undefined,'')).status,401);
 assert.equal((await call('projects','POST',{title:'Bad',kind:'novela'},'alice','https://evil.test')).status,403);
 assert.equal((await call('projects','POST',{title:'',kind:'novela'})).status,400);
 assert.deepEqual((await call('overview')).body.steps,[false,false,false,false]);
 const feedback={id:crypto.randomUUID(),usefulness:4,task:'Organizar un ensayo',friction:'No encontré el historial',improvement:'Mostrar el historial junto al guardado'};
 assert.equal((await call('feedback','POST',feedback)).status,201);
 assert.equal((await call('feedback','POST',feedback)).status,200);
 assert.equal((await call('feedback')).body.length,1);
 assert.equal((await call('feedback','GET',undefined,'bob')).body.length,0);
 assert.equal((await call('feedback','POST',{...feedback,id:crypto.randomUUID(),usefulness:6})).status,400);
 assert.equal((await call('feedback','POST',feedback,'alice','https://evil.test')).status,403);
 assert.equal((await call('feedback','GET',undefined,'')).status,401);


 const account=(await call('account')).body;assert.equal(account.version,0);assert.equal(account.identity.email,'alice@example.test');assert.equal(account.data.typography,'serif');
 const accountDraft={...account.data,displayName:'Autora Alice',occupation:'Investigadora',bio:'Escribo ensayos.',typography:'sans',textSize:'large',defaultGoal:12000};
 const savedAccount=await call('account','PUT',{data:accountDraft,version:0});assert.equal(savedAccount.status,200);assert.equal(savedAccount.body.version,1);
 assert.equal((await call('account')).body.data.displayName,'Autora Alice');assert.equal((await call('account')).body.data.defaultGoal,12000);
 assert.equal((await call('account','GET',undefined,'bob')).body.data.displayName,'');
 assert.equal((await call('account','GET',undefined,'')).status,401);
 assert.equal((await call('account','PUT',{data:accountDraft,version:1},'alice','https://evil.test')).status,403);
 assert.equal((await call('account','PUT',{data:accountDraft,version:0})).status,409);
 assert.equal((await call('account','PUT',{data:{...accountDraft,defaultGoal:-1},version:1})).status,400);
 assert.equal((await call('account','PUT',{data:{...accountDraft,displayName:'A'.repeat(101)},version:1})).status,400);
 const created=await call('projects','POST',{title:'La ciudad y la memoria',kind:'novela',goal:1000});assert.equal(created.status,201);const pid=created.body.id,base='projects/'+pid;
 assert.equal((await call(base,'GET',undefined,'bob')).status,404);
 const ch=await call(base+'/chapters','POST',{title:'La llegada'});assert.equal(ch.status,201);const cid=ch.body.id;
 const saved=await call(base+'/chapters/'+cid,'PUT',{title:'La llegada',content:'La ciudad despertó. Adrián guardó la carta.',version:1});assert.equal(saved.status,200);assert.equal(saved.body.words,7);assert.equal(saved.body.version,2);
 assert.equal((await call(base+'/chapters/'+cid,'PUT',{title:'Perder texto',content:'no',version:1})).status,409);
 assert.equal((await call(base+'/chapters/'+cid)).body.content,'La ciudad despertó. Adrián guardó la carta.');
 assert.equal((await call(base+'/chapters/'+cid+'/revisions')).body.length,1);
 const source=await call(base+'/sources','POST',{title:'Notas de Viena',author:'Archivo propio',url:'https://example.org/source',content:'Viena conserva una importante memoria diplomática. La embajada está junto a la plaza.',filename:'viena.txt'});assert.equal(source.status,201);
 const retrieved=await call(base+'/search?q=MEMORIA%20DIPLOMATICA');assert.equal(retrieved.status,200);assert.equal(retrieved.body.results[0].title,'Notas de Viena');assert.equal(retrieved.body.results[0].score,2);
 assert.equal((await call(base+'/sources/'+source.body.id,'GET',undefined,'bob')).status,404);
 assert((await call(base+'/sources/'+source.body.id)).body.content.includes('Viena'));
 assert.equal((await call(base+'/sources','POST',{title:'Mal enlace',content:'x',url:'javascript:alert(1)'})).status,400);
 const memory=await call(base+'/memory','POST',{kind:'personaje',title:'Adrián',content:'Lleva una carta.',date:'Capítulo 1'});assert.equal(memory.status,201);
 const project=(await call(base)).body;assert.equal(project.chapters.length,1);assert.equal(project.sources.length,1);assert.equal(project.memories.length,1);assert(!('object_key' in project.sources[0]));
 assert.equal((await call(base,'PATCH',{...project,style:'Tercera persona',sample:'Mi voz.',archived:1})).status,200);
 assert.equal((await call(base,'PATCH',{...project,title:'Stale overwrite'})).status,409);assert.equal((await call(base)).body.style,'Tercera persona');assert.equal((await call(base)).body.version,2);
 const stats=(await call('stats')).body;assert.equal(stats.words,7);assert.equal(stats.sources,1);assert.equal(stats.memories,1);assert.equal(stats.activity[0].saves,1);
 const context=await call(base+'/context','POST',{chapterId:cid,action:'rewrite',instruction:'Explica la memoria diplomática'});assert.equal(context.status,200);assert.equal(context.body.context.manuscript.version,2);assert.equal(context.body.context.style.rules,'Tercera persona');assert.equal(context.body.context.passages.length,1);assert.equal(context.body.context.memory.length,1);

 const fresh=(await call('author')).body;assert.equal(fresh.version,0);
 const profileData={...fresh.data,audience:'Estudiantes',purpose:'Explicar con claridad',exercise:'Mi ejercicio personal.',memories:[{id:crypto.randomUUID(),content:'Evitar anglicismos',project:null,enabled:true,updated:new Date().toISOString()},{id:crypto.randomUUID(),content:'Preferencia inactiva',project:null,enabled:false,updated:new Date().toISOString()}]};
 assert.equal((await call('author','PUT',{version:0,data:profileData,confirm:true})).status,200);
 assert.equal((await call('author','PUT',{version:0,data:profileData,confirm:true})).status,409);
 assert.equal((await call('author','GET',undefined,'bob')).body.version,0);
 assert.equal((await call('author','PUT',{version:0,data:{...profileData,memories:[{...profileData.memories[0],project:pid}]},confirm:true},'bob')).status,404);
 assert.equal((await call('author','PUT',{version:1,data:profileData,confirm:true},'alice','https://evil.test')).status,403);
 const sample=await call('author-samples','POST',{title:'Voz propia',kind:'novela',content:'Mi forma de narrar una historia.'});assert.equal(sample.status,201);
 assert.equal((await call('author-samples/'+sample.body.id,'GET',undefined,'bob')).status,404);
 assert.equal((await call('author-samples/'+sample.body.id,'DELETE',undefined,'bob')).status,404);
 const voiceContext=(await call(base+'/context','POST',{chapterId:cid,action:'rewrite',instruction:'Reescribir'})).body.context.author;
 const visibleVoice=(await call(base+'/voice')).body;assert(visibleVoice.rules.includes('Estudiantes'));assert.equal(visibleVoice.preferences.length,1);assert.equal(visibleVoice.samples.length,1);assert.equal((await call(base+'/voice','GET',undefined,'bob')).status,404);assert.deepEqual((await call('overview')).body.steps,[true,true,true,true]);
 assert(voiceContext.rules.includes('Estudiantes'));assert.equal(voiceContext.preferences.length,1);assert.equal(voiceContext.examples[0].content,'Mi forma de narrar una historia.');
 assert.equal((await call('author-samples/'+sample.body.id,'DELETE')).status,200);
 assert.equal((await call('author-samples/'+sample.body.id)).status,404);
 assert.equal((await call('author')).body.samples.length,0);
 assert.equal((await call('author','PUT',{version:1,data:{...profileData,memories:[]},confirm:true})).status,200);
 const cleared=(await call(base+'/context','POST',{chapterId:cid,action:'rewrite',instruction:'Reescribir'})).body.context.author;
 assert.equal(cleared.preferences.length,0);assert.equal(cleared.examples.length,0);
 assert.equal((await call('author','PUT',{version:2,data:profileData,confirm:false})).status,200);
 assert.equal((await call(base+'/context','POST',{chapterId:cid,action:'rewrite',instruction:'Reescribir'})).body.context.author,null);
 const exported=await call(base+'/export?format=json');assert.equal(exported.status,200);assert(exported.body.sources[0].content.includes('Viena'));assert.equal(exported.body.project.owner,undefined);
 assert((await call(base+'/export')).body.includes('## La llegada'));
 assert.equal((await call(base+'/ai','POST',{chapterId:cid,action:'continue',instruction:'Continúa con la memoria diplomática'})).status,503);
 assert.equal((await call(base,'DELETE')).status,200);
 assert.equal((await call(base)).status,404);assert.equal((await call('stats')).body.words,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM chunks').first()).n,0);assert.equal((await db.prepare('SELECT COUNT(*) n FROM revisions').first()).n,0);assert.equal((await (await mf.getR2Bucket('BUCKET')).list()).objects.length,0);
 }finally{await mf.dispose()}
});


test('Local recovery preserves content, rejects expired/corrupt records, bounds storage and reports quota failure',async()=>{
 const built=await build({entryPoints:['lib/draft-recovery.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {draftKey,readDraft,writeDraft,removeDraft}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const map=new Map();const storage={get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const key=draftKey('alice@example.test','project','chapter');const d={title:'Mi capítulo',content:'Un texto todavía sin guardar.',version:3,updated:Date.now()};
 assert(writeDraft(storage,key,d));assert.deepEqual(readDraft(storage,key),d);assert.equal(readDraft(storage,draftKey('bob@example.test','project','chapter')),null);
 storage.setItem(key,JSON.stringify({...d,updated:Date.now()-8*86400000}));assert.equal(readDraft(storage,key),null);assert.equal(storage.getItem(key),null);
 storage.setItem(key,'broken');assert.equal(readDraft(storage,key),null);removeDraft(storage,key);
 for(let i=0;i<25;i++)assert(writeDraft(storage,draftKey('alice','project',String(i)),{...d,updated:Date.now()+i}));assert.equal(storage.length,20);
 assert.equal(writeDraft({...storage,setItem(){throw new Error('QuotaExceededError')}},key,d),false);
});
