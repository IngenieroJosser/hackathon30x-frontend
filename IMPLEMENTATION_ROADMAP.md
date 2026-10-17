# Roadmap técnico — 30X / Blinka Decision Engine

## Entregado: `/` (UI v2)

- Dashboard responsive modular y coherente con el flujo Accounts Payable.
- Fuente Inter cargada desde `app/layout.tsx`.
- Design tokens centralizados, estilos de estados y accesibilidad básica.
- Datos de prueba tipados + motor determinista exclusivamente local.
- Tabla filtrable, panel de auditoría, notificaciones, aprobaciones simuladas, descarga JSON, lote de ejemplo.
- Pruebas unitarias para las reglas más sensibles del prototipo.

## Pantallas que exige el reto

| Ruta | Responsabilidad | Prioridad |
|---|---|---|
| `/` | Visión general, resultados y KPI | Entregada |
| `/facturas` | Ingesta y cola de procesamiento | P0 |
| `/facturas/[id]` | Extracción, validaciones, decisión y evidencia | P0 |
| `/politicas` | Reglas, presupuestos y límites configurables | P0 |
| `/beneficiarios` | Lista autorizada y acuerdos | P0 |
| `/aprobaciones` | Resolución humana y control de permisos | P0 |
| `/auditoria` | Historial inmutable y exportación | P0 |

## Integración futura

1. Definir contratos TypeScript/Zod de extracción y evaluación; IA solo para interpretar documentos.
2. Sustituir fixtures por una API server-side para evaluaciones, políticas, proveedores y facturas.
3. Persistir decisiones con versión de reglas, timestamps, entradas y huellas de evidencia.
4. Aplicar prioridad a prohibiciones: duplicado, proveedor no permitido, desajuste, límite absoluto, presupuesto; después revisión humana.
5. Manejar concurrencia e idempotencia en la reserva presupuestaria; el navegador nunca debe ejercer autorización financiera.
6. Probar casos adversariales, incluyendo instrucciones dentro de documentos no confiables.

## Criterios de éxito

- Cero autorizaciones fuera de política en el conjunto de evaluación.
- Autonomía correcta, medida sin confundir bloqueos con pagos ejecutados.
- Todas las decisiones reproducibles mediante registros y política versionada.
- No mover dinero real durante la hackathon.
