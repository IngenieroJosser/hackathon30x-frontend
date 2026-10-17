# Blinka Decision Engine · Cinematic Edition v3

Frontend del reto **30X · Blinka — Agentes que pagan por la empresa**, diseñado como concepto por **ZYRA**. Ruta implementada: `/`.

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

## Organización

```text
30x-frontend/
├── app/
│   ├── layout.tsx                  # Inter desde next/font/google
│   ├── page.tsx                    # / dashboard
│   └── globals.css                # importador de estilos modulares
├── public/
│   ├── metal-human.jpg            # poster original
│   └── metal-human.mp4            # video optimizado para web
├── src/
│   ├── components/
│   │   ├── experience/agent-stage.tsx  # scroll + cine + gestión video
│   │   ├── layout/app-shell.tsx        # chrome de app y navegación
│   │   ├── dashboard/                  # widgets y decisiones reales de la demo
│   │   └── ui/                         # iconos y badges
│   ├── styles/
│   │   ├── foundation.css          # tokens, tipografía, shell
│   │   ├── chapter.css             # cinematografía y secuencias
│   │   ├── operations.css          # paneles y tablas
│   │   ├── drawer.css              # detalles y feedback
│   │   └── responsive.css          # tablet/mobile/reduced motion
│   ├── lib/                        # mocks, motor de reglas y formato
│   └── types/                      # dominio de pagos
└── tests/decision-engine.test.mjs
```

## Alcance técnico y seguridad

- El motor de reglas sigue siendo **determinista** para los datos ficticios y se ejecuta **solo en el navegador**.
- El diseño no incluye extracción IA desde PDF, API, autenticación, persistencia ni ejecución real de pagos. La vista debe conectarse a un backend antes de plantear producción.
- Las decisiones humanas se simulan localmente. Los cambios se reinician al recargar la página.
- Las aprobaciones por importe requieren revalidación. Una revisión humana ordinaria no evita duplicados, proveedores prohibidos, límites absolutos o falta de presupuesto.
- **No utilizar esta aplicación en procesos de pago reales.**

## Identidad y referencia

- Dirección artística basada en la narrativa visual cinematográfica de **GetLayers · Flora** (`https://www.getlayers.ai/templates?layer=flora`). Es **código y composición originales** adaptados al humano metálico aportado; no se incorporan fuentes ni escenas premium de GetLayers.
- Colores oscuros y lima/verde inspirados en Blinka. Los HEX no se verificaron contra su hoja de estilos de producción. Consulta `BRAND_REVIEW.md`.
- Inter en `app/layout.tsx`; títulos de acento expresivo usan serif editorial de sistema para la dirección cinematográfica.

## Validación en este entorno

- 8/8 pruebas del motor determinista de reglas.
- 17 archivos TS/TSX pasaron transpilación de sintaxis con TypeScript; estilos analizados sin errores de parseo.
- Se verificaron composición de hero desktop y mobile con HTML de referencia y el mismo CSS; **esto no sustituye el render de Next.js real**.
- **Build y lint de Next.js pendientes:** no estaban instaladas las dependencias en este entorno offline. Ejecuta `yarn install && yarn lint && yarn build` en tu computadora.
