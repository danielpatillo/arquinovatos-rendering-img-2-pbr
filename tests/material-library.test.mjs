import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildReview} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/build-review.mjs';
import * as servers from '../skills/arquinovatos-rendering-img-2-pbr/scripts/serve-review.mjs';
import {encodePNG} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/normal-opengl.mjs';

const moduleUrl=new URL('../skills/arquinovatos-rendering-img-2-pbr/scripts/material-library.mjs',import.meta.url);
let library={};
try{library=await import(moduleUrl);}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const run=path.join(path.dirname(fileURLToPath(import.meta.url)),'runtime','library-'+randomUUID());
fs.mkdirSync(run,{recursive:true});
const names=['Material_BaseColor.png','Material_Normal_DX.png','Material_Normal_GL.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function api(){assert.equal(typeof library.registerMaterial,'function','Persistent local material history has not been implemented');return library;}
function fixture(label,root=path.join(run,label)){
  const maps=path.join(root,'maps');fs.mkdirSync(maps,{recursive:true});
  for(const [index,name] of names.entries()){
    const channels=index<3?3:1,data=Buffer.from(Array.from({length:64*channels},(_,i)=>48+i%170));
    fs.writeFileSync(path.join(maps,name),encodePNG({width:8,height:8,channels,data}));
  }
  const photo=path.join(root,'photo.png');fs.copyFileSync(path.join(maps,names[0]),photo);
  return {root,maps,photo,output:path.join(root,'Material_PBR.html')};
}
function legacy(label,root){
  const f=fixture(label,root);
  fs.writeFileSync(f.output,'<!doctype html><html><head><title>Existing material</title></head><body>Original material</body></html>');
  fs.writeFileSync(path.join(f.root,'review-files.json'),JSON.stringify({html:'Material_PBR.html',files:Object.fromEntries(names.map(n=>[n,'maps/'+n])),mapsDirectory:{type:'directory',path:'maps',caseId:'01',entries:names}}));
  return f;
}
function post(local,route,body={},headers={}){
  return new Promise((resolve,reject)=>{
    const raw=JSON.stringify(body);
    const req=http.request(new URL(route,local.origin),{method:'POST',headers:{Origin:local.origin,'X-PBR-Token':local.token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),...headers}},res=>{let text='';res.setEncoding('utf8');res.on('data',s=>text+=s);res.on('end',()=>resolve({status:res.statusCode,text}));});
    req.on('error',reject);req.end(raw);
  });
}
const stop=local=>new Promise(resolve=>local.server.close(resolve));

test('allocation uses a stable personal library and never overwrites another material or builds a viewer during image work',()=>{
  const {defaultLibraryRoot,allocateMaterial}=api();
  assert.equal(defaultLibraryRoot(path.join(run,'personal-home')),path.join(run,'personal-home','Arquinovatos','Materiales_PBR'));
  const root=path.join(run,'allocated'),a=allocateMaterial({library:root,name:'Piedra / exterior'}),b=allocateMaterial({library:root,name:'Piedra / exterior'});
  assert.notEqual(a.root,b.root);assert.equal(path.dirname(a.root),root);assert.ok(fs.statSync(a.maps).isDirectory());
  assert.ok(fs.statSync(path.join(a.root,'work')).isDirectory());assert.equal(fs.existsSync(path.join(root,'Biblioteca_PBR.html')),false);
});

test('building two viewers registers both persistently and rebuilding updates one entry without changing its creation date',()=>{
  const {readLibrary}=api(),root=path.join(run,'automatic'),a=fixture('automatic-a'),b=fixture('automatic-b');
  const original=digest(path.join(a.maps,names[0]));
  const first=buildReview({...a,library:root,name:'Piedra <script>bad()</script>'});
  assert.equal(first.library.registered,true);assert.ok(fs.existsSync(path.join(root,'Biblioteca_PBR.html')));assert.ok(fs.existsSync(path.join(root,'Iniciar_biblioteca.mjs')));
  buildReview({...b,library:root,name:'Piso semimate'});
  const before=readLibrary(root);assert.equal(before.materials.length,2);const entry=before.materials.find(e=>e.name.startsWith('Piedra'));
  assert.equal(entry.hasViewer,true);assert.equal(entry.available,true);
  buildReview({...a,library:root,name:'Piedra actualizada'});
  const after=readLibrary(root);assert.equal(after.materials.length,2);assert.equal(after.materials.find(e=>e.id===entry.id).createdAt,entry.createdAt);
  assert.equal(after.materials.find(e=>e.id===entry.id).name,'Piedra actualizada');assert.equal(digest(path.join(a.maps,names[0])),original);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'Biblioteca_PBR.html'),'utf8'),/<script>bad\(\)<\/script>/);
});

