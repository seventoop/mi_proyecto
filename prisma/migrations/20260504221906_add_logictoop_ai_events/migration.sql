-- CreateTable
CREATE TABLE "logictoop_ai_events" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "source" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logictoop_ai_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logictoop_ai_events_orgId_idx" ON "logictoop_ai_events"("orgId");

-- CreateIndex
CREATE INDEX "logictoop_ai_events_taskId_idx" ON "logictoop_ai_events"("taskId");

-- CreateIndex
CREATE INDEX "logictoop_ai_events_type_idx" ON "logictoop_ai_events"("type");

-- CreateIndex
CREATE INDEX "logictoop_ai_events_createdAt_idx" ON "logictoop_ai_events"("createdAt");

-- AddForeignKey
ALTER TABLE "logictoop_ai_events" ADD CONSTRAINT "logictoop_ai_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "logictoop_ai_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logictoop_ai_events" ADD CONSTRAINT "logictoop_ai_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
