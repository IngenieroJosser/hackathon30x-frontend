<div align="center">

# Blinka Decision Engine

### Facturas que se entienden. Decisiones que se explican. Límites que se respetan.

**Agente de decisiones de pago simuladas · Hackathon 30X**

Construido por **ZYRA** como propuesta tecnológica independiente para el reto de **Blinka**.

`Next.js 16` · `React 19` · `TypeScript` · `OpenAI` · `Prisma 7` · `Neon PostgreSQL`

**Solo datos ficticios · Sin transferencias reales · Decisiones auditables**

</div>

---

## El reto

Los equipos de finanzas reciben facturas, verifican acuerdos, consultan beneficiarios, solicitan aprobaciones y registran decisiones de forma manual. **Blinka Decision Engine** demuestra cómo un agente puede reducir ese trabajo sin sobrepasar las políticas que define una empresa.

El alcance termina en una **decisión simulada**, no en la ejecución de un pago:

| Resultado | Significado |
| --- | --- |
| `AUTHORIZED` | La factura cumple los controles y queda autorizada **solo en el sandbox**. |
| `BLOCKED` | Existe un incumplimiento que impide autorizarla. |
| `ESCALATED` | Hace falta intervención o revisión humana antes de avanzar. |

Cada expediente conserva la decisión, la regla aplicada, su justificación y los eventos asociados. **El modelo de IA extrae datos; no decide por sí mismo si una factura se paga.** Esa decisión pertenece al motor de políticas en el servidor.

## Capacidades principales

- **Ingesta documental:** PDF, PNG y texto de facturas, correos o mensajes ficticios.
- **Extracción estructurada con OpenAI:** número, beneficiario, importe, moneda, fechas, concepto, advertencias y evidencias.
- **Políticas configurables:** límite autónomo, límite absoluto, presupuesto del periodo, estado del beneficiario y límite de su acuerdo.
- **Motor determinista:** verifica documentos, detecta duplicados, consulta acuerdos y presupuesto y decide `AUTHORIZED`, `BLOCKED` o `ESCALATED`.
- **Supervisión humana:** un usuario con rol `APPROVER` resuelve excepciones elegibles con justificación obligatoria y revalidación de las condiciones vigentes.
- **Auditoría persistente:** eventos con usuario, fecha, resultado, regla y snapshots de la política y los datos relevantes.
- **Autenticación y autorización:** sesiones individuales y permisos RBAC aplicados en el servidor.
- **Autonomía acotada para la demo:** los documentos del conjunto sintético certificado pueden verificarse y evaluarse automáticamente cuando la extracción coincide con sus referencias.

## Cómo funciona

```mermaid
flowchart TD
    A[Factura ficticia: PDF, PNG o texto] --> B[Extracción estructurada con IA]
    B --> C{¿Documento verificable?}
    C -->|Fixture certificado y datos coincidentes| D[Verificación automática]
    C -->|Incompleto, desconocido o ambiguo| E[Revisión documental humana]
    E -->|Datos confirmados| F[Motor de reglas]
    D --> F
    F --> G{Resultado}
    G -->|Cumple las políticas| H[AUTHORIZED: autorización simulada]
    G -->|Incumple una regla obligatoria| I[BLOCKED]
    G -->|Requiere aprobación| J[ESCALATED]
    J --> K[APPROVER: aprobar o rechazar]
    K --> L[Revalidación y registro]
    H --> M[Neon: decisión y auditoría]
    I --> M
    L --> M
```

**Principio de seguridad:** un resultado de OpenAI nunca habilita directamente una autorización. El backend valida los datos y aplica las políticas mediante operaciones transaccionales. La aprobación humana tampoco puede ignorar duplicados, límites absolutos, beneficiarios no permitidos ni presupuestos insuficientes.

## Producto

| Ruta | Función |
| --- | --- |
| `/` | Dashboard y visión general del workspace. |
| `/politicas` | Configuración y versionado de reglas. |
| `/beneficiarios` | Directorio, estados y acuerdos comerciales. |
| `/facturas` | Registro, carga y extracción de documentos. |
| `/facturas/[id]` | Expediente, verificaciones, decisión y evidencias. |
| `/aprobaciones` | Solicitudes que necesitan autorización humana. |
| `/auditoria` | Trazabilidad y consulta transversal de eventos. |

El diseño es una **propuesta conceptual independiente** para la hackathon; no es una aplicación oficial de Blinka.

## Arquitectura

