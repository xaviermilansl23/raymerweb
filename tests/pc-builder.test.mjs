import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/pc-builder.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}});
const {readBuild,highlights}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('Recupera el armado sin confiar en precios guardados',()=>{
  const r=readBuild(JSON.stringify({items:[{producto_id:1,cantidad:2}],uso:'gaming',resolucion:'1440p',presupuesto:7000,total:1}));
  assert.deepEqual(r,{items:[{producto_id:1,cantidad:2}],uso:'gaming',resolucion:'1440p',presupuesto:7000});
  assert.equal('total' in r,false);
});
test('Descarta enlaces dañados, duplicados, cantidades fuera de rango y selecciones excesivas',()=>{
  for(const raw of ['{','null',JSON.stringify({items:[{producto_id:0,cantidad:1}]}),JSON.stringify({items:[{producto_id:1,cantidad:5}]}),JSON.stringify({items:[{producto_id:1,cantidad:1},{producto_id:1,cantidad:1}]}),JSON.stringify({items:Array.from({length:25},(_,i)=>({producto_id:i+1,cantidad:1}))})]) assert.equal(readBuild(raw),null);
});
test('No adopta usos, resoluciones o presupuestos inválidos desde un enlace',()=>{
  const r=readBuild(JSON.stringify({items:[],uso:'<script>',resolucion:'x',presupuesto:-1}));assert.equal(r.uso,'gaming');assert.equal(r.resolucion,'1080p');assert.equal(r.presupuesto,7000);
});
test('Explica cantidades de RAM por kit, no por módulo',()=>{
  assert.deepEqual(highlights({ficha:{tipo_componente:'ram',especificaciones:{tipo_ram:'DDR5',capacidad_gb:32,modulos:2}}}),['DDR5','32 GB','2 módulos/kit']);
});
