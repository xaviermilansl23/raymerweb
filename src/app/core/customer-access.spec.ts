import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { AuthService } from './auth.service';
import { CotizacionService } from './cotizacion.service';
import { FavoritosService } from './favoritos.service';
import { Producto } from './models';
import { safeReturnUrl, SessionAccessService } from './session-access.service';
import { createQuotationPdf, quotationFilename } from './quotation-pdf';

const producto: Producto = {
  producto_id: 1, nombre: 'Cámara de seguridad', descripcion: null, imagen_url: null,
  tipo_producto_id: 1, tipo_producto_nombre: 'Cámaras', precio_venta: 10.10, stock_disponible: 20,
};

describe('Acceso de clientes y cotización temporal', () => {
  const authenticated = signal(false);
  const clienteId = signal<number | null>(null);
  const signIn = () => { clienteId.set(1); authenticated.set(true); TestBed.flushEffects(); };

  beforeEach(() => {
    authenticated.set(false); clienteId.set(null);
    TestBed.configureTestingModule({ providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { isAuthenticated: authenticated, clienteId } },
    ] });
  });

  it('abre el inicio y los detalles sin sesión', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/productos');
    expect(harness.routeNativeElement?.textContent).toContain('Mi perfil');
    await harness.navigateByUrl('/productos/1');
    expect(TestBed.inject(Router).url).toBe('/productos/1');
  });

  for (const path of ['/perfil', '/favoritos']) {
    it(`protege el enlace directo ${path} y conserva el destino`, async () => {
      await RouterTestingHarness.create(path);
      const router = TestBed.inject(Router);
      const url = router.parseUrl(router.url);
      expect(url.root.children['primary'].segments[0].path).toBe('login');
      expect(url.queryParams['returnUrl']).toBe(path);
    });
  }

  it('pide iniciar sesión antes de cotizar y conserva el producto de origen', async () => {
    const router = TestBed.inject(Router);
    await RouterTestingHarness.create('/productos/1');
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    expect(TestBed.inject(SessionAccessService).requireSession('cotizacion')).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'cotizacion', returnUrl: '/productos/1' } });
  });

  it('no permite agregar cotizaciones como visitante', () => {
    const service = TestBed.inject(CotizacionService);
    expect(service.agregar(producto)).toBeFalse();
    expect(service.items()).toEqual([]);
  });

  it('agrupa productos, calcula importes y permite ajustar o eliminar cantidades', () => {
    signIn();
    const service = TestBed.inject(CotizacionService);
    service.agregar(producto); service.agregar(producto); service.agregar(producto);
    expect(service.items().length).toBe(1);
    expect(service.count()).toBe(3);
    expect(service.total()).toBe(30.30);
    service.cambiarCantidad(1, 2);
    expect(service.total()).toBe(20.20);
    service.quitar(1);
    expect(service.total()).toBe(0);
  });

  it('borra el borrador al cerrar sesión y no lo recupera al volver', () => {
    signIn();
    const service = TestBed.inject(CotizacionService);
    service.agregar(producto);
    authenticated.set(false); clienteId.set(null);
    expect(service.items()).toEqual([]);
    TestBed.flushEffects(); signIn();
    expect(service.items()).toEqual([]);
  });

  it('no comparte cotizaciones entre cuentas ni persiste al recrear el servicio', () => {
    signIn();
    const service = TestBed.inject(CotizacionService);
    const storage = spyOn(Storage.prototype, 'setItem');
    service.agregar(producto);
    expect(TestBed.runInInjectionContext(() => new CotizacionService()).items()).toEqual([]);
    expect(storage).not.toHaveBeenCalled();
    clienteId.set(2); TestBed.flushEffects();
    expect(service.items()).toEqual([]);
  });

  it('rechaza precios y cantidades inválidos', () => {
    signIn();
    const service = TestBed.inject(CotizacionService);
    expect(service.agregar({ ...producto, precio_venta: NaN })).toBeFalse();
    service.agregar(producto);
    service.cambiarCantidad(1, Infinity);
    expect(service.count()).toBe(1);
  });

  it('no agrega más unidades que el stock disponible', () => {
    signIn();
    const service = TestBed.inject(CotizacionService);
    const escaso = { ...producto, producto_id: 2, stock_disponible: 3 };
    expect(service.maximoAdicional(escaso)).toBe(3);
    for (let i = 0; i < 3; i++) expect(service.agregar(escaso)).toBeTrue();
    expect(service.count()).toBe(3);
    expect(service.agregar(escaso)).toBeFalse();
    expect(service.count()).toBe(3);
    expect(service.maximoAdicional(escaso)).toBe(0);
    service.cambiarCantidad(2, 5);
    expect(service.items().find((i) => i.producto.producto_id === 2)?.cantidad).toBe(3);
  });

  it('rechaza productos agotados y normaliza stock inválido', () => {
    signIn();
    const service = TestBed.inject(CotizacionService);
    expect(service.agregar({ ...producto, producto_id: 2, stock_disponible: 0 })).toBeFalse();
    expect(service.agregar({ ...producto, producto_id: 3, stock_disponible: -1 })).toBeFalse();
    expect(service.agregar({ ...producto, producto_id: 4, stock_disponible: NaN })).toBeFalse();
    expect(service.items()).toEqual([]);
  });

  it('no consulta ni guarda favoritos de visitantes', () => {
    const service = TestBed.inject(FavoritosService);
    service.ids().subscribe(ids => expect(ids).toEqual([]));
    service.listar().subscribe(items => expect(items).toEqual([]));
    let blocked = false;
    service.agregar(1).subscribe({ error: () => blocked = true });
    expect(blocked).toBeTrue();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('mantiene el guardado de favoritos de clientes autenticados', () => {
    signIn();
    TestBed.inject(FavoritosService).agregar(1).subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/mobile/favoritos/1');
    expect(request.request.method).toBe('POST');
    request.flush({ favorito: true, producto_id: 1 });
  });
});

describe('PDF y regreso desde el acceso', () => {
  it('rechaza destinos externos y bucles de acceso', () => {
    for (const url of ['https://example.com', '//example.com', '/login', '/registro', '/productos\\evil']) {
      expect(safeReturnUrl(url)).toBe('/productos');
    }
    expect(safeReturnUrl('/productos/12?q=camara')).toBe('/productos/12?q=camara');
  });

  it('genera un PDF válido sin modificar el borrador', async () => {
    const items = [{ producto, cantidad: 3 }];
    const before = JSON.stringify(items);
    const doc = await createQuotationPdf(items);
    expect(doc.output().startsWith('%PDF')).toBeTrue();
    expect(doc.getNumberOfPages()).toBe(1);
    expect(JSON.stringify(items)).toBe(before);
  });

  it('pagina cotizaciones largas y rechaza cotizaciones vacías', async () => {
    expect((await createQuotationPdf(Array.from({ length: 80 }, () => ({ producto, cantidad: 2 })))).getNumberOfPages()).toBeGreaterThan(1);
    await expectAsync(createQuotationPdf([])).toBeRejected();
  });

  it('nombra la descarga con la fecha local de Bolivia', () => {
    expect(quotationFilename(new Date('2026-09-13T02:00:00Z'))).toBe('cotizacion-raymer-2026-09-12.pdf');
  });
});