```text
app/
  api/
    auth/session/                 Inicio y cierre de sesión
    invoices/                     Registro y consulta
    invoices/intake/              Extracción e ingesta documental
    invoices/[id]/certify/        Certificación de fixtures conocidos
    invoices/[id]/verify/         Verificación de campos
    invoices/[id]/evaluate/       Evaluación de reglas
    invoices/[id]/reopen/         Reapertura controlada
    approvals/[id]/resolve/       Resolución humana
    workspace/                    Datos del workspace
    workspace/actions/            Políticas y beneficiarios
  ...                             Rutas de interfaz
src/
  server/
    security/                     Sesiones, contraseñas y RBAC
    workflows/                    Extracción, motor y auditoría
    db/                           Prisma + Neon
  components/                     Interfaz y módulos
  lib/                            Validaciones y lógica reutilizable
prisma/
  schema.prisma                   Modelo de datos
  migrations/                     Migraciones versionadas
scripts/
  seed.ts                         Organización y datos ficticios
  bootstrap-auth.ts               Cuentas ADMIN, APPROVER y AUDITOR
  smoke-*.sh                      Pruebas de integración y seguridad
public/demo/facturas/            14 casos sintéticos y manifiesto SHA-256
tests/                           Pruebas automatizadas
```

**Responsabilidades:** OpenAI realiza extracción; Next.js implementa las APIs; el motor de reglas evalúa condiciones; Prisma y PostgreSQL conservan el estado, las reservas presupuestarias, decisiones y eventos. No hay integración con bancos ni proveedores de pagos.

## Requisitos

- **Node.js 22** o versión compatible con Next.js 16.
- **Yarn 4.14.1** mediante Corepack.
- Una base de datos **Neon PostgreSQL**.
- Una clave de la **API de OpenAI** para extracción de PDF e imágenes.
- `python3` y `curl` para los scripts de comprobación.

## Instalación local

```bash
corepack enable
yarn install
```

Crea un archivo `.env` en la raíz del proyecto. **No subas credenciales al repositorio.**

```dotenv
# Conexión de aplicación: host de Neon con pooler
DATABASE_URL="postgresql://USUARIO:CONTRASENA@HOST-POOLER/neondb?sslmode=require"

# Conexión para migraciones, seed y bootstrap: sin pooler
DIRECT_URL="postgresql://USUARIO:CONTRASENA@HOST-DIRECTO/neondb?sslmode=require"

OPENAI_API_KEY="TU_CLAVE_PRIVADA"
OPENAI_EXTRACTION_MODEL="gpt-4.1-mini"
BLINKA_DEMO_ORGANIZATION_SLUG="atlas-global-demo"
```

`DATABASE_URL` y `DIRECT_URL` deben apuntar a **la misma base y rama de Neon**. El ejemplo de modelo corresponde al valor predeterminado del código; utiliza un modelo de tu cuenta compatible con la extracción y las entradas multimodales previstas.

### Preparar la base de datos

```bash
yarn db:generate
yarn db:deploy
yarn db:seed
```

El seed inicializa la organización ficticia **Atlas Global Inc.**, 14 beneficiarios de demostración y una política inicial en USD. Esa política establece un umbral autónomo de **USD 1.000**, un límite absoluto de **USD 5.000** y un presupuesto mensual de **USD 10.000**. Son parámetros de prueba, modificables desde la aplicación.

### Crear las cuentas de demostración

Crea `.env.auth.local` con correos distintos y contraseñas privadas de **14 a 256 caracteres**:

```dotenv
BLINKA_ADMIN_EMAIL="admin@atlas.example"
BLINKA_ADMIN_PASSWORD="REEMPLAZAR_POR_CONTRASENA_SEGURA"
BLINKA_APPROVER_EMAIL="approver@atlas.example"
BLINKA_APPROVER_PASSWORD="REEMPLAZAR_POR_CONTRASENA_SEGURA"
BLINKA_AUDITOR_EMAIL="auditor@atlas.example"
BLINKA_AUDITOR_PASSWORD="REEMPLAZAR_POR_CONTRASENA_SEGURA"
```

Carga las variables en tu terminal y ejecuta el aprovisionamiento:

```bash
set -a
source .env
source .env.auth.local
set +a

yarn auth:bootstrap
```

> **Importante:** ejecutar otra vez `auth:bootstrap` actualiza las contraseñas y revoca las sesiones existentes de esas cuentas. No debe formar parte del build ni de cada despliegue.

### Iniciar la aplicación

```bash
yarn dev
```

Abre **http://localhost:3000** e inicia sesión con una de las cuentas anteriores.

## Roles y separación de funciones

