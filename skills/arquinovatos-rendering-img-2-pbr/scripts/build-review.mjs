#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const options={};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!key.startsWith('--')||process.argv[i+1]===undefined)throw Error('Usa --maps CARPETA --photo FOTO --output ARCHIVO.html [--prompts prompts.json] [--name MATERIAL]');options[key.slice(2)]=process.argv[i+1];}
try{
  if(!options.maps||!options.photo||!options.output)throw Error('Faltan --maps, --photo o --output.');
  const maps=path.resolve(options.maps),photo=fs.realpathSync(options.photo),output=path.resolve(options.output);
  if(path.extname(output).toLowerCase()!=='.html')throw Error('La salida del visor debe terminar en .html.');
  if(path.dirname(output)===maps)throw Error('Guarda el visor fuera de maps para conservar solo los seis PNG finales en esa carpeta.');
  const definitions=[['Material_BaseColor.png','Albedo','Color del material sin iluminación.'],['Material_Normal_DX.png','Normal DX','Relieve aparente de la superficie.'],['Material_Roughness.png','Rugosidad','Respuesta mate o brillante.'],['Material_AO.png','Oclusión','Oclusión ambiental en cavidades.'],['Material_Specular_UE.png','Specular UE','Intensidad de reflexión dieléctrica.'],['Material_Height.png','Altura','Altura relativa para desplazamiento.']];
  const prompts=options.prompts?JSON.parse(fs.readFileSync(options.prompts,'utf8')):{};
  const dataURL=file=>{const data=fs.readFileSync(file);let mime;if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(data[0]===255&&data[1]===216)mime='image/jpeg';else if(data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP')mime='image/webp';else if(data.subarray(0,3).toString()==='GIF')mime='image/gif';else throw Error('Formato de imagen no compatible con el visor: '+path.basename(file));return 'data:'+mime+';base64,'+data.toString('base64');};
  const files={'__source':photo};let width,height;
  const entries=definitions.map(([filename,label,description])=>{
    const file=fs.realpathSync(path.join(maps,filename)),bytes=fs.readFileSync(file);
    if(bytes.length<29||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('El mapa no es un PNG válido: '+filename);
    const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);if(width===undefined){width=w;height=h;}if(w!==width||h!==height||w!==h)throw Error('Los seis mapas deben ser cuadrados y del mismo tamaño.');
    files[filename]=file;const record=prompts[filename],prompt=typeof record==='string'?{text:record,exact:false}:record?{text:record.text||record.prompt||'',exact:record.exact===true,reference_roles:record.reference_roles||[]}:null;
    const channels={0:'gris',2:'RGB',3:'indexado',4:'gris y alfa',6:'RGBA'}[bytes[25]]||'canales por comprobar';
    return {filename,label,description,src:dataURL(file),format:bytes[24]+' bits, '+channels+'.',prompt};
  });
  const cases=[{id:'01',name:options.name||'Material PBR',zone:options.zone||'Material seleccionado en la fotografía original.',photo:dataURL(photo),width,height,note:options.note||'Estimación artística. Revisa continuidad, registro y respuesta física antes de usar el material en producción.',maps:entries}];
  const assets=fileURLToPath(new URL('../assets/review/',import.meta.url));
  let html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
  html=html.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>\n'+fs.readFileSync(path.join(assets,'styles.css'),'utf8')+'\n</style>');
  html=html.replace(/\s*<script src="[^"]+" defer><\/script>/g,'');
  const json=JSON.stringify(cases).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  let scripts='<script>window.PBR_CASES = '+json+';\n</script>\n';
  for(const file of ['pbr-math.js','pbr-viewer.js','review.js'])scripts+='<script>\n'+fs.readFileSync(path.join(assets,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>\n';
  html=html.replace('</body>',()=>scripts+'</body>');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html,'utf8');
  const manifest=path.join(path.dirname(output),'review-files.json');fs.writeFileSync(manifest,JSON.stringify({html:path.basename(output),files},null,2),'utf8');
  const launcher=path.join(path.dirname(output),'Iniciar_visor.mjs');fs.copyFileSync(fileURLToPath(new URL('serve-review.mjs',import.meta.url)),launcher);
  console.log(JSON.stringify({output,bytes:Buffer.byteLength(html),images:7,prompts_present:entries.filter(m=>m.prompt?.text).length,manifest,launcher}));
}catch(error){console.error(error.message);process.exitCode=1;}
