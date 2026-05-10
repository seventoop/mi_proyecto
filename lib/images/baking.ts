import sharp from "sharp";

interface Point {
    pitch: number;
    yaw: number;
}

interface BakeOptions {
    imageUrl: string;
    canvasState: any;
    imageWidth?: number;
    imageHeight?: number;
}

export async function bakePanoramaOverlay({
    imageUrl,
    canvasState,
}: BakeOptions): Promise<Buffer> {
    // 1. Load the original image
    // If imageUrl is absolute, we need to fetch it. If it's relative, we read from public/
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("http")) {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
        // Assume it's a local path in public/
        const fs = await import("fs/promises");
        const path = await import("path");
        const fullPath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
        imageBuffer = await fs.readFile(fullPath);
    }

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) throw new Error("Could not determine image dimensions");

    // 2. Project coordinates Yaw/Pitch -> X/Y
    const project = (pitch: number, yaw: number) => {
        const x = ((yaw + 180) / 360) * width;
        const y = ((90 - pitch) / 180) * height;
        return { x, y };
    };

    // 3. Generate SVG overlay
    let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Define Arrow marker
    svgContent += `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="white" />
      </marker>
    </defs>
    `;

    // A. Anchored Lines & Arrows
    const lines = canvasState.anchoredLines || [];
    lines.forEach((line: any) => {
        const segments = 40; // Subdivide for curvature
        let pathD = "";
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const p = line.pitch1 + (line.pitch2 - line.pitch1) * t;
            const y = line.yaw1 + (line.yaw2 - line.yaw1) * t;
            const coords = project(p, y);
            pathD += (i === 0 ? "M" : "L") + ` ${coords.x.toFixed(2)} ${coords.y.toFixed(2)}`;
        }

        svgContent += `<path d="${pathD}" stroke="${line.color || "white"}" stroke-width="${Math.round(width / 1000 * 4)}" fill="none" 
            ${line.type === "dashed" ? 'stroke-dasharray="20,10"' : ""} 
            ${line.type === "arrow" ? 'marker-end="url(#arrowhead)"' : ""} 
            opacity="0.9" stroke-linecap="round" />`;
    });

    // B. Freehand Strokes
    const strokes = canvasState.freehandStrokes || [];
    strokes.forEach((stroke: any) => {
        if (!stroke.points || stroke.points.length === 0) return;
        let pathD = "";
        stroke.points.forEach((p: Point, i: number) => {
            const coords = project(p.pitch, p.yaw);
            pathD += (i === 0 ? "M" : "L") + ` ${coords.x.toFixed(2)} ${coords.y.toFixed(2)}`;
        });

        svgContent += `<path d="${pathD}" stroke="${stroke.color || "white"}" stroke-width="${stroke.strokeWidth || 3}" fill="none" opacity="0.8" stroke-linecap="round" stroke-linejoin="round" />`;
    });

    // C. Anchored Texts
    const texts = canvasState.anchoredTexts || [];
    texts.forEach((t: any) => {
        const coords = project(t.pitch, t.yaw);
        const fontSize = Math.round(width / 1000 * 30);
        svgContent += `
        <text x="${coords.x}" y="${coords.y}" fill="white" font-family="sans-serif" font-weight="bold" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" style="paint-order: stroke; stroke: rgba(0,0,0,0.5); stroke-width: ${Math.round(fontSize / 10)}px;">
          ${t.text}
        </text>
        `;
    });

    svgContent += `</svg>`;

    // 4. Composite with Sharp
    return await sharp(imageBuffer)
        .composite([{ input: Buffer.from(svgContent), top: 0, left: 0 }])
        .jpeg({ quality: 90 })
        .toBuffer();
}
