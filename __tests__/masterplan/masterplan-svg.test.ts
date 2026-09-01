import { describe, expect, it } from "vitest";
import {
    getRawMasterplanSvgViewBox,
    isRawSvgString,
    normalizeRawMasterplanSvg,
    svgToDataUri,
} from "@/lib/masterplan-svg";

describe("masterplan SVG rendering helpers", () => {
    it("keeps a minimal rect/text SVG renderable as a static masterplan", () => {
        const svg = `
            <svg viewBox="10 20 300 150" width="300" height="150" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="300" height="150" fill="#f8fafc" />
                <text x="40" y="60">Valles del Pino</text>
            </svg>
        `;

        const normalized = normalizeRawMasterplanSvg(svg);

        expect(isRawSvgString(svg)).toBe(true);
        expect(getRawMasterplanSvgViewBox(svg)).toBe("10 20 300 150");
        expect(normalized).toContain('viewBox="10 20 300 150"');
        expect(normalized).toContain('width="100%"');
        expect(normalized).toContain('height="100%"');
        expect(normalized).toContain('preserveAspectRatio="xMidYMid meet"');
        expect(normalized).toContain("<rect");
        expect(normalized).toContain("<text");
    });

    it("converts raw SVG markup into a valid SVG data URI", () => {
        const svg = `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="50" fill="#fff" /></svg>`;

        const dataUri = svgToDataUri(svg);

        expect(dataUri).toBeTruthy();
        expect(dataUri).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
        expect(dataUri).not.toContain("<svg");
        expect(decodeURIComponent(dataUri!.replace("data:image/svg+xml;charset=utf-8,", ""))).toBe(svg);
    });
});
