import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';

test('NOVA API: ownership, persistence, versions, source retrieval, metrics and deletion',async()=>{
 const built=await build({stdin:{contents:"import {handleApi} from './lib/api-core'; export default {fetch:(req,env)=>handleApi(req,env)}",resolveDir:process.cwd(),sourcefile:'test-worker.ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-04-01',d1Databases:['DB'],r2Buckets:['BUCKET']});
 try{const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql'))){for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(sql).run();}
 async function call(p,method='GET',data,owner='alice',origin='https://nova.test'){const headers={'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.test',origin};if(data)headers['content-type']='application/json';const response=await mf.dispatchFetch('https://nova.test/api/nova/'+p,{method,headers,body:data?JSON.stringify(data):undefined});const text=await response.text();let body;try{body=JSON.parse(text)}catch{body=text}return {status:response.status,body};}
 assert.equal((await call('projects','GET',undefined,'')).status,401);
 assert.equal((await call('projects','POST',{title:'Bad',kind:'novela'},'alice','https://evil.test')).status,403);
 assert.equal((await call('projects','POST',{title:'',kind:'novela'})).status,400);
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
 const stats=(await call('stats')).body;assert.equal(stats.words,7);assert.equal(stats.sources,1);assert.equal(stats.memories,1);assert.equal(stats.activity[0].saves,1);
 const context=await call(base+'/context','POST',{chapterId:cid,action:'rewrite',instruction:'Explica la memoria diplomática'});assert.equal(context.status,200);assert.equal(context.body.context.manuscript.version,2);assert.equal(context.body.context.style.rules,'Tercera persona');assert.equal(context.body.context.passages.length,1);assert.equal(context.body.context.memory.length,1);
 const exported=await call(base+'/export?format=json');assert.equal(exported.status,200);assert(exported.body.sources[0].content.includes('Viena'));assert.equal(exported.body.project.owner,undefined);
 assert((await call(base+'/export')).body.includes('## La llegada'));
 assert.equal((await call(base+'/ai','POST',{chapterId:cid,action:'continue',instruction:'Continúa con la memoria diplomática'})).status,503);
 assert.equal((await call(base,'DELETE')).status,200);
 assert.equal((await call(base)).status,404);assert.equal((await call('stats')).body.words,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM chunks').first()).n,0);assert.equal((await db.prepare('SELECT COUNT(*) n FROM revisions').first()).n,0);assert.equal((await (await mf.getR2Bucket('BUCKET')).list()).objects.length,0);
 }finally{await mf.dispose()}
});
