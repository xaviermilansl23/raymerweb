# Raymer Next.js

Versión React + Next.js (App Router y TypeScript) del portal de clientes `raymerweb`. Se creó en una carpeta independiente: no modifica Angular ni el backend NestJS.

## Levantar el proyecto en Windows

Necesitas Node.js 20.9 o superior y npm. En este equipo se detectó Node 22.20.0.

Abre una terminal PowerShell y ejecuta:

```powershell
cd C:\aproyect\raymernext
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abre **http://localhost:3001**. Deja esa terminal abierta. Para detenerlo, presiona **Ctrl+C**. Las próximas veces basta con entrar a la carpeta y ejecutar `npm run dev`; no vuelvas a copiar el archivo si ya lo configuraste.

### Conectar con los datos de Raymer

El archivo `.env.local` configura el servidor al que se conecta Next:

```env
BACKEND_URL=https://10.243.90.201:3000
BACKEND_ALLOW_SELF_SIGNED=true
```

Este es el mismo destino que utiliza el proxy del proyecto Angular. La API debe estar encendida y tu equipo debe tener acceso a esa red (o a ZeroTier, si corresponde). No agregues `/api` al final de `BACKEND_URL`. Reinicia Next después de cambiar variables.

Si ejecutas `raymerback` en tu propia computadora, puedes cambiar el destino a:

```env
BACKEND_URL=https://localhost:3000
BACKEND_ALLOW_SELF_SIGNED=true
```

Para iniciar también el backend, usa **otra terminal**:

```powershell
cd C:\aproyect\raymerback
npm install
npm run start:dev
```

El backend necesita su `.env`, PostgreSQL configurado con los datos y procedimientos de Raymer y los certificados `certs/cert.pem` y `certs/key.pem`. Revisa `../raymerback/README.md`. No hace falta arrancarlo localmente si ya usas un servidor Raymer accesible en la red. Este frontend no crea la base de datos ni inventa productos de ejemplo.

### Qué puerto usa cada parte

| Aplicación | Dirección |
| --- | --- |
| Next.js (nueva web) | http://localhost:3001 |
| Backend existente | https://10.243.90.201:3000 o https://localhost:3000 |
| Swagger del backend | https://HOST_DEL_BACKEND:3000/api-docs |

## Funciones incluidas

- Catálogo público, búsqueda por producto, marca, modelo y categoría; filtros de categoría y marca con etiquetas, rango de precio, orden y paginación con números, primera/última página y salto directo. El catálogo se consulta a la API y la búsqueda se aplica a los productos cargados, sin perder las etiquetas disponibles.
- Detalle de producto y galería de imágenes.
- Registro, inicio y cierre de sesión y renovación del token al expirar.
- Favoritos guardados en el backend y protegidos por sesión.
- Consulta y edición del perfil, cambio de contraseña.
- Cotización temporal con cantidades limitadas por stock, total, PDF y enlace a WhatsApp.
- Página de la empresa, combos, tema claro/oscuro y diseño adaptable a móviles.

## Experiencia visual para clientes

- Portada dedicada a computación y gaming, con un setup 3D de torre con ventiladores RGB, monitor, teclado y mouse, generado localmente con Three.js. Es una ilustración y no representa un SKU a la venta.
- Profundidad al mover el cursor, animación de ventiladores y control para pausar. No hay selectores de figuras abstractas.
- Logo original `public/favicon.png` destacado en cabecera, portada, pantalla del monitor 3D, bienvenida y pie de página. Paleta azul/celeste, morado/lila y acentos amarillo/naranja/rojo.
- Panel lateral compacto con botones de categorías y marcas. Cada botón abre una ventana pequeña con búsqueda y etiquetas de selección múltiple. Se pueden quitar selecciones individuales, limpiar un grupo o limpiar todos los filtros. Dentro de un grupo se incluyen las opciones seleccionadas; categorías y marcas se cruzan entre sí, junto con el precio y la búsqueda. Las marcas se agrupan sin duplicar mayúsculas/minúsculas. El mismo selector emergente se adapta al móvil.
- Control claro/oscuro visible en escritorio y móvil, con la preferencia guardada en el navegador. Redes sociales con sus iconos y nombres accesibles, sin texto visible junto al logo.
- Sección de armado de PCs, reparaciones informáticas y actualizaciones en **Nosotros** (`/nosotros#servicios`), con enlaces actualizados desde el catálogo y la navegación. Redes sociales recuperadas de `raymerweb`: Facebook, Instagram y TikTok.
- Fotos reales `public/outside.jpg` y `public/inside.png` en **Nosotros**, con una composición inclinada, imágenes optimizadas por Next.js y adaptación a móvil. El mapa de Leaflet con calles de OpenStreetMap aparece centrado debajo de la introducción y no requiere una clave de API. Se carga al entrar en pantalla, tiene zoom, un marcador con el logo y un botón para centrar el local. Usa las coordenadas del enlace de Google Maps original de Raymer (`-17.3902137, -66.1595044`); **Cómo llegar** abre ese mismo enlace. Para cambiar el local, actualiza `location` en `src/app/nosotros/page.tsx` y la dirección visible. El mapa requiere conexión a Internet; la dirección y el enlace permanecen disponibles aunque el proveedor no cargue. Para tráfico elevado, configura un proveedor de mapas apropiado en `src/components/store-map.tsx`, siguiendo la [política de uso de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
- Pantalla de bienvenida durante la carga inicial, con entrada directa al sitio y límite de espera. Aparece una vez por sesión del navegador; las cargas del catálogo usan skeletons y las rutas tienen su propio indicador.
- Transiciones entre páginas, entradas al desplazarse y microinteracciones en las tarjetas.
- Alternativa visual cuando WebGL no está disponible y respeto a `prefers-reduced-motion`. La escena limita la resolución, renderiza a unos 30 cuadros por segundo y suspende el renderizado cuando sale de pantalla o la pestaña queda oculta.
- Contenido orientado al cliente y estados de error sin direcciones privadas ni detalles de configuración.

Para volver a ver la bienvenida, abre una ventana privada o borra la clave `raymer-visited-v2` del almacenamiento de sesión de ese sitio. Las cargas rápidas pueden omitir gran parte de la animación; no se añade una espera artificial para completar un porcentaje.

Publica, oculta o elimina los banners y fotografías desde **Combos** en RaymerFront (Gerente o Superadmin). RaymerNext consulta los combos visibles en RaymerBack cada vez que se abre la página. Para configurar la tabla y los permisos en la base local, usa `scripts/apply-combos.cjs` de RaymerBack.

Las cotizaciones viven en memoria y se borran al recargar, salir o cambiar de cuenta. El PDF no crea ventas ni reservas. Los tokens se guardan bajo una clave independiente en el navegador, siguiendo el comportamiento del portal original; no comparte la sesión con Angular.

El catálogo y los favoritos muestran únicamente productos con al menos una unidad de stock válida. Se excluyen existencias cero, negativas, vacías o no finitas. El listado se vuelve a consultar al recuperar el foco o volver a una pestaña visible, conservando los filtros y ajustando el rango de páginas si cambia la disponibilidad.

## Compilar y ejecutar en producción

```powershell
cd C:\aproyect\raymernext
npm run typecheck
npm run build
npm start
```

El servidor usa el puerto 3001 también en producción. Requiere un proceso Node.js; no es una exportación estática. Configura `BACKEND_URL` en el entorno del servidor con un backend que tenga un certificado TLS válido o una CA confiable. `BACKEND_ALLOW_SELF_SIGNED=true` se acepta **únicamente durante desarrollo**, sin desactivar la verificación TLS global de Node.

### Subir a la nube

La aplicación incluye salida `standalone` y un `Dockerfile`. No se ha publicado en ningún proveedor. En un hosting compatible con Next.js, selecciona esta carpeta como raíz del proyecto y usa `npm ci` para instalar y `npm run build` para compilar. El comando `npm start` permite ejecutar el build normal; un despliegue standalone debe ejecutar su `server.js` con los archivos de `public` y `.next/static` copiados, como hace el Dockerfile.

Configura `BACKEND_URL=https://tu-api-raymer.example` como variable privada del servidor y no habilites `BACKEND_ALLOW_SELF_SIGNED` en producción. La API debe ser accesible **desde el hosting**: una dirección privada como `10.243.90.201` requiere una conexión privada desde ese servidor o reemplazarse por el dominio HTTPS público de la API. No basta con que esa red funcione en tu computadora.

Ejemplo con Docker instalado, desde la carpeta del proyecto:

```powershell
docker build -t raymer-web .
docker run --rm -p 3001:3001 -e BACKEND_URL=https://tu-api-raymer.example raymer-web
```

Reemplaza el dominio de ejemplo por el real. El contenedor ejecuta Node como un usuario sin privilegios y no incluye `.env.local` en la imagen. Docker no fue ejecutado durante la revisión local; sí se verificó la compilación standalone de Next.js.

Para las pruebas de integración, ejecuta `npm run build` y luego `npm test`. Se usa una API local desechable para verificar las páginas, métodos HTTP, tokens, consultas, imágenes y errores de conexión; no modifica datos reales. Esto no sustituye la prueba de ingreso y catálogo contra un backend Raymer accesible.

## Estructura

- `src/app`: páginas y rutas de Next.js.
- `src/components`: catálogo, formularios, perfil, cotización y estado compartido de React.
- `src/lib`: modelos compatibles con la API existente, cliente HTTP, proxy y PDF.
- `public`: logo e imágenes heredadas.

El navegador consulta `/api` y `/uploads` en Next; Next las reenvía al backend fijo configurado. No necesitas modificar el CORS del backend para este flujo. Nunca coloques secretos del backend en variables `NEXT_PUBLIC_*`.

## Si algo falla

- **El catálogo no conecta**: revisa `.env.local`, el backend, la conexión a su red y los certificados. Después reinicia Next. La página muestra una explicación para el cliente; los detalles de configuración están en esta guía.
- **Puerto ocupado**: detén la otra instancia o ejecuta `npx next dev -p 3002` y abre http://localhost:3002.
- **PowerShell bloquea npm.ps1**: usa `npm.cmd install` y `npm.cmd run dev`.
- **Catálogo vacío**: se muestran solamente productos con stock, como en Angular. Revisa los datos del backend.
- **Error de usuario o permisos**: se utilizan cuentas de clientes (`auth-cliente`), no cuentas administrativas de `raymerfront`.

Referencia de instalación: https://nextjs.org/docs/app/getting-started/installation