| Operación | `ADMIN` | `APPROVER` | `AUDITOR` |
| --- | :---: | :---: | :---: |
| Consultar expedientes y auditoría | Sí | Sí | Sí |
| Registrar y verificar facturas | Sí | No | No |
| Evaluar y reabrir facturas | Sí | No | No |
| Modificar políticas y beneficiarios | Sí | No | No |
| Resolver solicitudes de aprobación | No | Sí | No |

Los permisos se verifican en **cada endpoint protegido**, no únicamente en los botones de la interfaz. Se utilizan contraseñas derivadas con `scrypt`, cookies de sesión `HttpOnly`, controles de origen para escrituras y bloqueos temporales tras intentos de acceso fallidos.

## Dataset de la hackathon

El proyecto incluye **14 documentos completamente sintéticos** en [`public/demo/facturas/`](./public/demo/facturas/) y su [`manifest.json`](./public/demo/facturas/manifest.json) con huellas SHA-256.

| Escenario | Ejemplo | Comportamiento esperado |
| --- | --- | --- |
| Factura válida | A01 · Nexa Software, USD 620 | Autorización simulada si cumple la política vigente. |
| Supera el umbral autónomo | A02 · Andes Cloud, USD 1.800 | Escalar para aprobación humana. |
| Cobro duplicado | A03 y A04 | Bloquear el duplicado una vez registrado el original. |
| Beneficiario no autorizado | A05 | Bloquear. |
| Importe superior al acuerdo | A06 | Bloquear. |
| Límite absoluto excedido | A07 | Bloquear. |
| Moneda distinta de USD | A08 · EUR | Escalar; no se realiza conversión FX. |
| Información incompleta | A09, A12 y A14 | Retener para verificación. |
| Inyección de instrucciones | A10 | Ignorar instrucciones del documento y aplicar solo reglas. |
| Factura en imagen | A11 | Extraer y verificar como los demás documentos. |
| Factura en texto | A13 | Extraer y evaluar según disponibilidad y reglas. |

### Autonomía certificada — v16

La verificación automática **no depende de confiar ciegamente en lo que indique la IA**. Solo se habilita cuando:

1. El archivo coincide byte a byte, mediante **SHA-256**, con un documento del dataset certificado.
2. Número, beneficiario, importe, moneda y vencimiento extraídos coinciden con la referencia del manifiesto.
3. No faltan campos críticos ni existen alertas documentales materiales.
4. La extracción se produjo mediante el modo de IA requerido por ese control.

Si se cumplen esas condiciones, la aplicación verifica el expediente y ejecuta el motor de reglas. **El resultado esperado que figura en el manifiesto no se utiliza para decidir**: lo calcula el motor con la política y el estado de Neon en ese momento.

Un documento desconocido, modificado o ambiguo **requiere confirmación humana**. Las leyendas «documento ficticio» y «sin validez fiscal» no constituyen, por sí solas, errores de extracción.

Detalles: [`docs/autonomia-certificada.md`](./docs/autonomia-certificada.md).

## Demostración recomendada

1. Ingresa como `ADMIN` y revisa la política y los beneficiarios.
2. Carga `public/demo/facturas/01-factura-valida.pdf` desde `/facturas`. En un sandbox limpio, si OpenAI extrae correctamente los campos y se mantienen las condiciones originales, debería obtener `AUTHORIZED / ALL_POLICIES_PASSED` **sin pago real**.
3. Carga `02-aprobacion-humana.pdf`: un importe superior al umbral autónomo debe generar `ESCALATED`.
4. Ingresa como `APPROVER`, abre `/aprobaciones`, escribe una justificación y resuelve la solicitud. El servidor reevalúa las reglas antes de registrar una autorización simulada.
5. Ingresa como `AUDITOR` y verifica la decisión, el motivo, el usuario, el momento y el historial en `/auditoria`.
6. Prueba después un duplicado, un beneficiario no permitido y una factura incompleta. Ninguno debe terminar indebidamente en `AUTHORIZED`.

Si la factura A01 ya existe, una nueva carga podría bloquearse por duplicidad: **es un resultado de seguridad esperado**, no una razón para desactivar controles.

## Scripts disponibles

