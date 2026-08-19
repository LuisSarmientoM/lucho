# Referencia privada: browser frontend security

## Objetivo

Guía de revisión de seguridad para código que corre en el navegador: DOM XSS, URL/navegación, `postMessage`, storage/cookies, CSP, client secrets, third-party scripts/service workers y CSRF cuando aplique. No incluye revisión de backend.

## Cuándo cargarla

Carga esta referencia cuando el diff incluya archivos `.js`, `.ts`, `.jsx`, `.tsx`, `.html`, `.css` o manifests de frontend que se ejecuten en el navegador, o que configuren CSP, headers de seguridad o scripts inyectados.

## Checks

### DOM XSS

- Rastrea valores provenientes de `location.*`, `document.URL`, `document.documentURI`, `window.name`, `postMessage`, parámetros de query/hash hasta sinks peligrosos.
- Sinks peligrosos: `innerHTML`, `outerHTML`, `document.write`, `eval`, `setTimeout`/`setInterval` con string, `new Function`, `script.textContent`, `location.href = ...`, `location.replace(...)`.
- Revisa frameworks: React `dangerouslySetInnerHTML`, Vue `v-html`, Angular `[innerHTML]`, jQuery `html()`.
- Valores interpolados en templates sin escaping son sospechosos.

### URL y navegación

- Revisa `window.open(url)`, `location.href = url`, `location.replace(url)` con URLs parcialmente controladas por el usuario.
- Revisa open redirects y phishing vía parámetros de retorno.
- Valida URLs con allowlist o `new URL()` y comparación de origin/protocol.

### postMessage

- Revisa `window.addEventListener('message', ...)`; confirma validación de `event.origin` antes de usar `event.data`.
- Revisa `postMessage(data, '*')` y falta de `targetOrigin` restrictivo.

### Storage y cookies

- Revisa almacenamiento de tokens/secrets en `localStorage`/`sessionStorage`; es accesible por JS y vulnerable a XSS.
- Revisa cookies sin `HttpOnly`, `Secure`, `SameSite` cuando el cambio toque la configuración.
- No reproduzcas valores de storage en el reporte; redacta evidencia.

### CSP

- Revisa meta tags y headers `Content-Security-Policy`; busca `unsafe-inline`, `unsafe-eval`, `*` o ausencia de CSP.
- Un CSP permisivo no es por sí solo una vulnerabilidad, pero amplía la superficie de XSS.

### Client secrets

- Busca API keys, tokens, client secrets embebidos en bundles de frontend.
- Distingue claves públicas de claves privadas; las segundas nunca deben ir al cliente.

### Third-party scripts y service workers

- Revisa scripts cargados desde CDN sin SRI (`integrity`), especialmente si provenienen de dominios de terceros.
- Revisa registro y comportamiento de service workers: scope, interceptación de fetch y cache poisoning.
- Revisa importación dinámica de scripts desde URLs controladas por el usuario.

### CSRF en frontend

- Aplica solo cuando el frontend realice peticiones state-changing con cookies de sesión tradicional sin token anti-CSRF.
- Las SPAs con tokens en header no suelen ser vulnerables a CSRF clásico; no lo reportes como tal salvo evidencia concreta.

## Límites

- No revises lógica de backend, bases de datos ni servidores aquí.
- No ejecutes `npm install`, builds que modifiquen archivos, ni pruebas contra servidores de producción.
- No reportes patrones auto-escapados por el framework como vulnerables sin evidencia de bypass.
