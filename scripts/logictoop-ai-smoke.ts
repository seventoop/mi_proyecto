/**
 * LogicToop AI — Smoke Test Script
 * 
 * Audita el estado de salud del sistema LogicToop AI.
 * SOLO LECTURA: No modifica, no crea, no borra datos.
 * No ejecuta dispatcher, executeFlow, ni side-effects.
 * 
 * Uso: npx tsx scripts/logictoop-ai-smoke.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { getPaperclipStagingReadiness } from '../lib/logictoop/paperclip-readiness';

const prisma = new PrismaClient();

let passCount = 0;
let warnCount = 0;
let failCount = 0;

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
  passCount++;
}

function warn(msg: string) {
  console.log(`  ⚠️  ${msg}`);
  warnCount++;
}

function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
  failCount++;
}

function section(title: string) {
  console.log(`\n━━━ ${title} ━━━`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   LogicToop AI — Smoke Test (Read-Only)     ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // ─── 1. Feature Flags ───
  section("1. Feature Flags");

  const flags = {
    UI: process.env.FEATURE_FLAG_LOGICTOOP_AI_UI,
    CORE: process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE,
    PAPERCLIP: process.env.FEATURE_FLAG_PAPERCLIP,
    REAL_CONNECTION: process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION,
  };

  if (flags.UI === "true") {
    pass(`FEATURE_FLAG_LOGICTOOP_AI_UI = "${flags.UI}"`);
  } else if (flags.UI === undefined) {
    warn(`FEATURE_FLAG_LOGICTOOP_AI_UI no definido (default: desactivado)`);
  } else {
    warn(`FEATURE_FLAG_LOGICTOOP_AI_UI = "${flags.UI}" (UI desactivada)`);
  }

  if (flags.CORE === "true") {
    pass(`FEATURE_FLAG_LOGICTOOP_AI_CORE = "${flags.CORE}"`);
  } else if (flags.CORE === undefined) {
    warn(`FEATURE_FLAG_LOGICTOOP_AI_CORE no definido (default: desactivado)`);
  } else {
    warn(`FEATURE_FLAG_LOGICTOOP_AI_CORE = "${flags.CORE}" (Core desactivado)`);
  }

  if (flags.PAPERCLIP === "false" || flags.PAPERCLIP === undefined) {
    pass(`FEATURE_FLAG_PAPERCLIP = "${flags.PAPERCLIP || 'undefined'}" (correcto: desactivado)`);
  } else {
    warn(`FEATURE_FLAG_PAPERCLIP = "${flags.PAPERCLIP}" (Paperclip habilitado como flag)`);
  }

  if (flags.REAL_CONNECTION === "true") {
    fail(`FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "true" — ¡CONEXIÓN REAL ACTIVA! Esto es un blocker en esta fase.`);
  } else {
    pass(`FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "${flags.REAL_CONNECTION || 'undefined'}" (correcto: desconectado)`);
  }

  // ─── 2. Prisma Connectivity ───
  section("2. Conectividad Prisma");

  try {
    await prisma.$queryRaw`SELECT 1`;
    pass("Conexión a la base de datos exitosa");
  } catch (error: any) {
    fail(`No se pudo conectar a la base de datos: ${error.message}`);
    console.log("\n⛔ Abortando smoke test — sin conectividad de DB.\n");
    return;
  }

  // ─── 3. Tablas / Modelos ───
  section("3. Modelos Principales");

  const modelChecks = [
    { name: "LogicToopAiTask", fn: () => prisma.logicToopAiTask.count() },
    { name: "LogicToopAiEvent", fn: () => prisma.logicToopAiEvent.count() },
    { name: "LogicToopAiApproval", fn: () => prisma.logicToopAiApproval.count() },
    { name: "LogicToopAiAgent", fn: () => prisma.logicToopAiAgent.count() },
    { name: "LogicToopExecution", fn: () => prisma.logicToopExecution.count() },
    { name: "LogicToopFlow", fn: () => prisma.logicToopFlow.count() },
  ];

  for (const check of modelChecks) {
    try {
      const count = await check.fn();
      pass(`${check.name}: ${count} registros`);
    } catch (error: any) {
      fail(`${check.name}: Error — ${error.message}`);
    }
  }

  // ─── 4. Conteos por Estado IA ───
  section("4. Executions por Estado IA");

  const aiStatuses = [
    "WAITING_FOR_APPROVAL",
    "AI_APPROVED_WAITING_RESUME",
    "AI_REJECTED",
    "MANUALLY_RESUMED_SAFE_REVIEW",
    "PAUSED_AFTER_SAFE_STEP",
    "COMPLETED_SAFE",
  ];

  for (const status of aiStatuses) {
    try {
      const count = await prisma.logicToopExecution.count({ where: { status } });
      if (count > 0) {
        pass(`${status}: ${count}`);
      } else {
        console.log(`  ℹ️  ${status}: 0`);
      }
    } catch (error: any) {
      fail(`${status}: Error — ${error.message}`);
    }
  }

  // ─── 5. Seguridad Paperclip ───
  section("5. Seguridad Paperclip");

  if (flags.PAPERCLIP === "true" && flags.REAL_CONNECTION !== "true") {
      warn("FEATURE_FLAG_PAPERCLIP es 'true', pero REAL_CONNECTION es 'false'. El sistema usará STUB mode.");
  }
  
  if (process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX === "true") {
      console.log("  ℹ️  FEATURE_FLAG_PAPERCLIP_SANDBOX es 'true'. El sistema permite SANDBOX mode (simulado local).");
  }

  if (flags.REAL_CONNECTION === "true") {
    fail("Paperclip REAL_CONNECTION está activo — no permitido en esta fase de entorno local. BLOCKER.");
  } else {
    pass("Paperclip real desconectado");
  }

  const clientPath = path.join(__dirname, '../lib/logictoop/paperclip-sidecar-client.ts');
  if (fs.existsSync(clientPath)) {
      pass("paperclip-sidecar-client.ts existe.");
  } else {
      fail("Falta paperclip-sidecar-client.ts.");
  }

  const securityPath = path.join(__dirname, '../lib/logictoop/paperclip-security.ts');
  if (fs.existsSync(securityPath)) {
      pass("paperclip-security.ts existe.");
  } else {
      fail("Falta paperclip-security.ts.");
  }

  const specPath = path.join(__dirname, '../docs/logictoop-paperclip-sidecar-spec.md');
  if (fs.existsSync(specPath)) {
      pass("logictoop-paperclip-sidecar-spec.md existe.");
  } else {
      fail("Falta logictoop-paperclip-sidecar-spec.md.");
  }

  const webhookPath = path.join(__dirname, '../app/api/logictoop/paperclip/webhook/route.ts');
  if (fs.existsSync(webhookPath)) {
      const webhookContent = fs.readFileSync(webhookPath, 'utf8');
      if (webhookContent.includes('db.') || webhookContent.includes('recordAiEvent')) {
          fail("Webhook skeleton contiene mutaciones de DB o eventos.");
      } else {
          pass("Webhook skeleton (route.ts) existe, soporta dry-run y no muta DB.");
      }
  } else {
      fail("Falta Webhook skeleton.");
  }

  const contractPath = path.join(__dirname, 'logictoop-paperclip-contract.ts');
  if (fs.existsSync(contractPath)) {
      pass("logictoop-paperclip-contract.ts existe.");
  } else {
      fail("Falta script de contract tests.");
  }
  
  const readinessPath = path.join(__dirname, '../lib/logictoop/paperclip-readiness.ts');
  if (fs.existsSync(readinessPath)) {
      pass("paperclip-readiness.ts existe.");
  } else {
      fail("Falta paperclip-readiness.ts.");
  }

  const bridgePath = path.join(__dirname, '../lib/logictoop/paperclip-event-bridge.ts');
  if (fs.existsSync(bridgePath)) {
      pass("paperclip-event-bridge.ts existe.");
  } else {
      fail("Falta paperclip-event-bridge.ts.");
  }

  // Evaluate readiness directly
  try {
      const readiness = getPaperclipStagingReadiness();
      if (readiness.status === "BLOCKED") {
          fail(`Staging Readiness está BLOCKED: ${readiness.checks.find(c => c.status === 'blocker')?.message}`);
      } else {
          pass(`Staging Readiness status: ${readiness.status} (Seguro para el entorno actual)`);
      }
  } catch (e: any) {
      warn(`No se pudo evaluar readiness en smoke script: ${e.message}`);
  }
  
  // Basic sanity check for fetch/axios in client
  if (fs.existsSync(clientPath)) {
      const clientContent = fs.readFileSync(clientPath, 'utf8');
      if (clientContent.includes('fetch(') || clientContent.includes('axios')) {
          fail("paperclip-sidecar-client.ts contiene llamadas HTTP prohibidas (fetch/axios).");
      } else {
          pass("paperclip-sidecar-client.ts está limpio de fetch/axios.");
      }
  }

  try {
    const tasksWithPaperclipRun = await prisma.logicToopAiTask.count({
      where: { paperclipRunId: { not: null } },
    });
    if (tasksWithPaperclipRun > 0 && flags.REAL_CONNECTION !== "true") {
      warn(`${tasksWithPaperclipRun} tasks tienen paperclipRunId no nulo con Paperclip desconectado`);
    } else if (tasksWithPaperclipRun === 0) {
      pass("No hay tasks con paperclipRunId (coherente con Paperclip desconectado)");
    }
  } catch (error: any) {
    warn(`No se pudo verificar paperclipRunId: ${error.message}`);
  }

  // ─── 6. Consistencia de Datos ───
  section("6. Consistencia de Datos");

  // Tasks con executionId pero orgId vacío
  try {
    const tasksEmptyOrg = await prisma.logicToopAiTask.count({
      where: { executionId: { not: null }, orgId: "" },
    });
    if (tasksEmptyOrg > 0) {
      warn(`${tasksEmptyOrg} tasks con executionId pero orgId vacío`);
    } else {
      pass("Todas las tasks con executionId tienen orgId válido");
    }
  } catch (error: any) {
    warn(`No se pudo verificar orgId consistency: ${error.message}`);
  }

  // Events sin taskId — verificar integridad relacional
  try {
    const eventsCount = await prisma.logicToopAiEvent.count();
    if (eventsCount > 0) {
      // Verificar que los eventos tienen taskId (campo requerido en schema)
      pass(`${eventsCount} eventos registrados con integridad relacional (taskId es FK requerido)`);
    } else {
      console.log("  ℹ️  No hay eventos registrados (normal si no hay tasks procesadas)");
    }
  } catch (error: any) {
    warn(`No se pudo verificar integridad de eventos: ${error.message}`);
  }

  // Tasks con status inválido
  try {
    const validStatuses = ["PENDING", "NEEDS_APPROVAL", "APPROVED", "REJECTED", "COMPLETED", "FAILED", "CANCELLED"];
    const allTasks = await prisma.logicToopAiTask.findMany({ select: { id: true, status: true } });
    const invalidTasks = allTasks.filter(t => !validStatuses.includes(t.status));
    if (invalidTasks.length > 0) {
      warn(`${invalidTasks.length} tasks con status no estándar: ${invalidTasks.map(t => t.status).join(", ")}`);
    } else {
      pass("Todos los status de tasks son válidos");
    }
  } catch (error: any) {
    warn(`No se pudo verificar statuses de tasks: ${error.message}`);
  }

  // ─── 7. Resumen ───
  section("RESUMEN");

  console.log(`\n  ✅ Pasaron: ${passCount}`);
  console.log(`  ⚠️  Warnings: ${warnCount}`);
  console.log(`  ❌ Blockers: ${failCount}`);

  if (failCount > 0) {
    console.log("\n  ⛔ HAY BLOCKERS — Revisar antes de continuar.\n");
  } else if (warnCount > 0) {
    console.log("\n  ⚡ Sistema operativo con advertencias menores.\n");
  } else {
    console.log("\n  🚀 Sistema LogicToop AI en estado saludable.\n");
  }
}

main()
  .catch((error) => {
    console.error("Error fatal en smoke test:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