test('PNG-only materials and technical viewer failures remain in history without claiming a usable HTML',()=>{
  const {registerMaterial,readLibrary}=api(),root=path.join(run,'states'),a=fixture('only-png'),b=fixture('viewer-blocked');
  registerMaterial({library:root,root:a.root,name:'Solo PNG',status:'png-only'});
  registerMaterial({library:root,root:b.root,name:'Visor pendiente',status:'viewer-error'});
  const entries=readLibrary(root).materials;assert.equal(entries.length,2);assert.ok(entries.every(e=>e.available&&!e.hasViewer));
  const broken=fixture('not-final');fs.unlinkSync(path.join(broken.maps,'Material_AO.png'));
  assert.throws(()=>registerMaterial({library:root,root:broken.root,name:'Incomplete',status:'ready'}));assert.equal(readLibrary(root).materials.length,2);
  assert.throws(()=>buildReview({...broken,library:root}));assert.equal(readLibrary(root).materials.length,2);
});

test('concurrent material registration retains every entry and the complete offline catalogue',async()=>{
  const {readLibrary}=api(),root=path.join(run,'concurrent'),cases=Array.from({length:5},(_,i)=>legacy('concurrent-'+i));
  await Promise.all(cases.map((item,index)=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[fileURLToPath(moduleUrl),'register','--library',root,'--material',item.root,'--name','Concurrent '+index,'--status','ready'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
    let error='';child.stderr.on('data',data=>error+=data);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(error||'Registration exited '+code)));
  })));
  const entries=readLibrary(root).materials;assert.equal(entries.length,5);assert.equal(new Set(entries.map(e=>e.id)).size,5);
  const html=fs.readFileSync(path.join(root,'Biblioteca_PBR.html'),'utf8');const data=JSON.parse(html.match(/window\.PBR_LIBRARY = (.+);\n/)[1]);assert.equal(data.length,5);
});

test('a damaged entry or a missing folder is reported without erasing the other materials',()=>{
  const {registerMaterial,readLibrary}=api(),root=path.join(run,'resilience'),a=legacy('resilience-a'),b=legacy('resilience-b');
  registerMaterial({library:root,root:a.root,name:'Disponible',status:'ready'});const second=registerMaterial({library:root,root:b.root,name:'Movido',status:'ready'});
  fs.renameSync(b.root,b.root+'-moved');fs.writeFileSync(path.join(root,'.historial','broken.json'),'{not JSON');
  const history=readLibrary(root);assert.equal(history.materials.length,2);assert.equal(history.materials.find(e=>e.id===second.id).available,false);
  assert.ok(history.materials.some(e=>e.name==='Disponible'&&e.available));assert.equal(history.warnings.length,1);assert.equal(fs.readFileSync(path.join(root,'.historial','broken.json'),'utf8'),'{not JSON');
});

test('moving the complete library preserves relative case references and access after a server restart',async()=>{
  const {registerMaterial,readLibrary}=api();assert.equal(typeof servers.createLibraryServer,'function');
  const before=path.join(run,'portable-before'),a=legacy('portable',path.join(before,'Piedra'));
  registerMaterial({library:before,root:a.root,name:'Piedra',status:'ready'});const moved=path.join(run,'portable-after');fs.renameSync(before,moved);
  const entries=readLibrary(moved).materials;assert.equal(entries.length,1);assert.equal(entries[0].hasViewer,true);
  const first=await servers.createLibraryServer({libraryRoot:moved,folderOpener:()=>{},revealer:()=>{}});await stop(first);
  const second=await servers.createLibraryServer({libraryRoot:moved,folderOpener:()=>{},revealer:()=>{}});
  try{const response=await fetch(second.origin+'/materials/'+entries[0].id);assert.equal(response.status,200);assert.match(await response.text(),/Original material/);}finally{await stop(second);}
});

