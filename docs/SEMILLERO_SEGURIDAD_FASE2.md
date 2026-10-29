# Blinka Decision Engine — Fase 2: MFA + Verificador bancario conectado

> **ALCANCE ACADÉMICO**. Este repositorio NO valida cuentas de bancos reales, NO demuestra titularidad real, NO es una herramienta de pagos, NO ejecuta transferencias, NO certifica cumplimiento normativo. Los datos de `BANK-DEMO-*`, `TEST-ACCOUNT-*` y `PERSON-DEMO-*` son ficticios. Las autorizaciones son simuladas y se almacenan para estudio de reglas, auditoría y controles de seguridad.

## Qué cambió

- MFA obligatorio para usar cualquier API financiera: contraseñas con sesiones temporales sin privilegios hasta activar TOTP, y desafío TOTP en los inicios de sesión posteriores.
- TOTP RFC 6238, 30 segundos, SHA-1, seis dígitos, tolerancia de ±1 intervalo, almacenamiento cifrado AES-256-GCM y bloqueo de reutilización de intervalo.
- Ocho códigos de recuperación de un solo uso, almacenados únicamente como hashes. Se presentan una sola vez al activar MFA.
- Desafíos temporales de MFA con expiración de cinco minutos y máximo cinco intentos. La activación cuenta intentos en el rate limiter persistente de Neon.
- Los cambios bancarios requieren rol ADMIN, quedan cifrados, invalidan el estado anterior y colocan al beneficiario en REVIEW.
- Verificar una cuenta exige rol APPROVER y un usuario diferente al que la registró.
- El flujo de verificación es únicamente **SYNTHETIC_MATCH / SYNTHETIC_MISMATCH / UNKNOWN** y marca siempre `realBankConfirmed=false`.
- El motor transaccional comprueba cuenta, revisión del beneficiario y estado bancario antes de permitir `AUTHORIZED` o `APPROVAL_REQUIRED`. La aprobación humana vuelve a ejecutar los mismos controles dentro de la transacción.
- Se conservan las salvaguardas de la fase 1 y los endpoints existentes de facturas y políticas.
- Navegación Next.js con `<Link />`, mejoras en los efectos y correcciones del lint reportado.

## Requisitos

- Node.js 22 LTS, Corepack y Yarn 4.14.1 (está fijado en `package.json`).
- Una rama de pruebas de Neon PostgreSQL. **No aplicar migraciones directamente sobre datos reales sin backup ni revisión**.
- La configuración anterior `DATABASE_URL`, `DIRECT_URL`, `AUTH_THROTTLE_SECRET` y usuarios creados por bootstrap.
- Dos identidades diferentes (ADMIN y APPROVER). Cada una debe activar su propio MFA.

## Configuración nueva

Conserva tus credenciales existentes; no las pegues en el chat ni las agregues a Git. En `.env` o `.env.local`, incorpora:

```dotenv
# Genera claves distintas con: openssl rand -hex 32
BLINKA_MFA_KEY="TU_CLAVE_HEX_64_CARACTERES_A"
BLINKA_BANK_DATA_KEY="TU_CLAVE_HEX_64_CARACTERES_B"
BLINKA_BANK_MODE="synthetic"
BLINKA_ALLOW_SYNTHETIC_DECISIONS="true"
```

`BLINKA_ALLOW_SYNTHETIC_DECISIONS=true` permite únicamente las **decisiones financieras simuladas** dentro del sandbox. No concede verificación real. Cuando el modo está desactivado, la verificación sintética no habilita autorizaciones. El servidor falla cerrado si faltan claves de cifrado al registrar datos o configurar MFA. No cambies las claves sin un plan de rotación, porque los datos ya cifrados dejarán de ser descifrables.

## Actualización en la Mac

Desde la carpeta `frontend` del ZIP actualizado:

```bash
corepack enable
yarn install --immutable
yarn db:generate
yarn db:deploy
yarn test:rules
yarn typecheck
yarn lint
yarn build
yarn dev
```

La migración **`20261029000000_mfa_banking`** crea tablas y campos. `db:deploy` usa `DIRECT_URL`: confirma que apunta a la rama de prueba correcta. El código NO ejecuta migraciones de forma automática al arrancar.

Si los usuarios ADMIN, APPROVER y AUDITOR ya existen, **no hace falta ejecutar** `yarn auth:bootstrap`. Si aún no los has creado, configura `BLINKA_ADMIN_EMAIL`, `BLINKA_ADMIN_PASSWORD`, `BLINKA_APPROVER_EMAIL`, `BLINKA_APPROVER_PASSWORD`, `BLINKA_AUDITOR_EMAIL`, `BLINKA_AUDITOR_PASSWORD` en `.env` y ejecuta `yarn db:seed` y `yarn auth:bootstrap`. Contraseñas de más de 14 caracteres y distintas; bootstrap renueva contraseñas y revoca sesiones de esos usuarios.

## Cómo probar MFA

