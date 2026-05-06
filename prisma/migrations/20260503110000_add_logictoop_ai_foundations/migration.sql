-- CreateTable
CREATE TABLE "logictoop_ai_agents" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "tools" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logictoop_ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logictoop_ai_tasks" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "executionId" TEXT,
    "agentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "outputResult" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "costTokens" INTEGER NOT NULL DEFAULT 0,
    "costEstimated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paperclipRunId" TEXT,
    "errorLogs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logictoop_ai_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logictoop_ai_approvals" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "comments" TEXT,
    "actionTaken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logictoop_ai_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logictoop_ai_agents_orgId_idx" ON "logictoop_ai_agents"("orgId");

-- CreateIndex
CREATE INDEX "logictoop_ai_agents_status_idx" ON "logictoop_ai_agents"("status");

-- CreateIndex
CREATE INDEX "logictoop_ai_tasks_orgId_idx" ON "logictoop_ai_tasks"("orgId");

-- CreateIndex
CREATE INDEX "logictoop_ai_tasks_executionId_idx" ON "logictoop_ai_tasks"("executionId");

-- CreateIndex
CREATE INDEX "logictoop_ai_tasks_agentId_idx" ON "logictoop_ai_tasks"("agentId");

-- CreateIndex
CREATE INDEX "logictoop_ai_tasks_requestedById_idx" ON "logictoop_ai_tasks"("requestedById");

-- CreateIndex
CREATE INDEX "logictoop_ai_tasks_status_idx" ON "logictoop_ai_tasks"("status");

-- CreateIndex
CREATE INDEX "logictoop_ai_approvals_taskId_idx" ON "logictoop_ai_approvals"("taskId");

-- CreateIndex
CREATE INDEX "logictoop_ai_approvals_approvedById_idx" ON "logictoop_ai_approvals"("approvedById");

-- AddForeignKey
ALTER TABLE "logictoop_ai_tasks" ADD CONSTRAINT "logictoop_ai_tasks_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "logictoop_ai_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logictoop_ai_tasks" ADD CONSTRAINT "logictoop_ai_tasks_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "logic_toop_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logictoop_ai_tasks" ADD CONSTRAINT "logictoop_ai_tasks_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logictoop_ai_approvals" ADD CONSTRAINT "logictoop_ai_approvals_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "logictoop_ai_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logictoop_ai_approvals" ADD CONSTRAINT "logictoop_ai_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