test('library actions open the selected material and library, while existing map and file actions still resolve the right case',async()=>{
  const {readLibrary}=api();assert.equal(typeof servers.createLibraryServer,'function');
  const root=path.join(run,'server'),a=fixture('server-a');buildReview({...a,library:root,name:'Selected material'});const entry=readLibrary(root).materials[0];
  const opened=[],revealed=[],local=await servers.createLibraryServer({libraryRoot:root,folderOpener:folder=>opened.push(folder),revealer:file=>revealed.push(file)});
  try{
    const list=await (await fetch(local.origin+'/api/library')).json();assert.equal(list.materials.length,1);assert.equal(JSON.stringify(list).includes(run),false);
    assert.equal((await fetch(local.origin)).status,200);const material=await (await fetch(local.origin+'/materials/'+entry.id)).text();assert.match(material,/window.PBR_LOCAL_BRIDGE/);assert.match(material,/Selected material/);
    const preview=await fetch(local.origin+'/library/thumbnail/'+entry.id);assert.equal(preview.status,200);assert.deepEqual(Buffer.from(await preview.arrayBuffer()),fs.readFileSync(path.join(a.maps,names[0])));
    assert.equal((await post(local,'/api/open-library')).status,200);
    assert.equal((await post(local,'/api/open-material',{id:entry.id})).status,200);
    assert.equal((await post(local,'/materials/'+entry.id+'/api/open-material',{})).status,200);
    assert.equal((await post(local,'/materials/'+entry.id+'/api/open-library',{})).status,200);
    assert.equal((await post(local,'/materials/'+entry.id+'/api/open-maps',{caseId:'01'})).status,200);
    assert.equal((await post(local,'/materials/'+entry.id+'/api/reveal',{key:names[0]})).status,200);
    assert.deepEqual(opened,[fs.realpathSync(root),fs.realpathSync(a.root),fs.realpathSync(a.root),fs.realpathSync(root),fs.realpathSync(a.maps)]);assert.deepEqual(revealed,[fs.realpathSync(path.join(a.maps,names[0]))]);
  }finally{await stop(local);}
});

test('library folder actions reject foreign origins, tokens, hosts, unknown IDs and arbitrary paths',async()=>{
  const {registerMaterial,readLibrary}=api();assert.equal(typeof servers.createLibraryServer,'function');
  const root=path.join(run,'guard'),a=legacy('guard');registerMaterial({library:root,root:a.root,name:'Allowed',status:'ready'});const id=readLibrary(root).materials[0].id;
  const opened=[],local=await servers.createLibraryServer({libraryRoot:root,folderOpener:folder=>opened.push(folder),revealer:()=>{}});
  try{
    for(const route of ['/api/open-library','/api/open-material'])for(const headers of [{Origin:'https://foreign.example'},{'X-PBR-Token':'wrong'},{Host:'foreign.example'}])assert.equal((await post(local,route,{id},headers)).status,403);
    assert.equal((await post(local,'/api/open-library',{path:run})).status,400);assert.equal((await post(local,'/api/open-material',{id,path:run})).status,400);
    assert.equal((await post(local,'/api/open-material',{id:'__proto__'})).status,404);assert.equal((await fetch(local.origin+'/materials/unknown')).status,404);
    assert.equal((await fetch(local.origin+'/api/library',{headers:{Origin:'https://foreign.example'}})).status,403);assert.equal((await fetch(local.origin+'/library/thumbnail/'+id+'/../private')).status,404);
    assert.deepEqual(opened,[]);
  }finally{await stop(local);}
});

