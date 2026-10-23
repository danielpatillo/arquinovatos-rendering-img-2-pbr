#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Loopback-only companion for registered materials and their persistent library.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readLibrary,libraryEntries,libraryPage,defaultLibraryRoot} from './material-library.mjs';

export function revealCommand(file,platform=process.platform){
  if(platform==='win32')return {command:'explorer.exe',args:['/select,'+file]};
  if(platform==='darwin')return {command:'open',args:['-R',file]};
  return {command:'xdg-open',args:[path.dirname(file)]};
}
export function folderCommand(folder,platform=process.platform){
  if(platform==='win32')return {command:'explorer.exe',args:[folder]};
  if(platform==='darwin')return {command:'open',args:[folder]};
  return {command:'xdg-open',args:[folder]};
}
function runOpen({command,args}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'ignore',windowsHide:true,detached:true,shell:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});}
function revealFile(file){return runOpen(revealCommand(file));}
function openFolder(folder){return runOpen(folderCommand(folder));}
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const stillExists=(file,directory=false)=>fs.realpathSync(file)===file&&(directory?fs.statSync(file).isDirectory():fs.statSync(file).isFile());

function reviewContext(htmlPath,manifestPath){
  const html=fs.readFileSync(htmlPath,'utf8'),manifest=readJSON(manifestPath),root=fs.realpathSync(path.dirname(manifestPath));
  if(!manifest.files||typeof manifest.files!=='object'||Array.isArray(manifest.files))throw Error('El manifiesto de archivos no es válido.');
  const files=Object.create(null);
  for(const [key,value] of Object.entries(manifest.files)){
    if(typeof value!=='string'||!value)throw Error('El manifiesto necesita rutas de archivos.');
    const file=fs.realpathSync(path.resolve(root,value));if(!fs.statSync(file).isFile())throw Error('El manifiesto solo admite archivos en files.');files[key]=file;
  }
  let mapDir=null,mapCase='01';
  if(manifest.mapsDirectory!==undefined){
    const entry=manifest.mapsDirectory;
    if(!entry||entry.type!=='directory'||typeof entry.path!=='string'||!entry.path)throw Error('La carpeta de mapas debe declararse como directory.');
    mapDir=fs.realpathSync(path.resolve(root,entry.path));if(!fs.statSync(mapDir).isDirectory())throw Error('La carpeta de mapas no es un directorio.');
    if(entry.caseId!==undefined){if(typeof entry.caseId!=='string'||!entry.caseId)throw Error('caseId debe identificar el material del manifiesto.');mapCase=entry.caseId;}
    if(!Array.isArray(entry.entries)||!entry.entries.length)throw Error('La carpeta de mapas necesita una lista de archivos manifestados.');
    for(const key of entry.entries)if(typeof key!=='string'||!Object.hasOwn(files,key)||path.dirname(files[key])!==mapDir)throw Error('Cada mapa de la carpeta debe estar incluido en files dentro de ese directorio.');
  }
  return {html,manifest,root,files,mapDir,mapCase};
}

