# Web Vulnerability Control Mapping

**Español** | [English](README.en.md)

## Qué es

WVCM es una referencia educativa que conecta ejemplos básicos de Cross-Site
Scripting (XSS), SQL Injection y Command Injection con señales técnicas,
mitigaciones y relaciones con controles de seguridad. Está pensada para
estudiantes, analistas y personas que preparan una evaluación autorizada.

## Demo

[Abrir la demo](https://wvcm.sggaray.com)

![Referencia de payloads con filtros](docs/hero.png)

## Qué podés hacer

- Explorar payloads estáticos y filtrarlos por categoría, contexto o etiqueta.
- Revisar qué condiciones necesita cada ejemplo y qué señal podría producir.
- Analizar texto de respuestas HTTP y observar un conjunto acotado de headers
  de seguridad.
- Codificar y decodificar Base64, URLs y JSON con controles de fidelidad de
  datos.
- Calcular hashes MD5, SHA-1 y SHA-256 en el navegador. MD5 y SHA-1 sirven
  sólo como referencia o por compatibilidad, no para contraseñas ni firmas.
- Armar comandos nmap y curl para copiar y ejecutar en tu propio laboratorio.
- Consultar mappings conceptuales con OWASP Top 10, NIST SP 800-53 e ISO/IEC
  27001.

## Herramientas incluidas

Payload Reference, Analizador de headers HTTP, Hash, Base64, URL, JSON y
Commands. La interfaz está disponible en español e inglés; el
selector ES/EN guarda la preferencia en el navegador.

## Cómo interpreta la evidencia

Los estados del Analizador de headers HTTP describen únicamente lo observado
en la respuesta pegada. Que un header esté presente no significa que la
protección sea efectiva, y que no se observe no confirma una vulnerabilidad.

Un mapping indica una relación relevante, pero no demuestra que el control
esté implementado, sea efectivo ni determina compliance. Las señales deben
compararse, repetirse y corroborarse dentro del contexto técnico real.

## Qué no demuestra

WVCM:

- no ejecuta payloads;
- no escanea objetivos;
- no confirma vulnerabilidades ni explotación;
- no determina la efectividad de controles;
- no determina compliance;
- usa mappings como apoyo contextual, no como evidencia de implementación.

## Flujo de datos

Las siete herramientas procesan la entrada localmente en el navegador. Hash
calcula SHA-1 y SHA-256 con Web Crypto y MD5 con una implementación propia
(`lib/md5.ts`); el texto no se envía a ningún servidor ni se almacena. Web
Crypto sólo está disponible en contextos seguros (HTTPS o `localhost`); fuera
de ellos, Hash muestra un error en lugar de resultados.

Procesamiento local no significa funcionamiento sin conexión: la aplicación se
descarga desde el servidor cada vez que se abre y no incluye service worker ni
caché offline.

## Desarrollo local

Requiere Node.js 22.

```sh
npm ci
npm run dev
```

Abrí `http://localhost:3000`.

## Validación

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

La suite automatizada cubre parsing, límites de entrada, serialización de
comandos, mappings, fidelidad de datos, navegación e interacción accesible.
Después de `npm run build` también verifica el sitio exportado en `out/`:
cobertura de la CSP, archivos publicados y reglas de `_headers` y `_redirects`.

## Arquitectura y despliegue

WVCM es un sitio estático. `npm run build` ejecuta `next build` con
`output: "export"`, que escribe el sitio completo en `out/`, y después
`scripts/apply-csp.mjs`. Cloudflare publica `out/` como
[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
sin código de Worker: ninguna solicitud ejecuta código de la aplicación en el
servidor. La configuración está en `wrangler.jsonc`.

```sh
npm run preview
```

Compila el sitio y lo sirve localmente con el runtime de Cloudflare
(`wrangler dev`) en `http://localhost:8787`. `next start` no se usa: no
funciona con la exportación estática.

Para desplegar desde Cloudflare Workers Builds:

- Build command: vacío
- Deploy command: `npm run deploy` (`npm run build` + `wrangler deploy`)
- Preview command (ramas que no son de producción): `npm run upload`
  (`npm run build` + `wrangler versions upload`)

Los encabezados de respuesta salen sólo de `public/_headers`, que el build
copia a `out/_headers`. `next.config.mjs` no define `headers()`: en una
exportación estática no se ejecuta.

La `Content-Security-Policy` lleva en `script-src` los hashes SHA-256 de los
scripts inline que genera cada build. `public/_headers` contiene la misma
política sin hashes, que bloquea esos scripts. `scripts/apply-csp.mjs` calcula
los hashes a partir de los HTML exportados y los agrega a `out/_headers`. Si
algún script inline queda sin cubrir, o si `out/_headers` superaría los
límites de Cloudflare (100 reglas, 2.000 caracteres por línea), el build
falla. Como Cloudflare sirve exactamente esos archivos, la página servida no
puede tener scripts inline que la política no conozca. Con `next dev` no se
envía CSP. La política y su justificación están en `csp.mjs`.

`public/_redirects` hace que `/404` y `/404.html` respondan con estado 404, igual
que cualquier ruta inexistente.

## Uso autorizado

Usá WVCM sólo en sistemas propios o para los que tengas autorización escrita.
El proyecto es una ayuda educativa y no reemplaza una evaluación profesional.

## Licencia

MIT
