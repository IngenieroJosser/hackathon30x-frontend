> **Actualización v13:** autenticación individual, RBAC, auditoría y migración incremental. Consulta [SEGURIDAD_Y_AUDITORIA_V13.md](./SEGURIDAD_Y_AUDITORIA_V13.md). La información sobre tokens compartidos en documentos v12 es histórica y ya no aplica.

# Blinka Decision Engine — v12 (Neon + OpenAI)

**Inicio rápido y contratos de integración:** [`BACKEND_INTEGRATION_V12.md`](./BACKEND_INTEGRATION_V12.md).

Todas las rutas funcionales del frontend usan PostgreSQL como fuente de verdad mediante las APIs protegidas. El producto es un sandbox con documentos sintéticos y **no ejecuta transferencias**.

---

# Blinka Decision Engine · Cinematic v9

**Concepto de producto ZYRA** para la hackathon 30X: un agente que interpreta facturas y decide autorizar en simulación, bloquear o escalar conforme a reglas configurables. No es un producto oficial de Blinka. **Todos los datos son sintéticos y nunca se mueve dinero.**

## Iniciar

Requiere Node.js 22+, Corepack/Yarn 4.14.1 e Internet para instalar Next.js y cargar Inter por `next/font/google`.

```bash
corepack enable
yarn install
yarn dev
```

Visita `http://localhost:3000/auditoria` para la auditoría, `http://localhost:3000/aprobaciones` para supervisión humana o `http://localhost:3000/esta-ruta-no-existe` para comprobar el 404.

```bash
yarn test:rules
# Después de instalar dependencias:
yarn lint
yarn build
```

## Rutas implementadas

| Ruta | Módulo |
|---|---|
| `/` | Dashboard cinematográfico, actividad, estadísticas y lote de pruebas |
| `/politicas` | Límites por factura, autonomía, presupuesto y versiones |
| `/beneficiarios` | Directorio de confianza, acuerdos y autorizaciones |
| `/facturas` | Ingesta de PDF/imagen/correo/texto y extracción opcional con IA |
| `/facturas/[id]` | Confirmación del documento, decisión, motivos y auditoría |
| `/aprobaciones` | Nueva mesa de supervisión humana con motivos obligatorios |
| `/auditoria` | Bitácora transversal, timeline, evidencias, filtros y exportación |
| `app/not-found.tsx` | Página 404 cinematográfica, accesos rápidos y video con poster |

## Novedades v9 — Página global `not-found`

- Página 404 diseñada para Blinka con la estética cinematográfica aprobada: video `/metal-human.mp4`, respaldo `/metal-human.jpg`, verde lima, Inter global, tipografía editorial y fondo oscuro.
- Rutas de salida accesibles sin JavaScript: dashboard, facturas, aprobaciones y auditoría. No se genera ninguna operación ni pago.
- Implementación como Server Component en `app/not-found.tsx`; sin tiempo, render dinámico, estado cliente ni API. No se monta el `AppShell` de operaciones para mantener una composición 404 propia.
- Estados de accesibilidad: `h1` único, navegación semántica, contraste, etiquetas, controles nativos y reducción de movimiento (oculta el video cuando `prefers-reduced-motion: reduce`).
- Verificación recomendada: abrir `/ruta-inexistente` y ` /facturas/no-existe` (esta última depende del tratamiento particular del expediente) y confirmar visualmente el estado 404; comprobar en móvil, con vídeo desactivado y con preferencias de movimiento reducido.

## Novedades v8 — `/auditoria` y bloqueo de prerender resuelto en código

### Corrección del error `blocking-prerender-current-time-client`

El componente `/aprobaciones` invocaba `assessHumanApproval()` durante render. Esta función llamaba `evaluateInvoiceSafely()`, que generaba `new Date().toISOString()`: Next 16 con `cacheComponents` lo considera una lectura temporal inestable en prerender.

- `src/lib/invoice-processing.ts` ahora expone `previewInvoiceDecision()` como función pura: no consulta tiempo, navegador ni efectos laterales. `assessHumanApproval()` usa esa función en `useMemo`.
- `evaluateInvoiceSafely()` conserva el sello de tiempo únicamente al registrar una decisión mediante una acción explícita; también acepta una fecha ISO inyectable para pruebas.
- `resolveInvoice()` conserva `evaluatedAt = reviewedAt` cuando una aprobación humana ejecuta la nueva evaluación.
- La prueba `tests/audit-timeline.test.mjs` sustituye temporalmente el constructor de `Date` para asegurar que la previsualización no invoca `new Date()` sin argumentos.

**No** se ha ejecutado un build completo ni verificado el prerender real de Next en este entorno por indisponibilidad del registro npm. Verificar con `yarn build` localmente.

### Auditoría transversal

