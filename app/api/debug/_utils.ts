import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const DEBUG_TOKEN_HEADER = "x-debug-db-token";

function tokensMatch(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);

    if (receivedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function requireDebugAccess(req: NextRequest): NextResponse | null {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const expected = process.env.DEBUG_DB_TOKEN;
    const received = req.headers.get(DEBUG_TOKEN_HEADER);

    if (!expected || !received || !tokensMatch(received, expected)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return null;
}
