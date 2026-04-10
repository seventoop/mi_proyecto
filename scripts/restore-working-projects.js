const fs = require("fs");
const path = require("path");

const backupPath = path.join(__dirname, "..", "attached_assets", "backup_seventoop_1773968866286.sql");
const outDir = path.join(__dirname, "out");
const outPath = path.join(outDir, "restore-working-projects.sql");

const targetProjectIds = new Set([
    "cmmtx7u1a0003lkgtsx73abw4",
    "cmmtx7u2b0008lkgtp2jr7yy6",
]);

function parseCopySections(sql) {
    const lines = sql.split(/\r?\n/);
    const sections = new Map();
    let current = null;

    for (const line of lines) {
        const copyMatch = line.match(/^COPY public\.([a-zA-Z0-9_]+) \((.+)\) FROM stdin;$/);
        if (copyMatch) {
            current = {
                table: copyMatch[1],
                columns: copyMatch[2],
                rows: [],
            };
            sections.set(current.table, current);
            continue;
        }

        if (!current) continue;

        if (line === "\\.") {
            current = null;
        } else {
            current.rows.push(line);
        }
    }

    return sections;
}

function selectRows(rows, index, allowed) {
    return rows.filter((row) => {
        const value = row.split("\t")[index];
        return allowed.has(value);
    });
}

function buildCopyBlock(section, rows) {
    if (!section || rows.length === 0) return "";
    return `COPY public.${section.table} (${section.columns}) FROM stdin;\n${rows.join("\n")}\n\\.\n\n`;
}

function sanitizeUnidadRows(rows) {
    return rows.map((row) => {
        const parts = row.split("\t");
        if (parts.length > 19) {
            parts[19] = "\\N";
        }
        return parts.join("\t");
    });
}

function main() {
    const backup = fs.readFileSync(backupPath, "utf16le");
    const sections = parseCopySections(backup);

    const proyectosRows = selectRows(sections.get("proyectos").rows, 0, targetProjectIds);
    const etapaRows = selectRows(sections.get("etapas").rows, 1, targetProjectIds);
    const etapaIds = new Set(etapaRows.map((row) => row.split("\t")[0]));

    const manzanaRows = selectRows(sections.get("manzanas").rows, 1, etapaIds);
    const manzanaIds = new Set(manzanaRows.map((row) => row.split("\t")[0]));

    const unidadRows = sanitizeUnidadRows(selectRows(sections.get("unidades").rows, 1, manzanaIds));
    const proyectoImagenRows = selectRows(sections.get("proyecto_imagenes").rows, 1, targetProjectIds);
    const imagenMapaRows = selectRows(sections.get("imagenes_mapa").rows, 1, targetProjectIds);
    const infraestructuraRows = selectRows(sections.get("infraestructuras").rows, 1, targetProjectIds);

    const sql = `BEGIN;

DELETE FROM public.imagenes_mapa WHERE "proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');
DELETE FROM public.proyecto_imagenes WHERE "proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');
DELETE FROM public.infraestructuras WHERE "proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');
DELETE FROM public.unidades WHERE "manzanaId" IN (
    SELECT m.id
    FROM public.manzanas m
    JOIN public.etapas e ON e.id = m."etapaId"
    WHERE e."proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6')
);
DELETE FROM public.manzanas WHERE "etapaId" IN (
    SELECT id
    FROM public.etapas
    WHERE "proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6')
);
DELETE FROM public.etapas WHERE "proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');
DELETE FROM public.proyecto_usuarios WHERE "proyectoId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');
DELETE FROM public.project_feature_flags WHERE "projectId" IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');
DELETE FROM public.proyectos WHERE id IN ('cmmtx7u1a0003lkgtsx73abw4','cmmtx7u2b0008lkgtp2jr7yy6');

${buildCopyBlock(sections.get("proyectos"), proyectosRows)}${buildCopyBlock(
        sections.get("etapas"),
        etapaRows
    )}${buildCopyBlock(sections.get("manzanas"), manzanaRows)}${buildCopyBlock(
        sections.get("unidades"),
        unidadRows
    )}${buildCopyBlock(sections.get("proyecto_imagenes"), proyectoImagenRows)}${buildCopyBlock(
        sections.get("imagenes_mapa"),
        imagenMapaRows
    )}${buildCopyBlock(sections.get("infraestructuras"), infraestructuraRows)}
UPDATE public.proyectos
SET
    nombre = 'Barrio Los Álamos',
    descripcion = 'Urbanización premium con lotes amplios en zona norte',
    ubicacion = 'Córdoba, Argentina',
    estado = 'EN_VENTA',
    tipo = 'URBANIZACION',
    "visibilityStatus" = 'PUBLICADO',
    "deletedAt" = NULL
WHERE id = 'cmmtx7u1a0003lkgtsx73abw4';

UPDATE public.proyectos
SET
    nombre = 'Reserva Geodevia',
    ubicacion = 'Valle de Punilla, Córdoba, Argentina',
    estado = 'EN_VENTA',
    tipo = 'ECO_BARRIO',
    "visibilityStatus" = 'PUBLICADO',
    "deletedAt" = NULL
WHERE id = 'cmmtx7u2b0008lkgtp2jr7yy6';

COMMIT;
`;

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, sql, "utf8");

    console.log(
        JSON.stringify(
            {
                ok: true,
                outPath,
                restoredProjects: proyectosRows.length,
                restoredEtapas: etapaRows.length,
                restoredManzanas: manzanaRows.length,
                restoredUnidades: unidadRows.length,
            },
            null,
            2
        )
    );
}

main();
