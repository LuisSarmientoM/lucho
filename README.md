# Lucho

Configuración local de Pi para trabajar con una conversación pragmática y una pipeline SDD opcional para trabajo sustancial; las tareas pequeñas se resuelven directamente.

## Comportamiento

- Las tareas pequeñas y claras se resuelven directamente.
- Ante trabajo sustancial o ambiguo, el agente padre propone brevemente un SDD conversacional.
- Una confirmación natural (`ok`, `dale`, `sigue`, `continúa`) acepta solo la propuesta inequívoca inmediatamente anterior.
- Antes de editar, el padre presenta alcance, archivos, validación y riesgos, y espera confirmación explícita.
- Las acciones sensibles, destructivas, irreversibles o externas conservan una confirmación propia.
- El cierre guarda en Engram decisiones, resultado verificado y pendientes; no cada salida intermedia.

## Arquitectura

El agente padre mantiene el contexto y coordina. Para trabajo sustancial o ambiguo corre la pipeline SDD; para tareas pequeñas actúa directamente.

Pipeline SDD (fases, en orden):

- `lucho-manager` → `sdd/{change-name}/manager` (propuesta): investiga read-only (codegraph primero) y define problema, alcance, resultados esperados y decisiones de producto, es un Product Manager.
  - `lucho-analyst` → `sdd/{change-name}/analyst` (spec): convierte la propuesta en una spec verificable y un diseño técnico coherente, es un System Analyst.
- `lucho-lead` → `sdd/{change-name}/lead` (tareas): convierte la spec en una lista ordenada de tareas pequeñas y verificables, es un technical Lead.
- `lucho-research` → `sdd/{change-name}/research` (veredicto): puerta pre-implementación que contrasta los artifacts con la solicitud original; `no-go` detiene el flujo, es un Tech lead con otro rol.
- `lucho-coder` → `sdd/{change-name}/coder` (implementación): único escritor; lee los artifacts e implementa marcando las tareas como hechas, es un Software Engineer.
- `lucho-verify` → `sdd/{change-name}/verify` (reporte): validación independiente contra la spec y las tareas, es un Quality Engineer.

Cada fase lee los artifacts de las fases anteriores desde Engram (`sdd/{change-name}/{fase}`) y guarda el suyo. `agents/_shared/sdd-phase-common.md` aporta el protocolo común, inyectado por `sync-to-pi.sh` en los agentes SDD.

- `lucho-security` (opt-in): revisor de seguridad read-only, activado solo por solicitud explícita del padre. No es una fase automática, no delega y no aplica parches.

Los subagentes no delegan. Las tareas pequeñas y claras se resuelven directamente, sin pipeline. La revisión de seguridad entra solo cuando el padre la solicita.

`extensions/model-router.ts` conserva el enrutamiento y fallback de modelos. `sync-to-pi.sh` copia `APPEND_SYSTEM.md`, `settings.json`, `agents/*.md`, `extensions/*.ts` y `references/` al runtime configurado e inyecta `agents/_shared/sdd-phase-common.md` en los agentes SDD; no elimina archivos obsoletos del destino.

## Formato de los agentes SDD

Todos los agentes de la pipeline comparten el mismo contrato:

- Frontmatter con `name`, `description`, `model`, `effort` y `tools` (allowlist). El read-only se impone quitando `edit`/`write` de `tools`; no existe un campo `readonly` en pi-subagents.
- Secciones: rol, `Forma de trabajar`, `Límites`, `Instructions` (referencias a artifacts previos y pasos), `Engram save (mandatory)` (plantilla exacta del artifact) y `Result Contract`.
- `Result Contract` uniforme: `status` (`done | blocked | partial`), `executive_summary` (una frase), `artifacts` (topic_keys), `next_recommended`, `risks` y `skill_resolution`. `lucho-research` y `lucho-verify` añaden `verdict`.
- El protocolo común (`agents/_shared/sdd-phase-common.md`) fija la recuperación de artifacts (`mem_get_observation` obligatorio tras `mem_search`), la persistencia (`capture_prompt: false`) y que la respuesta final sea texto, no una tool call.

## Referencias privadas

Los documentos bajo `references/security/` son referencias internas cargadas bajo demanda por `lucho-security`; no son skills ni se invocan con comandos:

- `references/security/wordpress.md`: WordPress PHP/plugins/themes.
- `references/security/node-backend.md`: Node/TypeScript servidor.
- `references/security/browser-frontend.md`: navegador / frontend.
- `references/security/supply-chain-ci.md`: manifests, lockfiles, workflows, Docker, IaC.

## Activación

Después de sincronizar o copiar los archivos al runtime de Pi, ejecuta `/reload` o reinicia Pi. La eliminación de agentes obsoletos ya presentes en un runtime global requiere una migración destructiva separada y explícitamente autorizada.
