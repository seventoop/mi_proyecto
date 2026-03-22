/**
 * seed-steps.ts
 * Populates demo projects with data for steps 2, 4 and 5:
 *   Step 2 – Plano del Proyecto  → masterplanSVG
 *   Step 4 – Mapa Interactivo   → overlayBounds (+ overlayUrl placeholder)
 *   Step 5 – Tour 360           → imagenesMapa records
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ─── SVG GENERATOR ────────────────────────────────────────────────────────────
// Generates a grid-based lot plan SVG that the BlueprintEngine can parse.
// Each lot is a <rect> with id="lot-N" and a <text> label inside.
interface LotDef { id: string; label: string; x: number; y: number; w: number; h: number; }
interface ManzanaDef { label: string; lots: LotDef[]; }

function generateBlueprintSVG(
    projectName: string,
    manzanas: ManzanaDef[],
    streets: { label: string; x1: number; y1: number; x2: number; y2: number }[],
): string {
    const PAD = 60;
    const COLS_PER_MANZANA = 5;
    const LOT_W = 80;
    const LOT_H = 100;
    const GAP = 12; // street gap between manzanas
    const MANZANA_SPACING = 40;

    // Compute total width/height
    const totalW = manzanas.length * (COLS_PER_MANZANA * (LOT_W + 2) + MANZANA_SPACING) + PAD * 2;
    const maxRows = Math.max(...manzanas.map(m => Math.ceil(m.lots.length / COLS_PER_MANZANA)));
    const totalH = maxRows * (LOT_H + 2) + PAD * 2 + 80;

    let paths = "";
    let labels = "";
    let manzanaLabels = "";

    manzanas.forEach((manzana, mi) => {
        const mxBase = PAD + mi * (COLS_PER_MANZANA * (LOT_W + 2) + MANZANA_SPACING);
        const myBase = PAD + 60;

        // Manzana label
        const manzanaCenterX = mxBase + (COLS_PER_MANZANA * (LOT_W + 2)) / 2;
        manzanaLabels += `<text x="${manzanaCenterX}" y="${myBase - 15}" font-size="14" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle" font-weight="bold">${manzana.label}</text>\n`;

        manzana.lots.forEach((lot, li) => {
            const col = li % COLS_PER_MANZANA;
            const row = Math.floor(li / COLS_PER_MANZANA);
            const lx = mxBase + col * (LOT_W + 2);
            const ly = myBase + row * (LOT_H + 2);
            const cx = lx + LOT_W / 2;
            const cy = ly + LOT_H / 2;

            paths += `<rect id="${lot.id}" x="${lx}" y="${ly}" width="${LOT_W}" height="${LOT_H}" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="${lot.label}" data-area="${(LOT_W * LOT_H * 0.01).toFixed(2)}"/>\n`;
            labels += `<text x="${cx}" y="${cy + 5}" font-size="11" font-family="Arial,sans-serif" fill="#475569" text-anchor="middle" pointer-events="none">${lot.label}</text>\n`;
        });
    });

    // Street lines
    let streetLines = "";
    streets.forEach(s => {
        streetLines += `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>\n`;
        const mx = (s.x1 + s.x2) / 2;
        const my = (s.y1 + s.y2) / 2;
        streetLines += `<text x="${mx}" y="${my - 4}" font-size="10" font-family="Arial,sans-serif" fill="#94a3b8" text-anchor="middle">${s.label}</text>\n`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <!-- Title -->
  <text x="${totalW / 2}" y="40" font-size="18" font-family="Arial,sans-serif" fill="#f1f5f9" text-anchor="middle" font-weight="bold">${projectName}</text>
  <text x="${totalW / 2}" y="58" font-size="11" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle">Plano de Loteo — Referencia</text>
  <!-- Streets -->
  ${streetLines}
  <!-- Lots -->
  ${paths}
  <!-- Lot labels -->
  ${labels}
  <!-- Manzana labels -->
  ${manzanaLabels}
  <!-- North arrow -->
  <g transform="translate(${totalW - 50}, 70)">
    <circle cx="0" cy="0" r="18" fill="none" stroke="#475569" stroke-width="1.5"/>
    <polygon points="0,-14 5,6 0,2 -5,6" fill="#f97316"/>
    <text x="0" y="28" font-size="10" font-family="Arial,sans-serif" fill="#94a3b8" text-anchor="middle">N</text>
  </g>
</svg>`;
}

// ─── BUILD LOT DEFS FROM DB UNIDADES ─────────────────────────────────────────
function buildManzanaDefs(manzanas: any[]): ManzanaDef[] {
    return manzanas.map((m: any) => ({
        label: m.nombre,
        lots: m.unidades.map((u: any) => ({
            id: `lot-${u.numero.replace(/\s/g, "-")}`,
            label: u.numero,
            x: 0, y: 0, w: 80, h: 100,
        })),
    }));
}

// ─── OVERLAY BOUNDS helper ────────────────────────────────────────────────────
// Returns [[swLat, swLng], [neLat, neLng]] offsetting ~200m around center
function computeBounds(lat: number, lng: number, mDelta = 0.0025): [[number, number], [number, number]] {
    return [[lat - mDelta, lng - mDelta], [lat + mDelta, lng + mDelta]];
}

// ─── IMAGES per project (Unsplash aerial/lot photos) ─────────────────────────
const IMAGE_SETS: Record<string, { url: string; titulo: string }[]> = {
    "barrio-las-casuarinas": [
        { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop", titulo: "Vista aérea Norte" },
        { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1600&auto=format&fit=crop", titulo: "Acceso principal" },
        { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop", titulo: "Sector Manzana A" },
        { url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=1600&auto=format&fit=crop", titulo: "Lindero Sur" },
    ],
    "loteo-san-martin-mendoza": [
        { url: "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?q=80&w=1600&auto=format&fit=crop", titulo: "Vista general Mendoza" },
        { url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1600&auto=format&fit=crop", titulo: "Parcelamiento sector 1" },
        { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1600&auto=format&fit=crop", titulo: "Sector manzana 2" },
    ],
    "chacras-del-norte-santa-fe": [
        { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop", titulo: "Panorámica Norte" },
        { url: "https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=1600&auto=format&fit=crop", titulo: "Chacras sector Norte" },
        { url: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=1600&auto=format&fit=crop", titulo: "Lindero Ruta 70" },
    ],
    "villa-del-lago-buenos-aires": [
        { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600&auto=format&fit=crop", titulo: "Laguna central" },
        { url: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?q=80&w=1600&auto=format&fit=crop", titulo: "Lotes frente al lago" },
        { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1600&auto=format&fit=crop", titulo: "Sector parque" },
        { url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1600&auto=format&fit=crop", titulo: "Acceso barrio" },
    ],
};

const STREETS_BY_SLUG: Record<string, { label: string; x1: number; y1: number; x2: number; y2: number }[]> = {
    "barrio-las-casuarinas": [
        { label: "Av. Los Plátanos", x1: 60, y1: 430, x2: 580, y2: 430 },
        { label: "Calle Los Pinos", x1: 300, y1: 80, x2: 300, y2: 430 },
    ],
    "loteo-san-martin-mendoza": [
        { label: "Calle Sarmiento", x1: 60, y1: 430, x2: 530, y2: 430 },
        { label: "Bv. Rivadavia", x1: 270, y1: 80, x2: 270, y2: 430 },
    ],
    "chacras-del-norte-santa-fe": [
        { label: "Ruta Provincial 70", x1: 60, y1: 450, x2: 520, y2: 450 },
        { label: "Camino Las Lomas", x1: 290, y1: 80, x2: 290, y2: 450 },
    ],
    "villa-del-lago-buenos-aires": [
        { label: "Calle Los Lagos", x1: 60, y1: 430, x2: 580, y2: 430 },
        { label: "Av. del Parque", x1: 310, y1: 80, x2: 310, y2: 430 },
    ],
};

async function main() {
    const projects = await prisma.proyecto.findMany({
        where: { slug: { in: ["barrio-las-casuarinas","loteo-san-martin-mendoza","chacras-del-norte-santa-fe","villa-del-lago-buenos-aires"] } },
        include: {
            etapas: { include: { manzanas: { include: { unidades: { orderBy: { numero: "asc" } } } } }, orderBy: { orden: "asc" } },
        },
    });

    for (const p of projects) {
        console.log(`\n▶ ${p.nombre} (${p.slug})`);

        const allManzanas = p.etapas.flatMap((e: any) => e.manzanas);
        const manzanaDefs = buildManzanaDefs(allManzanas);
        const streets = STREETS_BY_SLUG[p.slug!] ?? [];

        // ── STEP 2: masterplanSVG ──────────────────────────────
        const svg = generateBlueprintSVG(p.nombre, manzanaDefs, streets);
        await prisma.proyecto.update({
            where: { id: p.id },
            data: { masterplanSVG: svg },
        });
        console.log(`  ✓ Paso 2 — masterplanSVG generado (${manzanaDefs.length} manzanas, ${manzanaDefs.reduce((a,m)=>a+m.lots.length,0)} lotes)`);

        // ── STEP 4: overlayBounds ─────────────────────────────
        const lat = p.mapCenterLat ?? -31.33;
        const lng = p.mapCenterLng ?? -64.22;
        const bounds = computeBounds(lat, lng, 0.003);
        await prisma.proyecto.update({
            where: { id: p.id },
            data: { overlayBounds: JSON.stringify(bounds) },
        });
        console.log(`  ✓ Paso 4 — overlayBounds definido (SW: ${bounds[0]}, NE: ${bounds[1]})`);

        // ── STEP 5: imagenesMapa ──────────────────────────────
        const images = IMAGE_SETS[p.slug!] ?? [];
        // Delete existing to avoid dupes
        await prisma.imagenMapa.deleteMany({ where: { proyectoId: p.id } });

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            // Spread images around center
            const offsetLat = lat + (i - images.length / 2) * 0.0008;
            const offsetLng = lng + (i % 2 === 0 ? 0.001 : -0.001);
            await prisma.imagenMapa.create({
                data: {
                    proyectoId: p.id,
                    url: img.url,
                    tipo: "foto",
                    titulo: img.titulo,
                    lat: offsetLat,
                    lng: offsetLng,
                    orden: i,
                    altitudM: 500,
                    imageHeading: i * 45,
                },
            });
        }
        console.log(`  ✓ Paso 5 — ${images.length} imágenes del mapa cargadas`);
    }

    console.log("\n✅ Pasos 2, 4 y 5 completados para todos los proyectos demo.");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