| Comando | Propósito |
| --- | --- |
| `yarn dev` | Servidor local de desarrollo. |
| `yarn build` | Generar Prisma Client y compilar Next.js. |
| `yarn start` | Ejecutar el build de producción. |
| `yarn lint` | ESLint. |
| `yarn typecheck` | Validación de TypeScript. |
| `yarn check` | Lint, tests y tipos. |
| `yarn test:rules` | Pruebas automatizadas de reglas, regresión y seguridad. |
| `yarn test:smoke:auth` | Autenticación y RBAC contra la aplicación en ejecución. |
| `yarn test:smoke:integration` | Registro, evaluación y auditoría en Neon. |
| `yarn test:smoke:neon` | Persistencia y recuperación de datos de prueba. |
| `yarn db:generate` | Generar Prisma Client. |
| `yarn db:deploy` | Aplicar migraciones pendientes sin resetear datos. |
| `yarn db:migrate` | Crear migraciones durante desarrollo. |
| `yarn db:status` | Verificar estado de migraciones. |
| `yarn db:studio` | Abrir Prisma Studio. |
| `yarn db:seed` | Inicializar la organización y los beneficiarios de demo. |
| `yarn db:setup` | Generar cliente, aplicar migraciones y ejecutar seed. |
| `yarn auth:bootstrap` | Crear o actualizar cuentas y revocar sus sesiones previas. |
| `yarn demo:setup` | Ejecutar setup de BD y bootstrap de cuentas. |
| `yarn vercel-build` | Alias de compilación para Vercel. |

### Validación

Con `yarn dev` ejecutándose en otra terminal y con las variables de autenticación cargadas:

```bash
yarn test:rules
yarn build
yarn test:smoke:auth
yarn test:smoke:integration
```

Los **smoke tests interactúan con la base configurada**; el de integración registra facturas ficticias y eventos de auditoría. Úsalos contra una rama de prueba de Neon.

**Última evidencia reportada para v16:** 97/97 pruebas automatizadas correctas y build local de Next.js exitoso, con TypeScript y prerender sin fallos. En versiones previas se validaron también la matriz RBAC y un flujo de integración con Neon. **Sigue pendiente documentar una evaluación E2E completa de los 14 documentos y el flujo de aprobación humano en el despliegue final.**

## Despliegue en Vercel

Conecta el repositorio a Vercel y configura:

| Parámetro | Valor |
| --- | --- |
| Framework | Next.js |
| Install Command | `yarn install --immutable` |
| Build Command | `yarn build` |
| Output Directory | Valor predeterminado de Next.js |

En **Environment Variables** configura `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL` y `BLINKA_DEMO_ORGANIZATION_SLUG` para el entorno correspondiente.

**No ejecutes `db:seed`, `auth:bootstrap` ni migraciones en cada build.** Inicializa la base y las cuentas de forma controlada antes de publicar. Las credenciales de bootstrap (`BLINKA_*_PASSWORD`) no tienen que existir en Vercel para el inicio de sesión normal: los hashes de las cuentas ya creadas están en Neon.

Antes de exponer la demo públicamente, comprueba el inicio de sesión, la conexión a Neon, la cuota disponible de OpenAI, los permisos RBAC y el flujo desde `/facturas` hasta `/auditoria`. Protege las cuentas de demostración y rota cualquier credencial expuesta anteriormente.

## Cómo medir el éxito

La evaluación del reto se basa en tres criterios:

- **Autonomía:** proporción de facturas resueltas correctamente sin intervención humana. La autonomía certificada de v16 se limita al conjunto sintético conocido.
- **Seguridad:** **cero autorizaciones indebidas** respecto de las políticas vigentes. Una sola aprobación incorrecta invalida el objetivo de seguridad.
- **Explicabilidad:** cualquier persona autorizada puede reconstruir el motivo de la decisión sin inspeccionar el código.

Las pruebas unitarias ayudan, pero **no sustituyen** el contraste de los 14 documentos con resultados esperados ni una demostración end-to-end del proceso de aprobación.

## Límites del prototipo

- No procesa pagos reales, no mueve dinero, no abre cuentas y no realiza KYC, fraude ni decisiones regulatorias.
- Solo utiliza datos ficticios. **No cargues facturas de clientes reales.**
- La certificación automática de v16 es exclusiva de los archivos conocidos del manifiesto; no verifica autónomamente cualquier factura.
- Las políticas financieras de esta demo operan en **USD**. Los documentos en otras monedas se escalan; no existe conversión FX automática.
- El esquema contempla fechas de vigencia contractual, pero el motor actual **no comprueba `validFrom` y `validUntil`**; no debe afirmarse una validación de vigencia temporal que aún no está implementada.
- Los eventos se registran de forma persistente en Neon, pero la migración incluida **no impone inmutabilidad mediante triggers de base de datos**. No se presenta como un libro mayor criptográficamente inmutable.
- El resultado `AUTHORIZED` es una **autorización simulada** y reserva presupuesto en el sandbox; no equivale a una transferencia ejecutada.

---

<div align="center">

**Blinka Decision Engine · Hackathon 30X**

Una propuesta de **ZYRA** para automatizar decisiones financieras con límites, control humano y trazabilidad.

*Proyecto de demostración independiente. No afiliado oficialmente a Blinka.*

</div>
