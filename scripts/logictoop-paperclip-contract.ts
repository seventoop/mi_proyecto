/**
 * LogicToop AI - Paperclip Contract Tests (Phase 10F)
 * 
 * Tests the Paperclip sidecar and security utilities locally without DB or network.
 * Run with: npx tsx scripts/logictoop-paperclip-contract.ts
 */

import {
    getPaperclipMode,
    dispatchToPaperclipSidecar,
    PaperclipSidecarRequest
} from '../lib/logictoop/paperclip-sidecar-client';
import {
    createPaperclipIdempotencyKey,
    signPaperclipPayload,
    verifyPaperclipSignature,
    sanitizePaperclipMetadata
} from '../lib/logictoop/paperclip-security';

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

async function runTests() {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║   Paperclip Sidecar Contract Tests (Local)   ║");
    console.log("╚══════════════════════════════════════════════╝");
    
    // Save original env
    const originalEnv = { ...process.env };

    try {
        // ─── 1. getPaperclipMode ───
        section("1. getPaperclipMode");
        
        process.env.FEATURE_FLAG_PAPERCLIP = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX = "false";
        if (getPaperclipMode() === "DISABLED") pass("Flags off -> DISABLED");
        else fail("Flags off should be DISABLED");

        process.env.FEATURE_FLAG_PAPERCLIP = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX = "false";
        if (getPaperclipMode() === "STUB") pass("Paperclip ON, Real OFF, Sandbox OFF -> STUB");
        else fail("Paperclip ON, Real OFF, Sandbox OFF should be STUB");

        process.env.FEATURE_FLAG_PAPERCLIP = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX = "true";
        if (getPaperclipMode() === "SANDBOX") pass("Paperclip ON, Real OFF, Sandbox ON -> SANDBOX");
        else fail("Paperclip ON, Real OFF, Sandbox ON should be SANDBOX");

        process.env.FEATURE_FLAG_PAPERCLIP = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX = "true";
        if (getPaperclipMode() === "REAL") pass("Real ON -> REAL (caught later)");
        else fail("Real ON should be REAL");

        // ─── 2. createPaperclipIdempotencyKey ───
        section("2. createPaperclipIdempotencyKey");
        const key1 = createPaperclipIdempotencyKey({
            taskId: "task_1", orgId: "org_1", action: "test", timestampBucket: "2026-05-10"
        });
        const key2 = createPaperclipIdempotencyKey({
            taskId: "task_1", orgId: "org_1", action: "test", timestampBucket: "2026-05-10"
        });
        const key3 = createPaperclipIdempotencyKey({
            taskId: "task_2", orgId: "org_1", action: "test", timestampBucket: "2026-05-10"
        });
        
        if (key1 === key2) pass("Idempotency keys are deterministic");
        else fail("Idempotency keys are not deterministic");
        
        if (key1 !== key3) pass("Idempotency keys differ for different inputs");
        else fail("Idempotency keys do not differ for different inputs");
        
        if (key1.startsWith("ik_")) pass("Idempotency keys have correct prefix");
        else fail("Idempotency keys lack correct prefix");

        // ─── 3. signPaperclipPayload / verifyPaperclipSignature ───
        section("3. Security Signatures");
        const payloadStr = JSON.stringify({ test: "data" });
        const secret = "super_secret_test_key";
        const signature = signPaperclipPayload({ test: "data" }, secret);
        
        if (signature) pass("Successfully signed payload");
        else fail("Failed to sign payload");

        if (signature && verifyPaperclipSignature(payloadStr, signature, secret)) {
            pass("Signature verified successfully");
        } else {
            fail("Signature verification failed");
        }

        if (signature && !verifyPaperclipSignature(payloadStr, "wrong_signature", secret)) {
            pass("Invalid signature rejected correctly");
        } else {
            fail("Invalid signature NOT rejected");
        }

        if (!signPaperclipPayload({ test: "data" }, "")) {
            pass("Empty secret handled safely (returned null/error)");
        } else {
            fail("Empty secret did not handle correctly");
        }

        // ─── 4. sanitizePaperclipMetadata ───
        section("4. sanitizePaperclipMetadata");
        const dirtyMeta = {
            safe: "data",
            password: "mypassword123",
            userToken: "jwt.abc.123",
            nested: { secret: "hidden" }
        };
        const cleanMeta = sanitizePaperclipMetadata(dirtyMeta);
        
        if (cleanMeta.safe === "data") pass("Safe data preserved");
        else fail("Safe data altered");
        
        if (cleanMeta.password === "[REDACTED]") pass("Password redacted");
        else fail("Password not redacted");
        
        if (cleanMeta.userToken === "[REDACTED]") pass("Token redacted");
        else fail("Token not redacted");
        
        if (cleanMeta.nested === "[COMPLEX_OBJECT_TRUNCATED]") pass("Nested object truncated");
        else fail("Nested object not truncated");

        // ─── 5. dispatchToPaperclipSidecar ───
        section("5. dispatchToPaperclipSidecar");
        const baseRequest: PaperclipSidecarRequest = {
            taskId: "task_test",
            orgId: "org_test",
            idempotencyKey: "ik_test",
            inputPayload: {},
            mode: "dry_run",
            requestedAt: new Date().toISOString()
        };

        // Test DISABLED
        process.env.FEATURE_FLAG_PAPERCLIP = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "false";
        let res = await dispatchToPaperclipSidecar(baseRequest);
        if (res.status === "DISABLED") pass("Disabled mode handled correctly");
        else fail(`Expected DISABLED, got ${res.status}`);

        // Test STUB
        process.env.FEATURE_FLAG_PAPERCLIP = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX = "false";
        res = await dispatchToPaperclipSidecar(baseRequest);
        if (res.status === "STUB_ACCEPTED") pass("Stub mode handled correctly");
        else fail(`Expected STUB_ACCEPTED, got ${res.status}`);

        // Test SANDBOX
        process.env.FEATURE_FLAG_PAPERCLIP = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "false";
        process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX = "true";
        res = await dispatchToPaperclipSidecar(baseRequest);
        if (res.status === "SANDBOX_COMPLETED_NO_SIDE_EFFECTS") pass("Sandbox mode handled correctly");
        else fail(`Expected SANDBOX_COMPLETED_NO_SIDE_EFFECTS, got ${res.status}`);

        // Test REAL (Should be blocked)
        process.env.FEATURE_FLAG_PAPERCLIP = "true";
        process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = "true";
        res = await dispatchToPaperclipSidecar(baseRequest);
        if (res.status === "NOT_IMPLEMENTED") pass("Real mode safely blocked");
        else fail(`Expected NOT_IMPLEMENTED, got ${res.status}`);

    } catch (e: any) {
        fail(`Unhandled exception during tests: ${e.message}`);
    } finally {
        // Restore environment
        process.env = { ...originalEnv };
    }

    // ─── Summary ───
    section("SUMMARY");
    console.log(`\n  ✅ Pasaron: ${passCount}`);
    console.log(`  ⚠️  Warnings: ${warnCount}`);
    console.log(`  ❌ Blockers: ${failCount}`);

    if (failCount > 0) {
        console.error("\n  ⛔ TEST FAILED. Por favor revisar los blockers.");
        process.exit(1);
    } else {
        console.log("\n  🚀 Tests de contrato finalizados exitosamente.");
        process.exit(0);
    }
}

runTests();
