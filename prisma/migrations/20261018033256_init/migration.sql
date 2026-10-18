-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'APPROVER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('AUTHORIZED', 'REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('PDF', 'IMAGE', 'EMAIL', 'TEXT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('RECEIVED', 'NEEDS_VERIFICATION', 'READY', 'AUTHORIZED', 'BLOCKED', 'ESCALATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('AUTHORIZED', 'BLOCKED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BudgetEntryType" AS ENUM ('RESERVE', 'RELEASE', 'CONSUME');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "baseCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AUDITOR',
    "passwordHash" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "normalizedName" VARCHAR(160) NOT NULL,
    "country" VARCHAR(80) NOT NULL,
    "category" VARCHAR(100) NOT NULL DEFAULT '',
    "contactEmail" VARCHAR(255),
    "status" "VendorStatus" NOT NULL DEFAULT 'REVIEW',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAgreement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "reference" VARCHAR(80) NOT NULL,
    "amountLimit" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "version" INTEGER NOT NULL DEFAULT 1,
    "validFrom" DATE,
    "validUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPolicy" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "autonomousLimit" DECIMAL(18,2) NOT NULL,
    "hardLimit" DECIMAL(18,2) NOT NULL,
    "monthlyBudget" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "rules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetPeriod" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "allocation" DECIMAL(18,2) NOT NULL,
    "reserved" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "consumed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "vendorId" UUID,
    "agreementId" UUID,
    "externalNumber" VARCHAR(80),
    "vendorName" VARCHAR(160),
    "amount" DECIMAL(18,2),
    "currency" VARCHAR(3),
    "issueDate" DATE,
    "dueDate" DATE,
    "description" VARCHAR(500),
    "source" "InvoiceSource" NOT NULL DEFAULT 'TEXT',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "idempotencyKey" VARCHAR(120),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDocument" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "storageKey" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceExtraction" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "modelName" VARCHAR(100),
    "method" VARCHAR(40) NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "evidence" JSONB,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDecision" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "policyId" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "outcome" "DecisionOutcome" NOT NULL,
    "ruleCode" VARCHAR(100) NOT NULL,
    "reason" TEXT NOT NULL,
    "checks" JSONB NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "beneficiarySnapshot" JSONB,
    "inputSnapshot" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "decisionId" UUID,
    "reviewerId" UUID,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetEntry" (
    "id" UUID NOT NULL,
    "budgetPeriodId" UUID NOT NULL,
    "invoiceId" UUID,
    "type" "BudgetEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "invoiceId" UUID,
    "actorId" UUID,
    "entityType" VARCHAR(70) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "data" JSONB NOT NULL,
    "correlationId" VARCHAR(120),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "AppUser_organizationId_role_idx" ON "AppUser"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_organizationId_email_key" ON "AppUser"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_status_idx" ON "Vendor"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_organizationId_normalizedName_key" ON "Vendor"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "VendorAgreement_vendorId_createdAt_idx" ON "VendorAgreement"("vendorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAgreement_organizationId_reference_version_key" ON "VendorAgreement"("organizationId", "reference", "version");

-- CreateIndex
CREATE INDEX "PaymentPolicy_organizationId_isActive_idx" ON "PaymentPolicy"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPolicy_organizationId_version_key" ON "PaymentPolicy"("organizationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPeriod_organizationId_periodStart_currency_key" ON "BudgetPeriod"("organizationId", "periodStart", "currency");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_vendorName_externalNumber_idx" ON "Invoice"("organizationId", "vendorName", "externalNumber");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_createdAt_idx" ON "Invoice"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_idempotencyKey_key" ON "Invoice"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceDocument_invoiceId_key" ON "InvoiceDocument"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceDocument_sha256_idx" ON "InvoiceDocument"("sha256");

-- CreateIndex
CREATE INDEX "InvoiceExtraction_invoiceId_createdAt_idx" ON "InvoiceExtraction"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentDecision_invoiceId_evaluatedAt_idx" ON "PaymentDecision"("invoiceId", "evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDecision_invoiceId_revision_key" ON "PaymentDecision"("invoiceId", "revision");

-- CreateIndex
CREATE INDEX "ApprovalRequest_invoiceId_status_idx" ON "ApprovalRequest"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "BudgetEntry_budgetPeriodId_createdAt_idx" ON "BudgetEntry"("budgetPeriodId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_occurredAt_idx" ON "AuditEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_invoiceId_occurredAt_idx" ON "AuditEvent"("invoiceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAgreement" ADD CONSTRAINT "VendorAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAgreement" ADD CONSTRAINT "VendorAgreement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPolicy" ADD CONSTRAINT "PaymentPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetPeriod" ADD CONSTRAINT "BudgetPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "VendorAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceExtraction" ADD CONSTRAINT "InvoiceExtraction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDecision" ADD CONSTRAINT "PaymentDecision_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDecision" ADD CONSTRAINT "PaymentDecision_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PaymentPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "PaymentDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetEntry" ADD CONSTRAINT "BudgetEntry_budgetPeriodId_fkey" FOREIGN KEY ("budgetPeriodId") REFERENCES "BudgetPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetEntry" ADD CONSTRAINT "BudgetEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