test('importing only a supplied output tree indexes existing viewers without copying or modifying their maps',()=>{
  const {importMaterials,readLibrary}=api(),root=path.join(run,'imports'),source=path.join(run,'old-results'),a=legacy('old-a',path.join(source,'Piedra')),b=legacy('old-b',path.join(source,'Piso'));
  const original=digest(path.join(a.maps,names[0])),html=digest(a.output);legacy('ignored',path.join(source,'work','candidate'));
  const first=importMaterials({library:root,from:source});assert.equal(first.imported,2);assert.equal(readLibrary(root).materials.length,2);
  importMaterials({library:root,from:source});assert.equal(readLibrary(root).materials.length,2);assert.equal(digest(path.join(a.maps,names[0])),original);assert.equal(digest(a.output),html);
  assert.ok(fs.existsSync(b.output));assert.equal(fs.existsSync(path.join(root,'Piedra')),false);
});

test('refreshing the catalogue rebuilds access to all materials without rewriting their records or maps',()=>{
  const {registerMaterial,readLibrary,refreshLibrary}=api();assert.equal(typeof refreshLibrary,'function','A catalogue refresh must not require re-registering materials');
  const root=path.join(run,'refresh-existing'),a=legacy('refresh-a'),b=legacy('refresh-b');
  registerMaterial({library:root,root:a.root,name:'Anterior',status:'ready'});registerMaterial({library:root,root:b.root,name:'Nuevo',status:'ready'});
  const entries=readLibrary(root).materials,before=entries.map(e=>fs.readFileSync(path.join(root,'.historial',e.id+'.json'))),original=digest(path.join(a.maps,names[0]));
  fs.writeFileSync(path.join(root,'Biblioteca_PBR.html'),'outdated catalogue');const result=refreshLibrary({library:root});
  assert.equal(result.materials,2);const data=JSON.parse(fs.readFileSync(result.index,'utf8').match(/window\.PBR_LIBRARY = (.+);\n/)[1]);assert.equal(data.length,2);
  for(const [i,entry] of entries.entries())assert.deepEqual(fs.readFileSync(path.join(root,'.historial',entry.id+'.json')),before[i]);assert.equal(digest(path.join(a.maps,names[0])),original);
});

test('saved catalogues with Windows or Unix newlines show the registered history instead of an empty template',()=>{
  const {registerMaterial,libraryPage}=api(),root=path.join(run,'line-endings'),material=legacy('line-endings-case');
  registerMaterial({library:root,root:material.root,name:'Material conservado',status:'ready'});
  const file=path.join(root,'Biblioteca_PBR.html'),original=fs.readFileSync(file,'utf8');
  for(const newline of ['\n','\r\n']){
    const template=original.replace(/\r?\n/g,'\n').replace(/window\.PBR_LIBRARY = .*;\n/,'window.PBR_LIBRARY = [];\n').replace(/\n/g,newline);
    fs.writeFileSync(file,template);const rendered=libraryPage(root,{baseUrl:'http://127.0.0.1:50001'}),match=rendered.match(/window\.PBR_LIBRARY = (.+);\r?\n/);
    assert.ok(match);assert.equal(JSON.parse(match[1]).length,1);assert.equal(JSON.parse(match[1])[0].name,'Material conservado');
  }
});

test('separate chats using different working folders append to the same library while a previously opened server sees both',async()=>{
  const {registerMaterial,readLibrary}=api(),root=path.join(run,'cross-chat'),a=legacy('chat-old'),b=legacy('chat-new');
  registerMaterial({library:root,root:a.root,name:'Chat anterior',status:'ready'});
  const local=await servers.createLibraryServer({libraryRoot:root,folderOpener:()=>{},revealer:()=>{}});
  try{
    assert.equal((await (await fetch(local.origin+'/api/library')).json()).materials.length,1);
    const cwd=path.join(run,'another-chat-workspace');fs.mkdirSync(cwd);
    await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(moduleUrl),'register','--library',root,'--material',b.root,'--name','Chat nuevo','--status','ready'],{cwd,stdio:['ignore','ignore','pipe'],windowsHide:true});let error='';child.stderr.on('data',s=>error+=s);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(error)));});
    const current=await (await fetch(local.origin+'/api/library')).json();assert.equal(current.materials.length,2);assert.deepEqual(new Set(current.materials.map(e=>e.name)),new Set(['Chat anterior','Chat nuevo']));assert.equal(readLibrary(root).materials.length,2);
  }finally{await stop(local);}
});