1. Abre la aplicación e inicia sesión con ADMIN. Se ofrecerá enrolar MFA la primera vez.
2. En Google Authenticator, Microsoft Authenticator, Aegis o similar, **agrega manualmente una cuenta TOTP** con el secreto que se muestra. Configura SHA-1, seis dígitos y período de 30 segundos.
3. Introduce el código generado. Guarda fuera del navegador los ocho códigos de recuperación (solo se muestran una vez).
4. Cierra la sesión, vuelve a acceder e introduce el segundo factor. Prueba un código incorrecto y un código ya usado: deben rechazarse.
5. Repite para APPROVER. Deben ser cuentas de usuario diferentes. Mantén el reloj del dispositivo sincronizado.

## Cómo probar el verificador bancario conectado al motor

1. Con ADMIN, entra a **Beneficiarios** y registra una cuenta ficticia para el beneficiario elegido: `BANK-DEMO-A` / `TEST-ACCOUNT-0001` / `PAYROLL` / `PERSON-DEMO-0001`.
2. El beneficiario pasa a `REVIEW`. El ADMIN no puede validar su propia cuenta.
3. Cierra la sesión y entra como APPROVER con su MFA. En Beneficiarios, selecciona **Verificar (otro usuario)**. El resultado correcto es `SYNTHETIC_MATCH` y `realBankConfirmed=false`.
4. Vuelve como ADMIN y cambia el estado del beneficiario a `AUTHORIZED`. Solo se permitirá en el sandbox cuando exista una coincidencia sintética vigente para su versión actual.
5. Carga una factura ficticia que coincida con ese beneficiario, confirma los campos y utiliza **Ejecutar motor financiero**. Si las demás reglas de monto, presupuesto y duplicados son correctas, podrá arrojar `AUTHORIZED` (simulado) o `APPROVAL_REQUIRED`.
6. Cambia la cuenta ficticia del beneficiario o modifica sus datos contractuales. Se invalidará la verificación o su revisión; una nueva evaluación ya no podrá autorizarse hasta repetir las comprobaciones.
7. Prueba `TEST-ACCOUNT-9999`: `UNKNOWN`. Prueba `TEST-ACCOUNT-0001` con titular `PERSON-DEMO-9999`: `SYNTHETIC_MISMATCH`. **Ninguno** debe habilitar la autorización.

**Limitación intencional:** el dataset sintético confirma la coincidencia del par cuenta/titular ficticios; no vincula una identidad legal verificada de un proveedor real con el beneficiario de la empresa. Para una futura integración real, hace falta onboarding/KYB/KYC autorizado, consentimiento, vinculación fiable de identidad y API bancaria con alcance comprobado.

## APIs agregadas

- `POST /api/auth/mfa/enroll`: `{ "action":"start" }` o `{ "action":"confirm", "code":"123456" }`, solo sesión propia incompleta.
- `POST /api/auth/mfa/verify`: `{ "code":"123456" }` o código de recuperación, solo desafío pendiente.
- `POST /api/banking/accounts`: `{ "action":"register", "vendorId":"UUID", "institutionCode":"BANK-DEMO-A", "accountReference":"TEST-ACCOUNT-0001", "accountKind":"PAYROLL", "holderReference":"PERSON-DEMO-0001" }` (rol ADMIN).
- `POST /api/banking/accounts`: `{ "action":"verify", "vendorId":"UUID" }` (rol APPROVER distinto del registrador).

Todos los POST están sujetos al control de origen y sesiones; las respuestas sensibles son `no-store`.

## Verificación realizada en el entorno de preparación

- **124/124 pruebas de Node pasadas** (112 existentes + 12 nuevas), ejecutadas con `node --import ./tests/register-alias.mjs --experimental-strip-types --test tests/*.test.mjs`.
- **92 archivos TS/TSX comprobados sintácticamente** con TypeScript; cero errores de parsing.
- **No se pudo ejecutar `yarn lint`, `yarn typecheck`, `yarn build` ni una migración real en Neon en el entorno de preparación**, porque no fue posible descargar las dependencias de Yarn. Su ejecución en tu Mac es parte de la aceptación de esta fase. No confundir estas comprobaciones estáticas con una auditoría integral.

## Riesgos residuales

- MFA TOTP no es resistente al phishing en el mismo nivel que WebAuthn/passkeys.
- CSP de Next.js aún permite `unsafe-inline` en scripts de hidratación; requiere endurecimiento adicional con nonce/hash y pruebas de compatibilidad.
- Falta escaneo de malware y revisión profunda de contenido PDF, pentesting, monitoreo de incidentes y almacenamiento inmutable de auditoría.
- No se ha implementado integración con bancos reales, verificación legal de identidad ni transferencia de dinero.
- Los datos financieros de demostración deben permanecer ficticios. Los cambios sobre cuentas ya autorizadas conservan decisiones históricas para auditoría; **no existe ninguna API de ejecución de pagos**. Antes de integrar pagos debe implementarse una segunda comprobación transaccional previa a desembolso.

## Siguiente paso recomendado

Ejecuta los comandos de aceptación en tu Mac. A continuación, incorporar WebAuthn/passkeys, pruebas E2E de MFA, revisión de logs, endurecimiento de CSP y una matriz de amenazas basada en OWASP ASVS. Para el semillero, medir el impacto del bloqueo bancario sobre falsos positivos y la tasa de decisiones indebidamente autorizadas en un dataset sintético.
