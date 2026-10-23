import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const assets=new URL('../skills/arquinovatos-rendering-img-2-pbr/assets/review/',import.meta.url);
const [html,source]=await Promise.all(['index.html','review.js'].map(name=>readFile(new URL(name,assets),'utf8')));

class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.events=new Map();this.style={};this.dataset={};this.classList={add(){}};this.contentWindow={};this.sourceAssignments=0;}
  get src(){return this.source;}
  set src(value){this.source=value;this.sourceAssignments++;}
  get childElementCount(){return this.children.length;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  addEventListener(type,listener){const listeners=this.events.get(type)||[];listeners.push(listener);this.events.set(type,listeners);}
  fire(type,event={}){return Promise.all((this.events.get(type)||[]).map(listener=>listener({currentTarget:this,preventDefault(){},stopPropagation(){},...event})));}
  setAttribute(name,value){this[name]=value;}
  removeAttribute(name){delete this[name];}
  closest(){return new Element('nav');}
  contains(element){return element===this||this.children.includes(element);}
  getBoundingClientRect(){return {left:20,top:20,bottom:64,right:180};}
  focus(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
}

function boot({brand,bridge,fetcher}={}){
  const nodes=new Map([...html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(match=>{const element=new Element(match[1]);element.hidden=/\bhidden(?:\s|>)/.test(match[0]);return [match[2],element];}));
  const document=new Element();document.documentElement=new Element('html');document.documentElement.dataset.theme='dark';document.visibilityState='visible';document.getElementById=id=>nodes.get(id);document.createElement=tag=>new Element(tag);
  const requests=[],intervals=[];const window=new Element('window');window.PBR_BRAND=brand;window.PBR_LOCAL_BRIDGE=bridge;window.setInterval=(callback,milliseconds)=>{intervals.push({callback,milliseconds});return intervals.length;};
  const literal='Exact original prompt\nincluding actual newlines.';
  const maps=[{filename:'Material_Roughness_Contraste_1.png',label:'Roughness · Contraste 1',src:'maps/r01.png',prompt:{text:literal,exact:true,derived_from:'Material_Roughness.png',operation:'Contraste 1'}},{filename:'Material_Normal_GL.png',label:'Normal GL',src:'maps/gl.png',prompt:{text:literal,exact:true,derived_from:'Material_Normal_DX.png'}}];
  window.PBR_CASES=[{id:'01',name:'Material real',photo:'photo.png',width:1254,height:1254,maps}];window.createMaterialTester=()=>({load(){}});
  const context={window,document,URL,Event,location:{hash:'#material-01'},history:{replaceState(){}},navigator:{},innerWidth:1200,innerHeight:900,localStorage:{setItem(){}},fetch:async(url,options)=>{requests.push({url,options});return fetcher?fetcher(url,options):{ok:true,json:async()=>({})};}};
  vm.runInNewContext(source,context,{filename:'review.js'});
  return {nodes,window,document,requests,literal,intervals};
}

test('template removes QA copy and supplies required controls',()=>{
  assert.match(html,/<h1>Los mejores recursos para render en arquinovatos\.com<\/h1>/);
  assert.doesNotMatch(html,/id="case-note"|class="review"|<footer>|class="preview-note"/);
  for(const id of ['open-maps','specular-variant','download-specular','specular-variant-note'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/referrerpolicy="no-referrer"/);
  assert.match(html,/<a id="brand-whatsapp"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*aria-label="Ayuda por WhatsApp"[^>]*><svg width="26" height="26"/);
  assert.doesNotMatch(html,/<span>Ayuda por WhatsApp<\/span>/);
});

test('unconfigured brand stays hidden and does not make network requests',()=>{
  const {nodes,requests}=boot();
  for(const id of ['brand-social','brand-information','brand-whatsapp','brand-landing'])assert.equal(nodes.get(id).hidden,true,id);
  assert.equal(requests.length,0);assert.equal(nodes.get('open-maps').disabled,true);
});

test('folder action posts to real-map API with token, never a ZIP',async()=>{
  const {nodes,requests}=boot({bridge:{origin:'http://127.0.0.1:61299',token:'test-token'}});
  await nodes.get('open-maps').fire('click');
  assert.equal(requests.length,1);assert.equal(requests[0].url,'http://127.0.0.1:61299/api/open-maps');
  assert.equal(requests[0].options.method,'POST');assert.equal(requests[0].options.headers['X-PBR-Token'],'test-token');
  assert.deepEqual(JSON.parse(requests[0].options.body),{caseId:'01'});assert.match(nodes.get('open-maps-status').textContent,/abierta/);
});

test('contrast provenance retains literal source prompt and distinguishes Normal inversion',async()=>{
  const {nodes,literal}=boot();
  const cards=nodes.get('maps').children;
  await cards[0].children[3].children[0].fire('click');
  assert.equal(nodes.get('prompt-text').value,literal);assert.match(nodes.get('prompt-provenance').textContent,/Contraste calculado/);assert.doesNotMatch(nodes.get('prompt-provenance').textContent,/invertido/);
  await cards[1].children[3].children[0].fire('click');assert.match(nodes.get('prompt-provenance').textContent,/Normal Y invertido/);
});

test('remote landing uses approved URL only and rejects foreign resize messages',async()=>{
  const {nodes,window,requests}=boot({brand:{informationUrl:'https://brand.example/info',socialLinks:[{label:'Canal',url:'https://social.example/channel'},{label:'Invalid',url:'javascript:alert(1)'}],whatsappUrl:'https://wa.me/123',landingUrl:'https://brand.example/landing',revision:'r1'}});
  const frame=nodes.get('brand-landing-frame');assert.equal(frame.src,'https://brand.example/landing');assert.equal(nodes.get('brand-social').childElementCount,1);assert.equal(requests.length,0);
  await window.fire('message',{source:frame.contentWindow,origin:'https://foreign.example',data:{type:'arquinovatos:landing:resize',height:840}});assert.notEqual(frame.style.height,'840px');
  await window.fire('message',{source:{},origin:'https://brand.example',data:{type:'arquinovatos:landing:resize',height:840}});assert.notEqual(frame.style.height,'840px');
  await window.fire('message',{source:frame.contentWindow,origin:'https://brand.example',data:{type:'arquinovatos:landing:resize',height:840}});assert.equal(frame.style.height,'840px');
});

test('public config refreshes without credentials or material payload and preserves real revision',async()=>{
  let revision=1;const {nodes,window,document,requests}=boot({brand:{configUrl:'https://brand.example/config.json'},fetcher:async()=>({ok:true,json:async()=>({revision:revision++,landingUrl:'https://brand.example/current'})})});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(document.documentElement.dataset.brandRevision,'1');
  await window.fire('focus');assert.equal(document.documentElement.dataset.brandRevision,'2');assert.equal(nodes.get('brand-landing-frame').src,'https://brand.example/current');
  for(const request of requests){assert.equal(request.url,'https://brand.example/config.json');assert.equal(request.options.cache,'no-store');assert.equal(request.options.credentials,'omit');assert.equal(request.options.referrerPolicy,'no-referrer');assert.equal(request.options.body,undefined);}
});

test('live public-config polling skips hidden documents and reloads a changed landing revision',async()=>{
  let revision=1;const {nodes,document,requests,intervals}=boot({brand:{configUrl:'https://brand.example/config.json'},fetcher:async()=>({ok:true,json:async()=>({revision:revision++,landingUrl:'https://brand.example/current'})})});
  await new Promise(resolve=>setImmediate(resolve));
  const frame=nodes.get('brand-landing-frame'),assignments=frame.sourceAssignments;
  assert.equal(intervals.length,1);assert.equal(intervals[0].milliseconds,30000);
  document.visibilityState='hidden';await intervals[0].callback();assert.equal(requests.length,1);assert.equal(frame.sourceAssignments,assignments);
  document.visibilityState='visible';await intervals[0].callback();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,2);assert.equal(document.documentElement.dataset.brandRevision,'2');assert.equal(frame.sourceAssignments,assignments+1);
});
