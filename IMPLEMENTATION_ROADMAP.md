# Roadmap técnico — 30X / Blinka Decision Engine

## Frontend entregado hasta v8

| Ruta | Responsabilidad | Estado |
|---|---|---|
| `/` | Dashboard cinematográfico, resúmenes, actividad, lote de prueba y navegación | Implementada |
| `/politicas` | Configuración y versionado de límites, presupuesto y simulación de reglas | Implementada |
| `/beneficiarios` | Directorio, acuerdos, estados de autorización y cambios críticos | Implementada |
| `/facturas` | Carga PDF/imagen/texto, extracción opcional y mesa documental | Implementada |
| `/facturas/[id]` | Verificación, reglas, expediente, eventos y exportación JSON | Implementada |
| `/aprobaciones` | Bandeja de supervisión, revalidación, autorización/rechazo motivados e historial | Implementada |
| `/auditoria` | Historial multifuente, inspector de evidencia y exportaciones JSON/CSV | **Implementada en v8** |

## Aspectos entregados hasta v8

1. Cola separada entre pendientes aprobables, pendientes que necesitan corrección y solicitudes resueltas.
2. Revalidación determinista contra los límites y proveedores **vigentes** justo en el momento de autorizar.
3. Rechazo de autorizar documentos sin confirmar, moneda sin tasa de cambio, beneficiarios bloqueados, duplicados y gastos fuera de acuerdo o presupuesto.
4. Justificación obligatoria (12–500 caracteres), confirmación explícita del usuario en simulación, actor ficticio y fecha de resolución.
5. Evento de auditoría con la justificación, instantánea de la política y referencia del beneficiario.
6. Eliminación de las autorizaciones rápidas sin motivo en `/` y `/facturas/[id]`: ambas rutas dirigen a `/aprobaciones`.
7. 13 pruebas nuevas de supervisión humana y 8 de auditoría/prerender; **65 pruebas** en total.
8. Corrección del prerender de `/aprobaciones`: separar evaluación pura `previewInvoiceDecision` de sellado temporal de acciones `evaluateInvoiceSafely`.
9. Auditoría transversal sin fabricar historial para fixtures iniciales; faltantes etiquetados, cobertura explícita y snapshots históricos cuando existen.

## Para convertirlo en producto financiero confiable

- Mover reglas, autorizaciones y almacenamiento a un servicio de confianza con PostgreSQL, aislamiento y transacciones contra presupuestos concurrentes.
- Autenticación real y RBAC: solicitante/administrador/aprobador, segregación de funciones, políticas por organización y control de sesiones.
- Auditoría inmutable append-only, IDs estables, snapshots íntegros, firma y correlación de todas las acciones.
- Idempotencia y atomicidad: dos aprobadores simultáneos no deben consumir el mismo saldo ni aprobar dos veces.
- Revisión documental confiable, verificación de la identidad de proveedores y protección de la ingesta frente a instrucciones maliciosas.
- Ejecución E2E en navegador y pruebas de concurrencia con dataset de trampas.

**Alcance:** solo facturas ficticias. `authorized` significa autorización de una decisión simulada, no envío de dinero. `localStorage` no implementa seguridad financiera, autenticación ni auditoría inviolable.

## v9 · Not found global

- `app/not-found.tsx`: boundary estática de ruta inexistente, sin lecturas no deterministas.
- `src/components/errors/not-found-experience.tsx`: composición 404 con navegación real, vídeo y poster.
- `src/styles/not-found.css`: estilos específicos, responsive y `prefers-reduced-motion`.
- Pruebas `tests/not-found.test.mjs` para garantizar rutas de salida, medios y ausencia de lecturas temporales durante prerender.
