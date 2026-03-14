-- CreateTable
CREATE TABLE "logic_toop_flows" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "triggerType" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logic_toop_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logic_toop_executions" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "triggerPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "logs" JSONB NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "logic_toop_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logic_toop_templates" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "triggerType" TEXT NOT NULL,
    "defaultActions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logic_toop_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logic_toop_flows_orgId_idx" ON "logic_toop_flows"("orgId");

-- CreateIndex
CREATE INDEX "logic_toop_flows_triggerType_idx" ON "logic_toop_flows"("triggerType");

-- CreateIndex
CREATE INDEX "logic_toop_executions_flowId_idx" ON "logic_toop_executions"("flowId");

-- AddForeignKey
ALTER TABLE "logic_toop_flows" ADD CONSTRAINT "logic_toop_flows_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logic_toop_executions" ADD CONSTRAINT "logic_toop_executions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "logic_toop_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
