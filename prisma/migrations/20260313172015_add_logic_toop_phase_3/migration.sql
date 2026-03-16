-- AlterTable
ALTER TABLE "logic_toop_executions" ADD COLUMN     "resumeAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "logic_toop_jobs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logic_toop_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logic_toop_jobs_status_scheduledAt_idx" ON "logic_toop_jobs"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "logic_toop_jobs_executionId_idx" ON "logic_toop_jobs"("executionId");

-- CreateIndex
CREATE INDEX "logic_toop_jobs_orgId_idx" ON "logic_toop_jobs"("orgId");

-- CreateIndex
CREATE INDEX "logic_toop_executions_status_resumeAt_idx" ON "logic_toop_executions"("status", "resumeAt");

-- AddForeignKey
ALTER TABLE "logic_toop_jobs" ADD CONSTRAINT "logic_toop_jobs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "logic_toop_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
