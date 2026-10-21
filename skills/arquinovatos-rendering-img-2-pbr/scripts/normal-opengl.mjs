#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Lossless normal-data conversion: R and B unchanged, G = 255 - G.
import fs from 'node:fs';
import path from 'node:path';
import {inflateSync,deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);tag.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([tag,data])),data.length+8);return out;}
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
export function decodePNG(bytes){
  if(!bytes.subarray(0,8).equals(signature))throw Error('La imagen debe ser PNG.');
  let header,idats=[],ended=false;
  for(let at=8;at<bytes.length;){
    if(at+12>bytes.length)throw Error('PNG truncado.');
    const length=bytes.readUInt32BE(at),end=at+12+length;if(end>bytes.length)throw Error('PNG truncado.');
    const type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,end-4);
    if(crc(bytes.subarray(at+4,end-4))!==bytes.readUInt32BE(end-4))throw Error('CRC de PNG no válido.');
    if(type==='IHDR')header=Buffer.from(data);
    if(type==='IDAT')idats.push(data);
    if(type==='acTL')throw Error('Normal animado no compatible.');
    if(type==='IEND'){ended=true;break;}at=end;
  }
  if(!header||header.length!==13||!ended||!idats.length)throw Error('PNG incompleto.');
  const width=header.readUInt32BE(0),height=header.readUInt32BE(4),channels=header[9]===0?1:header[9]===2?3:header[9]===6?4:0;
  if(!width||!height||width*height>50000000||header[8]!==8||!channels||header[10]||header[11]||header[12])throw Error('Se requiere PNG gris/RGB/RGBA de 8 bits, sin entrelazado.');
  const stride=width*channels,raw=inflateSync(Buffer.concat(idats),{maxOutputLength:(stride+1)*height});
  if(raw.length!==(stride+1)*height)throw Error('Longitud de píxeles PNG no válida.');
  const data=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];if(filter>4)throw Error('Filtro PNG no válido.');
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=channels?data[i-channels]:0,b=y?data[i-stride]:0,c=y&&x>=channels?data[i-stride-channels]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      data[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return {width,height,channels,data};
}
export function encodePNG(image){
  const {width,height,channels,data}=image;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>50000000||![1,3,4].includes(channels)||data.length!==width*height*channels)throw Error('Datos PNG no válidos.');
  const stride=width*channels;
  const raw=Buffer.alloc((stride+1)*image.height);
  for(let y=0;y<image.height;y++)image.data.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);
  const header=Buffer.alloc(13);header.writeUInt32BE(image.width,0);header.writeUInt32BE(image.height,4);header[8]=8;header[9]=image.channels===3?2:6;
  if(channels===1)header[9]=0;
  return Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);
}
export function invertNormalPNG(bytes){
  const image=decodePNG(bytes);
  if(![3,4].includes(image.channels))throw Error('Normal requiere RGB/RGBA; no un mapa gris.');
  for(let i=1;i<image.data.length;i+=image.channels)image.data[i]=255-image.data[i];
  return encodePNG(image);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const options={};for(let i=2;i<process.argv.length;i+=2)options[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
    if(!options.input||!options.output)throw Error('Usa --input Material_Normal_DX.png --output Material_Normal_GL.png');
    const input=path.resolve(options.input),output=path.resolve(options.output),normalize=p=>process.platform==='win32'?p.toLowerCase():p;
    if(normalize(input)===normalize(output))throw Error('Conserva el Normal DX; usa otro archivo para OpenGL.');
    const original=fs.readFileSync(input),result=invertNormalPNG(original);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result);
    const image=decodePNG(result);console.log(JSON.stringify({output,width:image.width,height:image.height,channels:image.channels,bits:8,operation:'G = 255 - G; R/B unchanged'}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
