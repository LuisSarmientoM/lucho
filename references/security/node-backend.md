# Referencia privada: Node/TypeScript backend security

## Objetivo

Guía de revisión de seguridad para código servidor en Node.js/TypeScript: Express, NestJS, Fastify y similares. No incluye DOM/React checks.

## Cuándo cargarla

Carga esta referencia cuando el diff incluya archivos `.js` o `.ts` que se ejecuten en el servidor: rutas, controladores, middleware, modelos, servicios, utilidades de backend, workers o scripts de servidor.

## Checks

### Autenticación y autorización

- Confirma que los endpoints sensibles requieran autenticación (JWT, sesión, API key, etc.).
- Verifica que la autorización valide ownership/role/permission, no solo presencia de token.
- Revisa manejo de `Authorization`, cookies (`httpOnly`, `Secure`, `SameSite`) y CSRF cuando aplique a API tradicionales con cookies.
- No reportes como bypass el uso de secretos server-controlled; rastrea si el atacante puede modificar el claim/rol.

### Parsing de body y query

- Revisa que el parser de body (`express.json`, `body-parser`, etc.) tenga límites razonables.
- Verifica validación de esquemas (zod, joi, class-validator, express-validator) antes del uso.
- No uses `req.query` o `req.body` directamente en sinks sin validación.
- Revisa `Content-Type` confusion y nested object injection (`foo[bar]=baz`).

### SQL y NoSQL injection

- SQL: busca string concatenation/template literals con valores de `req.*`; confirma uso de placeholders/ORM parametrizado.
- NoSQL: busca objetos mongo (`{ $ne: null }`) provenientes de `req.query`/`req.body` sin validación; usa `ObjectId.isValid()` y sanitización de operadores.

### Command, file y path injection

- Rastrea `exec`, `spawn`, `child_process.*`, `shelljs`, evaluación dinámica con entrada de usuario.
- Rastrea `fs.*`, `path.join`, `path.resolve`, `sendFile`, descargas de archivos con rutas derivadas de entrada.
- Valida allowlist de comandos, argumentos separados, y paths dentro de directorios permitidos.

### SSRF

- Rastrea `fetch`, `axios`, `http.request`, `got`, `node-fetch` con URLs parcial o totalmente controladas por el usuario.
- Distingue URLs server-controlled (config/env) de URLs atacante (`req.query.url`, webhooks sin validar).
- Considera bypasses con DNS rebinding, redirects y esquemas no HTTP.

### Prototype pollution

- Revisa `Object.assign`, spread de objetos, `lodash.merge`, asignaciones recursivas con claves como `__proto__`, `constructor`, `prototype`.
- Valida/esquematiza objetos antes de mergear opciones de configuración.

### Secrets y logging

- Busca credenciales hardcoded, API keys, private keys, tokens en código.
- Revisa que logs no incluyan contraseñas, tokens, datos de tarjetas o PII sensible.
- Valores de `process.env` son server-controlled; no los reportes como entrada atacante.

### Rate limiting y HTTP/config

- Revisa rate limiting en endpoints sensibles (login, password reset, webhooks, APIs públicas).
- Verifica headers de seguridad básicos y configuración de CORS cuando el cambio los toque.
- Revisa ` helmet()`, `cors()`, `trust proxy`, `X-Forwarded-For` si afectan al diff.

## Límites

- Aplica únicamente a código servidor. No revises DOM, React, Vue u otros checks de navegador aquí.
- No ejecutes `npm install`, migraciones, cambios en la base de datos ni modificaciones de archivos.
- No reportes CVE sin verificar la versión en lockfile o auditoría ejecutada.
