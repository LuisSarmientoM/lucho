# Referencia privada: WordPress security

## Objetivo

Guía de revisión de seguridad para código PHP de WordPress: plugins, themes, hooks, REST API, AJAX, options/meta, shortcodes, uploads y admin/frontend.

## Cuándo cargarla

Carga esta referencia cuando el diff incluya archivos `.php` de un proyecto WordPress, o archivos que registren hooks, endpoints REST/AJAX, shortcodes, plantillas o funciones de admin.

## Checks

### Capabilities y nonces

- Verifica que cada acción sensible use `current_user_can()` con el capability mínimo adecuado.
- Confirma que los formularios y acciones de admin incluyan `wp_nonce_field()` / `check_admin_referer()` o `wp_verify_nonce()`.
- No asumas que `is_admin()` o `admin_init` implican autorización; valida capability.

### Entradas y salidas por contexto

- Identifica si el valor proviene de `$_GET`, `$_POST`, `$_REQUEST`, `$_SERVER`, `$_FILES`, `$_COOKIE`, la URL, el body JSON o parámetros REST/AJAX.
- Aplica sanitización según el contexto: `sanitize_text_field()`, `sanitize_email()`, `absint()`, `wp_kses_post()`, `esc_url_raw()`, `map_deep()`.
- Aplica escaping según el contexto de salida: `esc_html()`, `esc_attr()`, `esc_url()`, `esc_js()`, `wp_kses()`.
- No uses `$_POST` directamente en consultas ni salidas sin sanitizar/escapar.

### Base de datos: `$wpdb`

- Usa `$wpdb->prepare()` para cualquier consulta con datos dinámicos; nunca concatenes ni interpoles valores directamente.
- Los placeholders permitidos son `%d`, `%f`, `%s`; `%1\$s` está soportado en versiones recientes. Verifica compatibilidad de versiones si usas placeholders con índice.
- Evita pasar table names dinámicos sin allowlist; si es necesario, escapa con backticks y valida contra una lista fija.

### REST API y AJAX

- Revisa `register_rest_route()` y sus callbacks: valida `permission_callback` y argumentos con `validate_callback`.
- En AJAX, distingue `wp_ajax_*` (autenticado) de `wp_ajax_nopriv_*` (público). Confirma que las acciones públicas no expongan datos sensibles ni mutaciones.
- Los endpoints REST deben retornar `WP_Error` con códigos apropiados para authz fallida.

### Options, meta y transients

- No almacenes datos serializados/PHP sin necesidad; prefer estructuras simples o JSON.
- Para meta sensible, usa capabilities y considera cifrado si almacenas credenciales.
- Revisa `update_option`/`add_option` con valores provenientes de entrada de usuario.

### Uploads y archivos

- Valida tipo MIME real, extensión y tamaño. No confíes únicamente en `$_FILES['file']['type']`.
- Usa `wp_check_filetype_and_ext()` y `wp_handle_upload()` con los filtros adecuados.
- Evita escribir archivos subidos en directorios ejecutables.
- Revisa capacidades antes de permitir cualquier carga.

### Shortcodes

- Los atributos de shortcode son entrada atacante; sanitízalos y escápalos.
- No ejecutes `do_shortcode()` sobre contenido sin capacidad si proviene de usuarios no privilegiados.

### SSRF y deserialización

- Rastrea valores que lleguen a `wp_remote_get()`, `wp_remote_post()`, `file_get_contents()`, `curl_*`, `unserialize()`.
- `unserialize()` de datos de usuario es casi siempre un riesgo alto; busca JSON como alternativa.
- Las URLs externas deben validarse con allowlist cuando sea posible.

### Admin vs frontend

- El código en `wp-admin/` puede tener asumida una mayor confianza, pero sigue requiriendo capability y nonce.
- El frontend puede exponer datos a través de AJAX/REST; revisa qué información se filtra.

## Límites

- No revises stacks que no sean WordPress/PHP salvo que el padre lo solicite.
- No reportes como vulnerables patrones escapados/sanitizados correctamente por el framework.
- No ejecutes comandos destructivos, instalación de plugins ni modificaciones en la base de datos.
