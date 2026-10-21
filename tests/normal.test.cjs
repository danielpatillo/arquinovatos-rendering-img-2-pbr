const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAF0lEQVR4nGNoaPjvcOID4x2RLSqvTwMAM/sHd8hC+7kAAAAASUVORK5CYII=','base64');
test('OpenGL conversion inverts only green, without changing red, blue, size or precision',async()=>{
  const codec=await import(pathToFileURL(path.resolve(__dirname,'../skills/arquinovatos-rendering-img-2-pbr/scripts/normal-opengl.mjs')));
  const source=codec.decodePNG(fixture),result=codec.decodePNG(codec.invertNormalPNG(fixture));
  assert.equal(result.width,2);assert.equal(result.height,2);assert.equal(result.channels,3);
  assert.deepEqual([...source.data],[128,128,255,64,200,240,220,20,180,0,255,127]);
  for(let i=0;i<source.data.length;i++)assert.equal(result.data[i],i%3===1?255-source.data[i]:source.data[i]);
  assert.deepEqual(codec.decodePNG(codec.invertNormalPNG(codec.invertNormalPNG(fixture))).data,source.data);
  const damaged=Buffer.from(fixture);damaged[damaged.length-1]^=1;
  assert.throws(()=>codec.decodePNG(damaged),/CRC/);
});