export async function createReviewServer({htmlPath,manifestPath,libraryRoot,port=0,revealer=revealFile,folderOpener=openFolder}){
  const initial=reviewContext(htmlPath,manifestPath);
  if(libraryRoot===undefined&&initial.manifest.library?.type==='library'&&typeof initial.manifest.library.path==='string')libraryRoot=path.resolve(initial.root,initial.manifest.library.path);
  try{libraryRoot=fs.realpathSync(libraryRoot);if(!fs.statSync(libraryRoot).isDirectory()||!fs.existsSync(path.join(libraryRoot,'Biblioteca_PBR.html')))libraryRoot=null;}catch{libraryRoot=null;}
  return createServer({initial,libraryRoot,port,revealer,folderOpener});
}
export async function createLibraryServer({libraryRoot=defaultLibraryRoot(),port=0,revealer=revealFile,folderOpener=openFolder}={}){
  libraryRoot=fs.realpathSync(libraryRoot);libraryPage(libraryRoot);
  return createServer({initial:null,libraryRoot,port,revealer,folderOpener});
}
async function createServer({initial,libraryRoot,port,revealer,folderOpener}){
  const token=crypto.randomBytes(32).toString('hex');let origin;
  const find=id=>libraryRoot&&readLibrary(libraryRoot).materials.find(item=>item.id===id);
  const contextFor=item=>reviewContext(item.htmlPath,path.join(item.root,'review-files.json'));
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
    const send=(status,text,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(text);};
    if(req.headers.host!==new URL(origin).host){send(403,'Host no permitido');return;}
    if(req.method==='GET'&&req.headers.origin&&req.headers.origin!==origin){send(403,'Origen no permitido');return;}
    let route=req.url.split('?')[0],context=initial,prefix='';
    const match=route.match(/^\/materials\/([a-f0-9]{24})(\/api\/[a-z-]+)?\/?$/);
    if(match){
      const item=find(match[1]);if(!item?.hasViewer){send(404,'Material no disponible');return;}
      try{context=contextFor(item);}catch{send(404,'No se pudo abrir este material. Revisa su carpeta.');return;}
      prefix='/materials/'+item.id;route=match[2]||'/';
    }
    const bridge=(base,canOpenMaps)=>'<script>window.PBR_LOCAL_BRIDGE='+JSON.stringify({origin:base,token,canOpenMaps,canOpenLibrary:!!libraryRoot,libraryUrl:libraryRoot?origin+'/library':null})+';</script>';
    if(req.method==='GET'){
      if(libraryRoot&&(route==='/library'||(route==='/'&&!context))){
        try{send(200,libraryPage(libraryRoot,{baseUrl:origin}).replace('</head>',bridge(origin,false)+'</head>'),'text/html; charset=utf-8');}catch{send(500,'No se pudo leer la biblioteca. Conserva el historial y vuelve a iniciarla.');}return;
      }
      if(libraryRoot&&route==='/api/library'){try{send(200,JSON.stringify(libraryEntries(libraryRoot,{baseUrl:origin})),'application/json; charset=utf-8');}catch{send(500,'No se pudo leer el historial.');}return;}
      const thumbnail=route.match(/^\/library\/thumbnail\/([a-f0-9]{24})$/);
      if(thumbnail){const item=find(thumbnail[1]);try{if(!item?.available||!stillExists(item.thumbnailPath))throw Error();send(200,fs.readFileSync(item.thumbnailPath),'image/png');}catch{send(404,'Imagen no disponible');}return;}
      if(context&&(route==='/'||route==='/Material_PBR.html')){send(200,context.html.replace('</head>',bridge(origin+prefix,context.mapDir!==null)+'</head>'),'text/html; charset=utf-8');return;}
    }
    if(req.method!=='POST'||!['/api/reveal','/api/open-maps','/api/open-library','/api/open-material'].includes(route)){send(404,'No encontrado');return;}
    if(req.headers.origin!==origin||req.headers['x-pbr-token']!==token){send(403,'Solicitud no autorizada');return;}
    let body;
    try{
      let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096){send(413,'Solicitud demasiado grande');return;}}
      body=JSON.parse(raw||'{}');
    }catch{send(400,'JSON no válido');return;}
    if(!body||typeof body!=='object'||Array.isArray(body)){send(400,'Solicitud no válida');return;}
    if(route==='/api/open-library'){
      if(Object.keys(body).length){send(400,'No se admiten rutas ni parámetros para la carpeta de la biblioteca.');return;}
      if(!libraryRoot){send(404,'Este visor no tiene biblioteca registrada.');return;}
      try{if(!stillExists(libraryRoot,true))throw Error();await folderOpener(libraryRoot);send(200,'Carpeta de todos los materiales abierta');}catch{send(500,'No se pudo abrir la biblioteca. Revisa su carpeta.');}return;
    }
    if(route==='/api/open-material'){
      if(Object.keys(body).some(key=>key!=='id')){send(400,'Solo se admite el identificador del material.');return;}
      const item=typeof body.id==='string'?find(body.id):null,folder=body.id===undefined?context?.root:item?.available?item.root:null;
      if(!folder){send(404,'Material no disponible');return;}
      try{if(!stillExists(folder,true))throw Error();await folderOpener(folder);send(200,'Carpeta del material abierta');}catch{send(500,'No se pudo abrir la carpeta de este material.');}return;
    }
    if(!context){send(404,'Selecciona un material del historial.');return;}
    const {files,mapDir,mapCase}=context;
    if(route==='/api/open-maps'){
      if(Object.keys(body).some(key=>key!=='caseId')){send(400,'La carpeta se obtiene del manifiesto; no se admiten rutas.');return;}
      if(body.caseId!==undefined&&body.caseId!==mapCase){send(404,'Material no incluido en esta revisión');return;}
      if(mapDir===null){send(404,'Esta revisión no declara una carpeta de mapas.');return;}
      try{if(!stillExists(mapDir,true))throw Error('Carpeta modificada');await folderOpener(mapDir);send(200,'Carpeta de mapas abierta');}
      catch{send(500,'No se pudo abrir la carpeta de mapas. Revisa que el explorador de archivos esté disponible.');}
      return;
    }
    if(Object.keys(body).some(key=>key!=='key')){send(400,'Solo se admite la llave de un archivo manifestado.');return;}
    const {key}=body;if(typeof key!=='string'||!Object.hasOwn(files,key)){send(404,'Archivo no incluido en esta revisión');return;}
    try{if(!stillExists(files[key]))throw Error('Archivo modificado');await revealer(files[key]);send(200,'Ubicación abierta');}
    catch{send(500,'No se pudo abrir la ubicación. Revisa que el explorador de archivos esté disponible.');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;resolve();});});
  return {server,origin,token};
}

const isCLI=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCLI){
  try{
    const options={};for(let i=2;i<process.argv.length;i+=2)options[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
    const folder=path.dirname(fileURLToPath(import.meta.url));let local;
    if(options.library||path.basename(process.argv[1])==='Iniciar_biblioteca.mjs')local=await createLibraryServer({libraryRoot:path.resolve(options.library||folder),port:Number(options.port||0)});
    else{const manifestPath=path.resolve(options.manifest||path.join(folder,'review-files.json'));const manifest=readJSON(manifestPath),htmlPath=path.resolve(options.html||path.join(path.dirname(manifestPath),manifest.html||'Material_PBR.html'));local=await createReviewServer({htmlPath,manifestPath,port:Number(options.port||0)});}
    console.log(JSON.stringify({url:local.origin,mode:'local-only',message:'El historial permanece en Biblioteca_PBR.html. Vuelve a ejecutar el iniciador para abrir carpetas en otra sesión. Ctrl+C cierra este servidor.'}));
    for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>local.server.close(()=>process.exit(0)));
  }catch(error){console.error(error.message);process.exitCode=1;}
}