- Hero cinematográfico con `/public/metal-human.mp4` y respaldo JPG, Inter global, grilla responsive y acceso directo al historial.
- Una línea de tiempo compuesta de eventos **registrados** de facturas, evaluaciones, aprobaciones, políticas y beneficiarios; orden descendente.
- Indicadores: eventos registrados, resoluciones humanas, versiones de políticas y cobertura de facturas con historial real.
- Búsqueda por factura, proveedor, regla o responsable; filtro por categoría; carga incremental en lotes de 12.
- Inspector de cada evento con motivo, actor, fecha, versión y snapshots de límites/beneficiario cuando están presentes; justificación humana para aprobaciones y rechazos; comparación antes/después para políticas; estado previo/nuevo para beneficiarios.
- Acceso al expediente `/facturas/[id]` y exportación JSON/CSV del conjunto filtrado.
- **No se inventan eventos retroactivos** para los 12 fixtures precargados: se etiquetan como **estado inicial sin historial** y se excluyen de la cobertura auditable. Para generar eventos observables, procesa el lote de prueba en `/facturas` o verifica una factura cargada.
- `src/lib/audit-timeline.ts` implementa toda la composición, búsqueda y medición como funciones puras; `src/components/audit/audit-page.tsx` gestiona solo la presentación y el estado del navegador.

### Prueba manual de integración

1. Abre `/aprobaciones` y confirma que aparece sin el error de `new Date()` reportado. Resuelve una solicitud elegible con motivo de al menos 12 caracteres.
2. Navega a `/auditoria`, filtra por **Aprobaciones humanas** y selecciona el evento. Comprueba motivo, actor, instantánea de política y enlace al expediente.
3. Publica un cambio permitido en `/politicas`; filtra **Versiones de políticas** y revisa el antes/después sin modificar el registro anterior.
4. Bloquea un beneficiario de prueba en `/beneficiarios` y encuentra el evento en **Beneficiarios**.
5. En `/facturas`, ejecuta el lote ficticio para registrar evaluaciones. Inspecciona el evento en `/auditoria` y exporta JSON/CSV filtrado.
6. Valida mobile, reducción de movimiento, búsqueda sin resultados y navegación entre módulos.

### Calidad y límites

- **68/68 pruebas** con `yarn test:rules`; 45 archivos TypeScript/TSX analizados sintácticamente y 11 CSS parseados.
- `localStorage` es editable, no es transaccional, no autentica actores, no está firmado y no constituye auditoría inmutable. Para producción, eventos append-only persistidos en backend, RBAC, idempotencia, control concurrente de presupuesto, marcas de tiempo confiables y firma/correlación de eventos.
- Los actores, facturas y estados son datos sintéticos. Ningún estado autoriza una transferencia real.

## Experiencia `/aprobaciones` (v7)

### Diseño

- Hero cinematográfico del humano metálico con `metal-human.mp4` optimizado, `metal-human.jpg` como respaldo, Inter global, verde lima y superficies oscuras.
- Indicadores de pendientes, aptas para aprobación, correcciones requeridas y decisiones humanas.
- Bandeja de solicitudes con búsqueda por proveedor, factura o regla; filtros; vencimientos; estados visuales.
- Inspector contextual con importe, beneficiario, acuerdo, política vigente, regla original, reevaluación, controles y expediente.
- Diálogo con justificación obligatoria, confirmación consciente y exportación JSON del historial local.
- Accesibilidad: etiquetas, estados anunciados, navegación con teclado, Escape, foco contenido en el diálogo, visualización móvil y `prefers-reduced-motion`.

### Reglas

- **Autorizar:** solo cuando `assessHumanApproval()` confirma `APPROVAL_REQUIRED`, sin ninguna infracción obligatoria. Se reevalúa también en `resolveInvoice()` al confirmar, no solo al abrir el diálogo.
- **Bloquear/rechazar:** una persona puede rechazar una solicitud pendiente con justificación. No puede usar la aprobación para ignorar duplicados, beneficiarios no autorizados, documentos no verificados, presupuestos insuficientes, moneda sin tipo de cambio o límites absolutos.
- **Autorización auditada:** se guardan autor ficticio, fecha, motivo, versión/política e identificación/revisión del beneficiario. Si los datos cambiaron, el inspector informa que se aplicará la configuración vigente.
- **Acciones centralizadas:** los controles directos del dashboard y del expediente remiten a `/aprobaciones?invoice=...`, que exige justificación.
- **Persistencia:** estado de facturas y eventos en `localStorage` únicamente para pruebas de una sesión/navegador. Sin backend, roles, bloqueo transaccional ni integridad de auditoría de producción.

### Prueba manual recomendada

