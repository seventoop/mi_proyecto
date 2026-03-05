-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "trigger" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_nodos" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "workflow_nodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "entityId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run_pasos" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "nodoTipo" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'OK',
    "ms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_run_pasos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflows_orgId_idx" ON "workflows"("orgId");

-- CreateIndex
CREATE INDEX "workflow_nodos_workflowId_idx" ON "workflow_nodos"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowId_idx" ON "workflow_runs"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_runs_entityId_idx" ON "workflow_runs"("entityId");

-- CreateIndex
CREATE INDEX "workflow_run_pasos_runId_idx" ON "workflow_run_pasos"("runId");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_nodos" ADD CONSTRAINT "workflow_nodos_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run_pasos" ADD CONSTRAINT "workflow_run_pasos_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
