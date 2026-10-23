#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodePNG} from './normal-opengl.mjs';
import {exportVariants} from './export-variants.mjs';

const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const inlineJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const definitions=[['Material_BaseColor.png','Albedo','Color del material sin iluminación.'],['Material_Normal_DX.png','Normal DX','DirectX, Y−.'],['Material_Normal_GL.png','Normal OpenGL','OpenGL, Y+. Verde invertido del DX.'],['Material_Roughness.png','Rugosidad','Respuesta mate o brillante.'],['Material_AO.png','Oclusión','Oclusión ambiental en cavidades.'],['Material_Specular_UE.png','Specular UE','Intensidad de reflexión dieléctrica.'],['Material_Height.png','Altura','Altura relativa para desplazamiento.']];
const rgbMaps=new Set(['Material_BaseColor.png','Material_Normal_DX.png','Material_Normal_GL.png']);

export function validateBrand(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('La configuración de marca debe ser un objeto.');
  const result={};
  const https=(url,label)=>{
    if(typeof url!=='string')throw Error(label+' debe ser una URL HTTPS.');
    let parsed;try{parsed=new URL(url);}catch{throw Error(label+' debe ser una URL HTTPS.');}
    if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password)throw Error(label+' debe ser una URL HTTPS pública sin credenciales.');
    return parsed.href;
  };
  for(const key of ['informationUrl','whatsappUrl','landingUrl','configUrl'])if(value[key]!==undefined&&value[key]!=='')result[key]=https(value[key],key);
  if(value.socialLinks!==undefined){
    if(!Array.isArray(value.socialLinks))throw Error('socialLinks debe ser una lista.');
    result.socialLinks=value.socialLinks.map(link=>{
      if(!link||typeof link!=='object'||typeof link.label!=='string'||!link.label.trim())throw Error('Cada enlace social necesita label y url.');
      return {label:link.label.trim(),url:https(link.url,'socialLinks.url')};
    });
  }
  if(value.revision!==undefined){if(!['string','number'].includes(typeof value.revision))throw Error('revision debe ser texto o número.');result.revision=value.revision;}
  return result;
}