1. En `/aprobaciones` abre la factura de **Andes Cloud** (`BIL-2026-0891`). Debe aparecer como elegible por exceder el umbral autónomo sin superar los otros límites.
2. Pulsa **Aprobar en sandbox** e intenta confirmar sin comentario: el botón debe permanecer inactivo. Escribe un motivo de al menos 12 caracteres, acepta la confirmación y autoriza.
3. Comprueba que pasa a **Resueltas**, registra al revisor ficticio y muestra el comentario. Regresa a `/`: el estado debe ser autorizado.
4. En `/beneficiarios`, bloquea a **Orbita Labs**; vuelve a `/aprobaciones` y selecciona su factura pendiente. La autorización debe quedar deshabilitada; el rechazo permanece disponible.
5. Revisa las razones de bloqueo y exporta el expediente a JSON.
6. Cambia en `/politicas` el límite absoluto por debajo del importe de una factura pendiente (respetando las validaciones de política); la reevaluación debe impedir aprobarla.

## Estructura

```text
app/
  layout.tsx                  # Inter desde next/font/google
  page.tsx                    # / dashboard
  politicas/page.tsx
  beneficiarios/page.tsx
  facturas/page.tsx
  facturas/[id]/page.tsx
  aprobaciones/page.tsx
  auditoria/page.tsx          # nueva ruta
  api/invoices/extract/route.ts
src/
  components/
    approvals/               # approval-hero, approvals-page, approval-confirmation
    audit/                   # auditoría, timeline e inspector
    dashboard/               # overview y widgets
    invoices/                # ingesta y detalle
    beneficiaries/           # directorio de confianza
    policies/                # configuración y simulador
    experience/              # escena cinematográfica
    layout/                  # navegación compartida
  lib/
    approval-workflow.ts     # guard puro para permiso humano
    audit-timeline.ts        # función pura para timeline multifuente
    invoice-registry.ts      # transición + audit event local
    invoice-processing.ts    # validaciones documentales y evaluación
    decision-engine.ts       # reglas deterministas
    beneficiary-registry.ts
    policy-store.ts
  styles/approvals.css
  styles/audit.css           # CSS scoped para auditoría
  types/
public/
  metal-human.jpg
  metal-human.mp4
  demo/                      # facturas ficticias

tests/
  audit-timeline.test.mjs
  approval-workflow.test.mjs
  ...                        # políticas, motor, beneficiarios, ingesta
```

## IA opcional para extracción

`cp .env.example .env.local` y configura `OPENAI_API_KEY` y `OPENAI_EXTRACTION_MODEL`. Sin clave, la app admite revisión manual de PDF/imagen y extracción heurística del texto de correos. La API de extracción necesita credenciales y documentos ficticios para probarse de extremo a extremo.

## Limitaciones y seguridad

La simulación es de cliente. No hay pagos reales, autenticación, control de organizaciones ni base de datos. No cargues documentación financiera real. Para producción, las decisiones deben moverse al servidor, aplicar RBAC y reservas presupuestarias transaccionales, y escribirse en una auditoría inmutable. La revalidación cliente por sí sola no garantiza seguridad ante manipulación o concurrencia.

El estilo se inspira en **Blinka** y en la narrativa **Flora de GetLayers**; los tokens exactos del CSS oficial no se verificaron. Se reutilizan los recursos de humano metálico aportados por el usuario, sin assets premium ajenos.

## Validación v8

- 68/68 pruebas de reglas, flujo humano, regresión prerender y auditoría.
- 45 archivos TS/TSX analizados sintácticamente sin errores.
- 11 hojas CSS analizadas sin errores de parseo.
- El build de Next.js necesita dependencias instaladas; no se ha afirmado una validación E2E en navegador de esta versión.

## Corrección de prerender /facturas/[id] (v10)

Con Next.js 16.4.2, `cacheComponents: true` y `partialPrefetching: true`,
`params` de una ruta dinámica sin `generateStaticParams` es un dato de
solicitud. Esperarlo directamente en `Page` provoca `blocking-prerender-dynamic`
durante `next build`.

En `app/facturas/[id]/page.tsx`, `Page` ahora devuelve un límite de
`<Suspense>` con un fallback visual estático; un hijo asíncrono
`InvoiceCaseContent` espera `params` dentro de ese límite y pasa `id` al
componente de expediente existente. No fue necesario desactivar Cache Components
ni usar `instant = false`.

**Validación recomendada:**

```bash
corepack enable
yarn install
yarn test:rules
yarn build
```

Luego verifica `/facturas/<id-valido>` navegando desde el listado, tanto en
`yarn dev` como en `yarn start` tras compilar. Las pruebas de estructura
`tests/invoice-route-prerender.test.mjs` previenen regresiones, pero no
sustituyen una compilación real de Next.js.

## Neon + Prisma — Backend Foundation

Esta versión agrega 14 facturas ficticias en `/facturas` y la base de persistencia en Neon mediante API protegida por token de sandbox. Lee **[DATABASE_SETUP.md](DATABASE_SETUP.md)** para instalar Prisma 7, configurar `.env`, crear/aplicar la migración en tu base de Neon y comprobar registro/consulta de facturas sin localStorage. No se ejecutaron migraciones en Neon desde este ZIP y el frontend anterior continúa con su estado de demo mientras se migra.
