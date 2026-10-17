# Blinka Decision Engine · Cinematic Edition v5

Frontend del reto **30X · Blinka — Agentes que pagan por la empresa**, diseñado como concepto por **ZYRA**. Rutas implementadas: `/`, `/politicas` y `/beneficiarios`.

> **No es software de Blinka ni realiza pagos.** Todos los nombres, contratos, políticas, importes y decisiones de la demo son sintéticos. Una factura «autorizada» significa elegible en la simulación; no corresponde a una transferencia bancaria.

## Instalación

Requisitos: Node.js 22+, Corepack/Yarn 4.14.1 e Internet para instalar dependencias y obtener Inter durante el build inicial de `next/font`.

```bash
corepack enable
yarn install
yarn dev
```

Abre `http://localhost:3000`.

```bash
yarn lint
yarn build
yarn test:rules
```

## Experiencia `/`

### 1. Secuencia cinematográfica (6 capítulos)

- `metal-human.jpg` se muestra inmediatamente como poster y como fallback de accesibilidad.
- `metal-human.mp4` se reproduce en bucle, silenciado y sin audio. **Es el video aportado por el usuario, optimizado para web** de aproximadamente 57 MB originales a ~1 MB H.264 1440px, manteniendo el nombre público.
- Scroll-driven: zoom progresivo de cámara, desplazamiento sutil y seis composiciones tipográficas que se suceden dentro de la misma escena, más índices laterales para navegar por capítulos.
- Navegación directa: **Entrar al dashboard**, **Descubrir el agente**, **Revisar aprobaciones**. No es obligatorio recorrer la historia para operar.
- `prefers-reduced-motion`: poster sin video ni animaciones, manteniendo navegación y contenido.
- IntersectionObserver pausa el video cuando sale de la vista.

### 2. Dashboard empresarial

- Cuatro KPIs basados en los datos del cliente; se actualizan tras acciones.
- Panel del agente y ratio de decisiones resueltas sin intervención.
- Bandeja de aprobación humana, gráfico de decisiones y balance presupuestal ficticio.
- Tabla navegable con búsqueda y filtros, panel de evidencias y reglas.
- Aprobar / rechazar solicitudes en demo; el sistema revalida reglas duras antes de aprobar.
- Procesamiento de un lote ficticio de tres facturas y exportación JSON de auditoría.
- Atajo `/` para buscar facturas y navegación responsive.

## Centro de políticas `/politicas` (v4)

- El hero cinematográfico reutiliza el video original `metal-human.mp4` y el póster `metal-human.jpg`, con tratamiento de contraste y efecto visual discreto para no obstaculizar la operación.
- Configura **límite de autonomía**, **límite absoluto por factura** y **presupuesto mensual** con validación de invariantes: `0 < autonomía ≤ límite absoluto ≤ presupuesto`.
- Los **seis controles duros** permanecen activos: duplicados, proveedor, acuerdo, límite absoluto, presupuesto y ambigüedad documental.
- Un simulador determinista permite probar 7 escenarios sintéticos con importe modificable y comparar **decisión activa vs. borrador** antes de publicar.
- Se puede descartar un borrador, revisar las diferencias en una confirmación, publicar una nueva versión, consultar el historial y exportar JSON.
- La política activa y hasta 15 eventos de modificación se guardan en **localStorage del navegador**. Los nuevos lotes y aprobaciones del dashboard `/` consultan la última versión local. Las facturas de muestra inicialmente procesadas no se reescriben retroactivamente.
- Los controles no representan autorización real de pago; para producción se requiere backend, autenticación, transacciones y registro de auditoría no modificable desde el cliente.

### Prueba del flujo entre las dos rutas

1. Accede a `/politicas` desde el icono del escudo de la navegación.
2. Cambia el límite autónomo de 1.000 USD a 1.500 USD y comprueba la simulación con la factura de 2.400 USD.
3. Pulsa **Revisar cambios → Publicar versión**.
4. Regresa a `/` y ejecuta **Procesar lote demo**: el motor usa la política publicada en ese mismo navegador.
5. Vuelve a `/politicas` y comprueba el historial de modificaciones.

## Directorio de beneficiarios `/beneficiarios` (v5)

- Hero cinematográfico con `metal-human.mp4`, poster y tratamiento visual coherente con `/politicas`. Inter global desde `app/layout.tsx`.
- KPIs derivados del directorio (total, autorizados, en revisión, bloqueados).
- Buscador, filtros por estado y país, directorio tabulado accesible y ficha de beneficiario con el límite de su acuerdo.
- Alta, edición y modificación de estados con confirmación humana, validación de campos y nombres duplicados.
- Un beneficiario **nuevo siempre empieza en revisión** y no puede autorizarse automáticamente.
- Cambios críticos en nombre, país, referencia de acuerdo o máximo por factura **revocan la autorización y exigen nueva revisión**.
- No se almacenan cuentas bancarias reales, documentos de identidad ni comprobantes de pago.
- Eventos con versión de registro `rN`, exportación JSON, estado y eventos en `localStorage` exclusivamente para demo.
- El procesamiento de nuevos lotes en `/` y la aprobación humana en `/` revalidan beneficiarios contra el directorio local y toman el límite del acuerdo configurado. Una autorización previa mostrada en la demo no se reescribe retroactivamente.
- **Seguridad:** el cotejo por nombre y el almacenamiento local solo ejemplifican la regla de beneficiarios permitidos; no verifican identidad, cuenta bancaria ni autorizan dinero real. En producción deben sustituirse por IDs robustos, permisos del servidor y auditoría append-only.