function dataURL(file){
  const data=fs.readFileSync(file);let mime;
  if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
  else if(data[0]===255&&data[1]===216)mime='image/jpeg';
  else if(data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP')mime='image/webp';
  else if(data.subarray(0,3).toString()==='GIF')mime='image/gif';
  else throw Error('Formato de imagen no compatible con el visor: '+path.basename(file));
  return 'data:'+mime+';base64,'+data.toString('base64');
}

export function buildReview(options,{variantExporter=exportVariants}={}){
  if(!options.maps||!options.photo||!options.output)throw Error('Faltan --maps, --photo o --output.');
  const maps=fs.realpathSync(path.resolve(options.maps)),photo=fs.realpathSync(options.photo),output=path.resolve(options.output);
  if(!fs.statSync(maps).isDirectory())throw Error('--maps debe ser una carpeta.');
  if(path.extname(output).toLowerCase()!=='.html')throw Error('La salida del visor debe terminar en .html.');
  if(path.dirname(output)===maps)throw Error('Guarda el visor fuera de maps para conservar esa carpeta solo para los PNG.');
  const assets=fileURLToPath(new URL('../assets/review/',import.meta.url));
  const brandFile=options.brand?path.resolve(options.brand):path.join(assets,'brand.json');
  const brand=options.brand||fs.existsSync(brandFile)?validateBrand(readJSON(brandFile)):{};
  const prompts=options.prompts?readJSON(options.prompts):{};
  const exports=variantExporter({maps});
  const variants=(exports.files||[]).map(file=>{
    if(!/^Material_(Roughness|Specular_UE)_Contraste_[123]\.png$/.test(file.name))throw Error('Nombre de variante no permitido: '+file.name);
    const number=file.name.match(/_([123])\.png$/)[1];
    return [file.name,(file.source==='Material_Roughness.png'?'Rugosidad':'Specular UE')+' · contraste '+number,'Variante de contraste '+number+' derivada del mapa original.',file];
  });
  const files={'__source':photo};let width,height;
  const entries=[...definitions,...variants].map(([filename,label,description,variant])=>{
    const file=fs.realpathSync(path.join(maps,filename));
    if(path.dirname(file)!==maps||!fs.statSync(file).isFile())throw Error('El mapa debe ser un archivo dentro de maps: '+filename);
    const image=decodePNG(fs.readFileSync(file)),{width:w,height:h,channels}=image;
    if(width===undefined){width=w;height=h;}
    if(w!==width||h!==height||w!==h)throw Error('Todos los PNG deben ser cuadrados y del mismo tamaño.');
    if(channels!==(rgbMaps.has(filename)?3:1))throw Error('Formato de canales incorrecto: '+filename);
    files[filename]=file;
    let record=prompts[filename];
    if(variant){
      const source=prompts[variant.source],original=typeof source==='string'?{text:source,exact:false}:source||{};
      record={...original,derived_from:variant.source,operation:variant.recipe+' · '+variant.variant,recipe:variant.recipe,variant:variant.variant,profile:variant.profile};
    }else if(filename==='Material_Normal_GL.png'&&!record&&prompts['Material_Normal_DX.png']){
      const dx=prompts['Material_Normal_DX.png'];record=typeof dx==='string'?{text:dx,exact:false,derived_from:'Material_Normal_DX.png',operation:'G = 255 - G'}:{...dx,derived_from:'Material_Normal_DX.png',operation:'G = 255 - G'};
    }
    const prompt=typeof record==='string'?{text:record,exact:false}:record?{text:record.text||record.prompt||'',exact:record.exact===true,reference_roles:record.reference_roles||[],derived_from:record.derived_from||null,operation:record.operation||null,recipe:record.recipe||null,variant:record.variant||null,profile:record.profile||null}:null;
    return {filename,label,description,src:dataURL(file),format:'8 bits, '+(channels===3?'RGB':'gris')+'.',prompt};
  });
  const photoData=dataURL(photo);
  const cases=[{id:'01',name:options.name||'Material PBR',zone:options.zone||'',photo:photoData,width,height,maps:entries}];
  let html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
  for(const logo of ['logo-dark.png','logo-light.png'])html=html.replace('src="'+logo+'"',()=> 'src="'+dataURL(path.join(assets,logo))+'"');
  html=html.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>\n'+fs.readFileSync(path.join(assets,'styles.css'),'utf8')+'\n</style>');
  html=html.replace(/\s*<script src="[^"]+" defer><\/script>/g,'');
  let scripts='<script>window.PBR_CASES = '+inlineJSON(cases)+';\nwindow.PBR_BRAND = '+inlineJSON(brand)+';\n</script>\n';
  for(const file of ['pbr-math.js','pbr-viewer.js','review.js'])scripts+='<script>\n'+fs.readFileSync(path.join(assets,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>\n';
  html=html.replace('</body>',()=>scripts+'</body>');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html,'utf8');
  const photoExt={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[photoData.slice(5,photoData.indexOf(';'))];
  const portablePhoto=path.join(path.dirname(output),'Foto_referencia.'+photoExt);
  const sameFile=process.platform==='win32'?photo.toLowerCase()===portablePhoto.toLowerCase():photo===portablePhoto;
  if(!sameFile)fs.copyFileSync(photo,portablePhoto);
  files.__source=portablePhoto;
  const relative=file=>path.relative(path.dirname(output),file).split(path.sep).join('/');
  const relativeFiles=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,relative(file)]));
  const manifest=path.join(path.dirname(output),'review-files.json');
  fs.writeFileSync(manifest,JSON.stringify({html:path.basename(output),files:relativeFiles,mapsDirectory:{type:'directory',path:relative(maps),caseId:'01',entries:entries.map(map=>map.filename)}},null,2),'utf8');
  const launcher=path.join(path.dirname(output),'Iniciar_visor.mjs');fs.copyFileSync(fileURLToPath(new URL('serve-review.mjs',import.meta.url)),launcher);
  return {output,bytes:Buffer.byteLength(html),images:entries.length+1,map_files:entries.length,prompts_present:entries.filter(map=>map.prompt?.text&&!map.prompt.derived_from).length,manifest,launcher,exports};
}

const isCLI=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCLI){
  try{
    const options={};for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!key.startsWith('--')||process.argv[i+1]===undefined)throw Error('Usa --maps CARPETA --photo FOTO --output ARCHIVO.html [--prompts prompts.json] [--brand brand.json] [--name MATERIAL]');options[key.slice(2)]=process.argv[i+1];}
    console.log(JSON.stringify(buildReview(options)));
  }catch(error){console.error(error.message);process.exitCode=1;}
}

