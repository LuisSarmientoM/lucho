# Lucho

Configuración local de Pi para trabajar con una conversación pragmática y una orquestación adaptativa, sin un workflow SDD rígido ni comandos obligatorios.

<img width="1280" height="640" alt="lucho-cover" src="https://github.com/user-attachments/assets/68da819a-6dc2-468c-943c-cd16337411af" />


## Comportamiento

- Las tareas pequeñas y claras se resuelven directamente.
- Ante trabajo sustancial o ambiguo, el agente padre propone brevemente un SDD conversacional.
- Una confirmación natural (`ok`, `dale`, `sigue`, `continúa`) acepta solo la propuesta inequívoca inmediatamente anterior.
- Antes de editar, el padre presenta alcance, archivos, validación y riesgos, y espera confirmación explícita.
- Las acciones sensibles, destructivas, irreversibles o externas conservan una confirmación propia.
- El cierre guarda en Engram decisiones, resultado verificado y pendientes; no cada salida intermedia.

## Arquitectura

El agente padre mantiene el contexto, decide cuánto explorar, sintetiza el plan y coordina la ejecución. Usa como máximo la topología local mínima necesaria:

- `lucho-explore`: investigación read-only para reducir incertidumbre.
- `lucho-worker`: único escritor de la implementación aprobada.
- `lucho-verify`: verificación independiente mediante lectura y comandos enfocados.

Los subagentes no delegan. No hay fases fijas: el recorrido normal es explorar solo si aporta valor, acordar un plan, implementar con un escritor y verificar con un agente independiente.

`extensions/model-router.ts` conserva el enrutamiento y fallback de modelos. `sync-to-pi.sh` copia `APPEND_SYSTEM.md`, `settings.json`, `agents/*.md` y `extensions/*.ts` al runtime configurado; no elimina archivos obsoletos del destino.

## Activación

Después de sincronizar o copiar los archivos al runtime de Pi, ejecuta `/reload` o reinicia Pi. La eliminación de agentes obsoletos ya presentes en un runtime global requiere una migración destructiva separada y explícitamente autorizada.
