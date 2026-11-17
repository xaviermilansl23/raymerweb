import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, stockUnits } from '../src/lib/catalog-filters.mjs';

const products=[
  {producto_id:1,nombre:'Laptop A',marca:'Lenovo',tipo_producto_id:10,precio_venta:4000},
  {producto_id:2,nombre:'Laptop B',marca:'ASUS',tipo_producto_id:10,precio_venta:5500},
  {producto_id:3,nombre:'Monitor A',marca:'Lenovo',tipo_producto_id:20,precio_venta:1800},
  {producto_id:4,nombre:'Monitor B',marca:'Samsung',tipo_producto_id:20,precio_venta:2200},
  {producto_id:5,nombre:'Mouse',marca:'Logitech',tipo_producto_id:30,precio_venta:150},
  {producto_id:6,nombre:'Cable',marca:null,tipo_producto_id:null,precio_venta:35},
].map(product=>({...product,stock_disponible:5}));
const select=(changes={})=>filterProducts(products,{categories:[],brands:[],query:'',min:'',max:'',sort:'name',...changes}).map(p=>p.producto_id).sort((a,b)=>a-b);

test('Sin selecciones se incluyen todos los productos',()=>assert.deepEqual(select(),[1,2,3,4,5,6]));
test('Varias categorías incluyen los productos de cualquiera de ellas',()=>assert.deepEqual(select({categories:['10','20']}),[1,2,3,4]));
test('Varias marcas incluyen ambas marcas, sin distinguir mayúsculas del producto',()=>assert.deepEqual(select({brands:['lenovo','asus']}),[1,2,3]));
test('Categorías y marcas se cruzan sin perder opciones del mismo grupo',()=>assert.deepEqual(select({categories:['10','20'],brands:['lenovo','samsung']}),[1,3,4]));
test('Precio y búsqueda se combinan con la selección múltiple',()=>assert.deepEqual(select({categories:['10','20'],brands:['lenovo','asus'],min:'2000',max:'6000',query:'laptop'}),[1,2]));
test('Productos sin categoría y sin marca se pueden seleccionar',()=>assert.deepEqual(select({categories:['none','10'],brands:['none']}),[6]));
test('Una combinación sin coincidencias devuelve una lista vacía',()=>assert.deepEqual(select({categories:['30'],brands:['lenovo','asus']}),[]));

test('Los productos agotados y los stocks inválidos nunca aparecen en el catálogo',()=>{
  const invalid=[0,-3,null,undefined,'0',NaN,Infinity,'sin dato',.5];
  const items=[...invalid.map((stock_disponible,index)=>({...products[0],producto_id:100+index,stock_disponible})),{...products[0],stock_disponible:'2'}];
  assert.deepEqual(filterProducts(items,{categories:['10'],brands:['lenovo'],query:'',min:'',max:'',sort:'name'}).map(p=>p.producto_id),[1]);
});
test('El stock numérico se normaliza a unidades enteras válidas',()=>{
  assert.equal(stockUnits('3'),3);assert.equal(stockUnits(2.9),2);
  assert.equal(stockUnits(Infinity),0);assert.equal(stockUnits(-1),0);assert.equal(stockUnits(null),0);
});
