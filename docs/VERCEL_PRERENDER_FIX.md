# Corrección del prerender en Vercel (Next.js 16.4.2)

## Síntoma

`Route "/facturas/[id]": ... usePathname() ... outside of <Suspense>` durante la generación de páginas.

## Solución

La interfaz pública `/proyecto` está fuera del control de acceso client-side. Las páginas
operativas están agrupadas en `app/(privado)/` con un layout compartido que utiliza
`AccessGate`. Los segmentos entre paréntesis no aparecen en las URLs de Next.js.

En `AccessGate` se eliminó `usePathname`, ya que no necesita distinguir rutas públicas.
Esto conserva el flujo de contraseñas, MFA TOTP y códigos de recuperación.
Las APIs mantienen sus propias verificaciones de permisos y sesión en el servidor.

Se mantiene `Suspense` en `app/(privado)/facturas/[id]/page.tsx` para los parámetros
dinámicos del expediente. No se desactiva `cacheComponents` ni la prerenderización.

## Validación local

```sh
yarn install --immutable
yarn db:generate
yarn test:rules
yarn typecheck
yarn lint
yarn build
```

Comprobar en el despliegue `/proyecto`, `/facturas/[id]`, login y MFA.
No requiere migraciones de base de datos ni cambio de secretos.
