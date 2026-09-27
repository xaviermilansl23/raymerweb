import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { AuthService } from './auth.service';
import { ProductsComponent } from '../features/products/products.component';

describe('Presentación del catálogo', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(),
    { provide: AuthService, useValue: { isAuthenticated: signal(false), clienteId: signal(null) } },
  ] }));

  it('intersecta categoría, marca y precio; reinicia la página y permite limpiar', () => {
    const fixture = TestBed.createComponent(ProductsComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.url.endsWith('/mobile/productos')).flush([
      { producto_id: 1, nombre: 'A', tipo_producto_id: 1, marca: ' Samsung ', precio_venta: 100 },
      { producto_id: 2, nombre: 'B', tipo_producto_id: 1, marca: 'samsung', precio_venta: 200 },
      { producto_id: 3, nombre: 'C', tipo_producto_id: 2, marca: 'Samsung', precio_venta: 100 },
      { producto_id: 4, nombre: 'D', tipo_producto_id: 1, marca: 'Sony', precio_venta: 100 },
      { producto_id: 5, nombre: 'E', tipo_producto_id: 1, marca: null, precio_venta: 100 },
    ]);
    http.expectOne(r => r.url.endsWith('/mobile/tipo-producto')).flush([]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.brands().length).toBe(2);
    component.selectCategory('1');
    const select = fixture.nativeElement.querySelector('#marca-filtro') as HTMLSelectElement;
    select.value = 'marca:samsung';
    select.dispatchEvent(new Event('change'));
    expect(component.filtered().map(p => p.producto_id)).toEqual([1, 2]);
    component.page.set(3);
    const max = fixture.nativeElement.querySelector('#precio-max') as HTMLInputElement;
    max.value = '100';
    max.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.page()).toBe(1);
    expect(component.filtered().map(p => p.producto_id)).toEqual([1]);
    component.selectBrand('none');
    expect(component.filtered().map(p => p.producto_id)).toEqual([5]);
    component.selectBrand('marca:samsung');
    component.selectCategory('2');
    expect(component.filtered().map(p => p.producto_id)).toEqual([3]);
    component.clearFilters();
    expect(component.filtered().length).toBe(5);
  });

  it('muestra sin stock para 0, stock bajo para 1 y 7, y sin aviso para 8', async () => {
    const harness = await RouterTestingHarness.create('/productos');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.url.endsWith('/mobile/productos')).flush([0, 1, 7, 8].map((stock, i) => ({
      producto_id: i + 1, nombre: `Producto ${i}`, precio_venta: 100, stock_disponible: stock,
      imagen_url: null, tipo_producto_id: null, tipo_producto_nombre: null,
    })));
    for (const req of http.match(r => r.url.endsWith('/mobile/tipo-producto'))) req.flush([]);
    harness.detectChanges();
    const cards = harness.routeNativeElement!.querySelectorAll('.product-card');
    expect(cards.length).toBe(4);
    expect(cards[0].querySelector('.product-stock-badge')?.textContent).toContain('Sin stock');
    expect(cards[1].querySelector('.product-stock-badge')?.textContent).toContain('Stock bajo');
    expect(cards[2].querySelector('.product-stock-badge')?.textContent).toContain('Stock bajo');
    expect(cards[3].querySelector('.product-stock-badge')).toBeNull();
  });

  it('muestra marca y modelo en el detalle público', async () => {
    const harness = await RouterTestingHarness.create('/productos/12');
    TestBed.inject(HttpTestingController).expectOne(r => r.url.endsWith('/mobile/productos/12')).flush({
      producto_id: 12, nombre: 'Cámara', marca: 'Hikvision', modelo: 'DS-2CD',
      precio_venta: 100, stock_disponible: 7, imagenes: [],
    });
    harness.detectChanges();
    const details = harness.routeNativeElement!.querySelector('.product-specs')!;
    expect(details.textContent).toContain('Hikvision');
    expect(details.textContent).toContain('DS-2CD');
  });
});