### Prueba integral entre rutas

1. Abre `/beneficiarios` y selecciona **Nexa Software**.
2. Haz clic en **Bloquear** y confirma.
3. Vuelve a `/` y ejecuta el **lote demo**. El caso de Nexa Software debe quedar bloqueado con `VENDOR_NOT_ALLOWED`.
4. Regresa a `/beneficiarios`, selecciona Nexa Software y pulsa **Autorizar**.
5. Recarga `/` y ejecuta de nuevo el lote: Nexa vuelve a ser elegible si cumple las demás políticas.
6. Opcional: edita su acuerdo; cualquier cambio financiero provoca estado **En revisión** antes de admitir futuras autorizaciones.

## Organización

```text
30x-frontend/
├── app/
│   ├── layout.tsx                  # Inter desde next/font/google
│   ├── page.tsx                    # / dashboard
│   ├── politicas/page.tsx          # /politicas · centro de políticas
│   ├── beneficiarios/page.tsx      # /beneficiarios · directorio y acuerdos
│   └── globals.css                # importador de estilos modulares
├── public/
│   ├── metal-human.jpg            # poster original
│   └── metal-human.mp4            # video optimizado para web
├── src/
│   ├── components/
│   │   ├── experience/agent-stage.tsx  # scroll + cine + gestión video
│   │   ├── layout/app-shell.tsx        # chrome de app y navegación
│   │   ├── dashboard/                  # widgets y decisiones de la demo
│   │   ├── policies/                   # editor, simulador, historial y UI
│   │   ├── beneficiaries/              # directorio, ficha, formularios y confirmaciones
│   │   └── ui/                         # iconos y badges
│   ├── styles/
│   │   ├── foundation.css          # tokens, tipografía, shell
│   │   ├── chapter.css             # cinematografía y secuencias
│   │   ├── operations.css          # paneles y tablas
│   │   ├── drawer.css              # detalles y feedback
│   │   ├── responsive.css          # tablet/mobile/reduced motion
│   │   ├── policies.css            # diseño del Policy Center
│   │   └── beneficiaries.css       # diseño de directorio, ficha y editor
│   ├── lib/                        # mocks, motor de reglas, persistencia local y validación
│   └── types/                      # dominio de pagos
└── tests/                         # motor, políticas, reglas y ciclo del directorio
```

## Alcance técnico y seguridad

- El motor de reglas sigue siendo **determinista** para los datos ficticios y se ejecuta **solo en el navegador**.
- El diseño no incluye extracción IA desde PDF, API, autenticación, **persistencia en servidor** ni ejecución real de pagos. La vista debe conectarse a un backend antes de plantear producción.
- Las decisiones humanas sobre facturas se simulan en memoria y se reinician al recargar `/`. Las **políticas publicadas sí se conservan en localStorage** para probar el flujo entre rutas.
- Las aprobaciones por importe requieren revalidación. Una revisión humana ordinaria no evita duplicados, proveedores prohibidos, límites absolutos o falta de presupuesto.
- **No utilizar esta aplicación en procesos de pago reales.**

## Identidad y referencia

- Dirección artística basada en la narrativa visual cinematográfica de **GetLayers · Flora** (`https://www.getlayers.ai/templates?layer=flora`). Es **código y composición originales** adaptados al humano metálico aportado; no se incorporan fuentes ni escenas premium de GetLayers.
- Colores oscuros y lima/verde inspirados en Blinka. Los HEX no se verificaron contra su hoja de estilos de producción. Consulta `BRAND_REVIEW.md`.
- Inter en `app/layout.tsx`; títulos de acento expresivo usan serif editorial de sistema para la dirección cinematográfica.

## Validación en este entorno

- 28/28 pruebas unitarias (8 del motor, 8 de políticas, 12 de beneficiarios incluyendo altas, autorizaciones y revocación por cambio crítico).
- 26 archivos TS/TSX pasaron transpilación de sintaxis con TypeScript; estilos CSS analizados sin errores de parseo.
- Se verificaron composición de hero desktop y mobile con HTML de referencia y el mismo CSS; **esto no sustituye el render de Next.js real**.
- **Build y lint de Next.js pendientes:** Corepack no pudo descargar Yarn (DNS: `repo.yarnpkg.com` indisponible en este entorno). Ejecuta `yarn install && yarn lint && yarn build` en tu computadora.
