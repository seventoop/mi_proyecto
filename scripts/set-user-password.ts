/**
 * scripts/set-user-password.ts
 *
 * Securely set or reset a user's password from the CLI.
 *
 * Usage:
 *   npm run set-password -- --email user@example.com
 *   npm run set-password                       # will prompt for email
 *
 * Behavior:
 *   - Reads the target email from the --email flag (or prompts for it).
 *   - Validates that the user exists in the DB pointed to by DATABASE_URL.
 *   - Prompts for the new password TWICE with input hidden (no echo, not in
 *     shell history, not visible via `ps`).
 *   - Hashes with bcrypt (10 rounds, same as the rest of the codebase).
 *   - Updates User.password and writes an AuditLog entry with action
 *     "AUTH_PASSWORD_SET_BY_ADMIN".
 *   - NEVER prints the password or its hash.
 *   - NEVER accepts the password via CLI argument or env var.
 *
 * Notes:
 *   - This script intentionally has no admin UI counterpart: the only way to
 *     set a password out-of-band is by having shell access to the env that
 *     holds DATABASE_URL.
 *   - To target the production (Railway) DB, run with the production
 *     DATABASE_URL exported in the current shell session.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";
import { Writable } from "stream";
import { sendPasswordChangedNotification } from "../lib/email/password-changed-notification";

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

function parseEmailFlag(argv: string[]): string | null {
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--email" || a === "-e") {
            return (argv[i + 1] ?? "").trim() || null;
        }
        if (a.startsWith("--email=")) {
            return a.slice("--email=".length).trim() || null;
        }
    }
    return null;
}

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Prompt for a value with input hidden (no echo).
 * Implemented by writing through a muted stream and intercepting raw input
 * so the password never appears on screen, in `ps`, or in shell history.
 */
function promptHidden(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const mutableStdout = new Writable({
            write(chunk, encoding, callback) {
                const str = chunk.toString();
                // Allow the prompt itself + newlines through; suppress
                // everything else (i.e. the typed characters).
                if ((mutableStdout as any).muted !== true) {
                    process.stdout.write(str);
                }
                callback();
            },
        });
        (mutableStdout as any).muted = false;

        const rl = readline.createInterface({
            input: process.stdin,
            output: mutableStdout,
            terminal: true,
        });

        rl.question(question, (answer) => {
            (mutableStdout as any).muted = false;
            process.stdout.write("\n");
            rl.close();
            resolve(answer);
        });

        // Mute right after the prompt is written.
        (mutableStdout as any).muted = true;

        rl.on("close", () => {
            (mutableStdout as any).muted = false;
        });

        rl.on("SIGINT", () => {
            rl.close();
            reject(new Error("Cancelled by user"));
        });
    });
}

async function main() {
    const prisma = new PrismaClient();

    try {
        let email = parseEmailFlag(process.argv.slice(2));
        if (!email) {
            email = await prompt("Email: ");
        }
        email = email.toLowerCase().trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.error("Invalid email format.");
            process.exit(1);
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, nombre: true, rol: true, googleId: true, password: true },
        });

        if (!user) {
            console.error(`No user found with email '${email}'.`);
            process.exit(1);
        }

        const hadPassword = user.password !== null;
        console.log(
            `Target user: ${user.email} (id=${user.id.substring(0, 8)}..., rol=${user.rol}, ` +
            `hasGoogle=${user.googleId !== null}, hasPassword=${hadPassword})`,
        );

        const password = await promptHidden("New password: ");
        if (password.length < MIN_PASSWORD_LENGTH) {
            console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            process.exit(1);
        }

        const confirm = await promptHidden("Confirm new password: ");
        if (password !== confirm) {
            console.error("Passwords do not match.");
            process.exit(1);
        }

        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashed,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "AUTH_PASSWORD_SET_BY_ADMIN",
                entity: "User",
                entityId: user.id,
                details: JSON.stringify({
                    method: "CLI_SCRIPT",
                    previouslyHadPassword: hadPassword,
                }),
            },
        });

        // Security loop (Task #16): warn the account owner that their
        // password was just changed out-of-band. This script runs from a
        // shell session, so there is no `headers()` context — IP and UA
        // are intentionally null and the email will say "desconocida".
        // Best-effort: a Resend outage must NOT prevent the operator
        // from finishing the password change locally.
        const notify = await sendPasswordChangedNotification({
            userId: user.id,
            email: user.email,
            ip: null,
            userAgent: null,
            source: "ADMIN_CLI",
        });

        console.log(
            `Password ${hadPassword ? "updated" : "set"} for ${user.email}. ` +
            `Audit log entry recorded (AUTH_PASSWORD_SET_BY_ADMIN). ` +
            `Owner notification email: ${notify.sent ? "sent" : "NOT sent (see logs)"}.`,
        );
    } catch (err) {
        console.error("set-user-password failed:", err instanceof Error ? err.message : err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
