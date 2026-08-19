# Referencia privada: supply-chain / CI security

## Objetivo

Guía de revisión de seguridad para manifests, lockfiles, workflows de CI/CD, Dockerfiles e infraestructura como código. Verificación lockfile-first; sin auditorías destructivas.

## Cuándo cargarla

Carga esta referencia cuando el diff incluya `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `poetry.lock`, `composer.json`, `composer.lock`, `Cargo.toml`, `Cargo.lock`, `go.mod`, `go.sum`, `pom.xml`, `build.gradle`, GitHub Actions, GitLab CI, Azure Pipelines, CircleCI, Jenkinsfiles, Dockerfiles, Docker Compose, Terraform, CloudFormation, Kubernetes manifests, Helm charts u otros archivos de supply-chain/CI/IaC.

## Checks

### Lockfile-first verification

- Antes de reportar una versión vulnerable, verifica la versión exacta en el lockfile (`package-lock.json`, `yarn.lock`, etc.), no solo en `package.json`.
- Si no puedes verificar la versión resuelta, declara la observación como `needs_verification`.
- No emitas claims de CVE sin confirmar versión afectada o auditoría ejecutada.

### Scripts de instalación y hooks

- Revisa `scripts` en `package.json`: `preinstall`, `postinstall`, `prepare` que ejecuten código arbitrario.
- Revisa `.npmrc`, `.yarnrc`, `corepack`, overrides/resolutions que puedan alterar dependencias.
- Revisa configuraciones de registro privado o proxies no verificados.

### GitHub Actions y workflows

- Revisa `actions/*` sin pin a SHA; prefer pinning de acciones de terceros a commit SHA inmutable.
- Revisa permisos del workflow (`permissions:`); minimiza a lo necesario (`contents: read` por defecto).
- Revisa `pull_request_target`, `workflow_run`, secrets en env/inputs, y ejecución de código de PRs sin checkout seguro.
- Revisa que los secrets (`secrets.*`) no se impriman en logs ni pasen a pasos no confiables.

### Docker

- Revisa imágenes base (`FROM`), etiquetas mutables (`latest`), y usuarios no root.
- Revisa exposición de puertos, copia de secretos en imágenes, y credenciales en `ENV`/`ARG`.
- Revisa `.dockerignore` para evitar filtrado de archivos sensibles al contexto de build.

### IaC

- Revisa políticas IAM/roles excesivamente permisivas, buckets/storage públicos, security groups abiertos (`0.0.0.0/0`).
- Revisa encriptación en reposo/transito, logging y versionado habilitados.
- Revisa variables sensibles en plan text o en outputs de Terraform/CloudFormation.

### Secrets en config/CI

- Busca API keys, tokens, private keys, passwords en workflows, archivos de config y manifests.
- Si detectas un secreto real, redacta la evidencia; no lo reproduzcas completo.
- Reporta la ubicación y el tipo, no el valor.

### Auditorías no ejecutadas

- Declara explícitamente si no ejecutaste `npm audit`, `yarn audit`, `pip-audit`, `trivy`, `snyk`, `govulncheck` u otra herramienta.
- Una observación de versión sospechosa sin auditoría ejecutada va a `needs_verification`, no a `confirmed_findings`.

## Límites

- No ejecutes comandos destructivos, builds, despliegues, publicaciones, commits ni pushes.
- No generes claims de CVE estáticos basados únicamente en nombres de paquetes.
- Limita el análisis a archivos dentro del alcance del diff; no audites todo el repositorio salvo instrucción explícita del padre.
