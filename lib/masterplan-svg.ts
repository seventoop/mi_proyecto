import { extractSvgViewBox } from "@/lib/svg-strip-labels";

export function isRawSvgString(value: string | null | undefined): value is string {
    return typeof value === "string" && /^\s*<svg\b/i.test(value);
}

export function svgToDataUri(svgString: string | null | undefined): string | null {
    if (!isRawSvgString(svgString)) return null;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

export function normalizeRawMasterplanSvg(svgString: string | null | undefined): string | null {
    if (!isRawSvgString(svgString)) return null;

    return svgString.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
        let nextAttrs = String(attrs);

        const setAttribute = (name: string, value: string) => {
            const doubleQuoted = new RegExp(`\\s${name}="[^"]*"`, "i");
            const singleQuoted = new RegExp(`\\s${name}='[^']*'`, "i");

            if (doubleQuoted.test(nextAttrs)) {
                nextAttrs = nextAttrs.replace(doubleQuoted, ` ${name}="${value}"`);
                return;
            }

            if (singleQuoted.test(nextAttrs)) {
                nextAttrs = nextAttrs.replace(singleQuoted, ` ${name}="${value}"`);
                return;
            }

            nextAttrs += ` ${name}="${value}"`;
        };

        setAttribute("width", "100%");
        setAttribute("height", "100%");
        setAttribute("preserveAspectRatio", "xMidYMid meet");

        return `<svg${nextAttrs}>`;
    });
}

export function getRawMasterplanSvgViewBox(svgString: string | null | undefined): string | null {
    const viewBox = extractSvgViewBox(svgString);
    return viewBox ? `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}` : null;
}
