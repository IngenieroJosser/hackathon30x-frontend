-- Control de intentos de acceso compartido, claves HMAC no reversibles.
CREATE TABLE "AuthThrottle" (
  "key" VARCHAR(64) NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthThrottle_expiresAt_idx" ON "AuthThrottle"("expiresAt");
