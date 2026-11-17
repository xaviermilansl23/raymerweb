import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginationItems } from '../src/lib/pagination.mjs';

test('Un catálogo de una página mantiene la página 1',()=>assert.deepEqual(paginationItems(1,1),[1]));
test('Hasta siete páginas se pueden seleccionar directamente',()=>assert.deepEqual(paginationItems(3,7),[1,2,3,4,5,6,7]));
test('Al principio se muestra el acceso directo al final',()=>assert.deepEqual(paginationItems(1,19),[1,2,3,4,5,'gap',19]));
test('En el centro se muestran las vecinas y los extremos',()=>assert.deepEqual(paginationItems(10,19),[1,'gap',9,10,11,'gap',19]));
test('Al final se conserva el acceso al inicio',()=>assert.deepEqual(paginationItems(19,19),[1,'gap',15,16,17,18,19]));
test('Al reducir el catálogo se limita el rango de páginas',()=>assert.deepEqual(paginationItems(19,3),[1,2,3]));
