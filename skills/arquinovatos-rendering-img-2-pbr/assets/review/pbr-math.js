(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PBRMath=api;})(typeof window==='object'?window:this,function(){
  'use strict';
  const controls=[
    {key:'albedo',label:'Albedo',min:0,max:2,step:.05,value:1},
    {key:'normal',label:'Normal',min:0,max:3,step:.05,value:1},
    {key:'roughness',label:'Rugosidad',min:0,max:2,step:.05,value:1},
    {key:'roughnessContrast',label:'Contraste de rugosidad',min:0,max:3,step:.05,value:1,ratio:true},
    {key:'specular',label:'Specular',min:0,max:3,step:.05,value:1},
    {key:'specularContrast',label:'Contraste de specular',min:0,max:3,step:.05,value:1,ratio:true},
    {key:'ao',label:'Oclusión ambiental',min:0,max:2,step:.05,value:1},
    {key:'height',label:'Altura',min:0,max:.12,step:.002,value:.02,height:true}
  ];
  const defaults=()=>Object.fromEntries(controls.map(c=>[c.key,c.value]));
  function uniforms(input={}){
    const p={};for(const c of controls){const v=Number(input[c.key]??c.value);p[c.key]=Number.isFinite(v)?Math.max(c.min,Math.min(c.max,v)):c.value;}
    const curve=(gain,contrast,scale=1)=>[gain*contrast*scale,(gain*.5*(1-contrast)*scale)||0];
    return {albedo:p.albedo,normal:p.normal,roughness:curve(p.roughness,p.roughnessContrast),specular:curve(p.specular,p.specularContrast,.08),ao:p.ao,height:p.height};
  }
  function sphereGeometry(columns=128,rows=64){
    if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<3||rows<2||(columns+1)*(rows+1)>65535)throw Error('Resolución de esfera no compatible');
    const vertices=new Float32Array((columns+1)*(rows+1)*5),indices=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
      const theta=y/rows*Math.PI,phi=x/columns*Math.PI*2,i=(y*(columns+1)+x)*5;
      vertices.set([Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi),x/columns,1-y/rows],i);
      if(x<columns&&y<rows){const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
    return {vertices,indices:new Uint16Array(indices)};
  }
  return {controls,defaults,uniforms,sphereGeometry};
});
