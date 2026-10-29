ALTER TABLE "AppUser" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppUser" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "mfaPendingSecret" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "mfaLastStep" BIGINT NOT NULL DEFAULT -1;
ALTER TABLE "AuthSession" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "MfaLoginChallenge" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "tokenHash" VARCHAR(64) NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL,
 "consumedAt" TIMESTAMP(3), CONSTRAINT "MfaLoginChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MfaLoginChallenge_tokenHash_key" ON "MfaLoginChallenge"("tokenHash");
CREATE INDEX "MfaLoginChallenge_userId_expiresAt_idx" ON "MfaLoginChallenge"("userId","expiresAt");
ALTER TABLE "MfaLoginChallenge" ADD CONSTRAINT "MfaLoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "MfaRecoveryCode" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "digest" VARCHAR(64) NOT NULL,
 CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MfaRecoveryCode_digest_key" ON "MfaRecoveryCode"("digest");
CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "VendorBankAccount" (
 "id" UUID NOT NULL, "vendorId" UUID NOT NULL, "organizationId" UUID NOT NULL,
 "institutionCode" VARCHAR(60) NOT NULL, "accountKind" VARCHAR(20) NOT NULL,
 "accountCiphertext" TEXT NOT NULL, "holderCiphertext" TEXT NOT NULL,
 "fingerprint" VARCHAR(64) NOT NULL,"maskedAccount" VARCHAR(40) NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,"enteredById" UUID NOT NULL,
 "verifiedById" UUID, "verifiedVendorRevision" INTEGER,
 "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',"realBankConfirmed" BOOLEAN NOT NULL DEFAULT false,
 "verifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "VendorBankAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VendorBankAccount_vendorId_key" ON "VendorBankAccount"("vendorId");
CREATE INDEX "VendorBankAccount_organizationId_status_idx" ON "VendorBankAccount"("organizationId","status");
ALTER TABLE "VendorBankAccount" ADD CONSTRAINT "VendorBankAccount_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
