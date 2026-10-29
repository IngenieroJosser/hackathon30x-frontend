# Semillero FinVigía — Fase 1 / controles gratuitos (28 octubre 2026)

## Alcance entregado (implementado)

1. **Limitador distribuido de inicio de sesión:** contador atómico en PostgreSQL; 8 intentos por cuenta+red, 80 por red, en ventanas de 15 minutos. Utiliza HMAC SHA-256 de los identificadores de red/cuenta; no persiste IP o correo en claro en esa tabla. La aplicación no permite login si la tabla no existe o la base de datos falla (fail-closed). Debe aplicarse la migración `20261028235000_auth_throttle`.
2. **Validación de contenido de uploads:** firmas binarias PDF/JPEG/PNG/WEBP, extensión coherente, nombres saneados y tamaño de archivo real, antes de enviar a OpenAI. Esto **no** es detección antivirus, sanitización de PDF ni validación semántica de imágenes.
3. **Filtro heurístico de ataques por texto:** identifica patrones obvios de prompt injection, suplantación de roles y exfiltración de secretos. Bloquea la extracción de texto sospechoso con HTTP 422 para revisión humana. **No** es un detector de ML, no cubre ataques indirectos en documentos PDF o imágenes, ni sustituye un red team.
4. **Cabeceras de seguridad:** CSP de compatibilidad, COOP, CORP, HSTS solo en producción, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. La CSP conserva `unsafe-inline` por la hidratación de Next.js: NO es una CSP estricta basada en nonce y debe endurecerse en otra fase previa a datos reales.
5. **Límites reales de cuerpo JSON:** lector que corta al superar el máximo recibido en endpoints de inicio de sesión, políticas, facturas, verificación y aprobaciones. Protege mejor que confiar solo en `Content-Length`. La carga `multipart/form-data` requiere además restricciones en el proxy y análisis seguro de contenido.
6. **Contrato bancario sintético:** `syntheticBankProvider` implementa una interfaz sustituible y verifica datos inventados. **No consulta bancos**, **no prueba la existencia real de una cuenta** y todavía **NO está conectado al motor transaccional ni a la UI**.

## Comandos — Mac (sin Azure ni OpenAI para los tests)

```bash
corepack enable
yarn install --immutable

# En .env: poner DATABASE_URL, DIRECT_URL y AUTH_THROTTLE_SECRET
# Valor de ejemplo: generar uno NUEVO y guardarlo de forma privada.
openssl rand -hex 32

yarn db:generate
yarn db:deploy
yarn test:rules
yarn typecheck
yarn lint
yarn build
```

> `AUTH_THROTTLE_SECRET`: valor aleatorio de **32 caracteres mínimo** (recomendados 32 bytes hex = 64 caracteres). No imprimir ni subir a Git. Mantener el mismo valor en todas las instancias de producción. Si falta en producción, el login falla deliberadamente.

> `db:deploy` aplica la migración a la base de datos configurada por `DIRECT_URL`. Aplicarla primero a una rama de prueba de Neon y conservar backup/posibilidad de recuperación. No es necesario volver a ejecutar `db:seed` ni `auth:bootstrap` si ya tienes cuentas.

> Fuera de Vercel, las solicitudes usan un bucket de red común por defecto; para atribuir IPs por usuario, integrar posteriormente un proxy que garantice cabeceras no falsificables. No activar `VERCEL=1` en un despliegue ajeno a Vercel.

> Mantenimiento eventual: `DELETE FROM "AuthThrottle" WHERE "expiresAt" < NOW();` desde una consola SQL autorizada. El índice por expiración facilita la limpieza de filas caducadas.

## Evidencia de esta entrega

- `node --import ./tests/register-alias.mjs --experimental-strip-types --test tests/*.test.mjs`: **112/112 pruebas exitosas** en el entorno de edición.
- **No** se ejecutaron `yarn lint`, `yarn typecheck`, `yarn build` ni migración sobre Neon: las dependencias no están instaladas en este entorno y la descarga de Yarn falla por conectividad con npm. Repetir todos los comandos anteriores en el Mac del equipo y contra base de desarrollo.
- **No** se realizaron pruebas de penetración ni auditoría de infraestructura. El ZIP no incluye credenciales `.env`.

## Pendientes obligatorios antes de producción financiera

- MFA con passkeys/TOTP y recuperación segura; reautenticación para cambios sensibles.
- Aprobación doble de cambios de cuentas y beneficiarios, separación de responsabilidades y prevención de autoaprobación.
- Modelo de cuentas bancarias cifrado y versionado, validez/expiración de verificación real, consentimiento y proveedor autorizado; **el motor debe bloquear autorizaciones si se exige verificación real y no está confirmada**.
- Detección de ataques en contenido extraído de PDF/imagen; validación de malware, límites de parsing, OCR local o modelo local y pruebas adversariales.
- Límites a nivel de proxy para `multipart/form-data` y validaciones de archivos complejos; integración con antivirus si se ingieren documentos de terceros.
- Política CSP estricta con nonce/hashes, inventario de dominios y prueba de compatibilidad con Next.js 16.
- Retención y minimización de datos, cifrado de campos, gestión de llaves, backups, alertas, monitoreo y logs resistentes a alteración.
- Suite de pruebas de concurrencia del rate limiter en PostgreSQL, DAST autorizado con OWASP ZAP y revisión de ASVS 5.0.

**Regla operativa:** mantener `paymentExecuted: false`; no usar cuentas reales, identificaciones reales, facturas de clientes ni procesar nómina real en el prototipo.
