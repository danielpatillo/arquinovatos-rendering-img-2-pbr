import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../skills/arquinovatos-rendering-img-2-pbr/assets/review/library.js',import.meta.url),'utf8');
class Element{
  constructor(){this.children=[];this.events=new Map();this.value='';this.dataset={};}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  setAttribute(name,value){this[name]=value;}
  addEventListener(name,callback){const events=this.events.get(name)||[];events.push(callback);this.events.set(name,events);}
  async fire(name){await Promise.all((this.events.get(name)||[]).map(fn=>fn({currentTarget:this})));}
}
const item=(id,name)=>({id,name,createdAt:'2026-10-23T12:00:00.000Z',updatedAt:'2026-10-23T12:00:00.000Z',status:'ready',available:true,hasViewer:true,mapCount:13,href:'/materials/'+id,thumbnail:''});
const initial=item('old','Piedra anterior'),recent=item('new','Madera nueva');
function boot(fetcher){
  const nodes=new Map(),document=new Element(),window=new Element(),intervals=[],requests=[];
  document.visibilityState='visible';document.documentElement=new Element();document.documentElement.dataset.theme='dark';
  document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};document.createElement=()=>new Element();
  window.PBR_LOCAL_BRIDGE={origin:'http://127.0.0.1:50001',token:'test-only-token'};window.PBR_LIBRARY=[initial];window.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};
  vm.runInNewContext(source,{window,document,Date,localStorage:{setItem(){}},location:{reload(){}},fetch:async(url,options)=>{requests.push({url,options});return fetcher();}},{filename:'library.js'});
  return {nodes,document,window,intervals,requests};
}
const titles=nodes=>nodes.get('library-grid').children.map(card=>card.children[1].textContent);
test('the visible history discovers new materials automatically and preserves the active filter; hidden tabs stay idle',async()=>{
  const env=boot(async()=>({ok:true,json:async()=>({materials:[recent,initial],warnings:0})}));
  assert.equal(env.intervals.length,1,'The catalogue needs a scheduled local refresh');assert.equal(env.intervals[0].ms,30000);
  env.nodes.get('library-search').value='piedra';await env.nodes.get('library-search').fire('input');
  env.document.visibilityState='hidden';await env.intervals[0].fn();assert.equal(env.requests.length,0);
  env.document.visibilityState='visible';await env.document.fire('visibilitychange');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(env.requests.length,1);assert.deepEqual(titles(env.nodes),['Piedra anterior']);assert.equal(env.nodes.get('library-count').textContent,'2 materiales guardados');
  env.nodes.get('library-search').value='';await env.nodes.get('library-search').fire('input');assert.deepEqual(titles(env.nodes),['Madera nueva','Piedra anterior']);
});
test('focus and timer events share an in-flight refresh instead of duplicating requests',async()=>{
  let complete;const response=new Promise(resolve=>complete=resolve),env=boot(()=>response);
  const a=env.window.fire('focus'),b=env.window.fire('focus');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(env.requests.length,1);
  complete({ok:true,json:async()=>({materials:[recent,initial],warnings:0})});await Promise.all([a,b]);assert.deepEqual(titles(env.nodes),['Madera nueva','Piedra anterior']);
});
test('a malformed refresh response keeps the previous history usable for search and retry',async()=>{
  const env=boot(async()=>({ok:true,json:async()=>({materials:null,warnings:0})}));
  await env.nodes.get('refresh-library').fire('click');env.nodes.get('library-search').value='piedra';await env.nodes.get('library-search').fire('input');
  assert.deepEqual(titles(env.nodes),['Piedra anterior']);assert.equal(env.nodes.get('refresh-library').disabled,false);assert.ok(env.nodes.get('library-status').textContent.length>0);
});
