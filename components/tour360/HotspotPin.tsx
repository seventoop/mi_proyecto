"use client";

interface HotspotUnit {
    id: string;
    numero: string;
    estado: string;
    coordenadasTour?: { x: number; y: number } | null;
}

interface HotspotPinProps {
    unidad: HotspotUnit;
    onClick: (u: HotspotUnit) => void;
}

const ESTADO_BG: Record<string, string> = {
    DISPONIBLE: "bg-emerald-500",
    RESERVADO:  "bg-amber-400",
    RESERVADA:  "bg-amber-400",
    VENDIDO:    "bg-rose-500",
    VENDIDA:    "bg-rose-500",
    BLOQUEADO:  "bg-slate-500",
};

export default function HotspotPin({ unidad, onClick }: HotspotPinProps) {
    const coords = unidad.coordenadasTour;
    if (!coords) return null;

    return (
        <div
            style={{
                position: "absolute",
                left: `${coords.x}%`,
                top: `${coords.y}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "auto",
                cursor: "pointer",
                zIndex: 10,
            }}
            onClick={() => onClick(unidad)}
            title={`Lote #${unidad.numero}`}
        >
            <div className={`${ESTADO_BG[unidad.estado] || "bg-yellow-400"} text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap`}>
                #{unidad.numero}
            </div>
            <div className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 mx-auto`} style={{ borderTopColor: "inherit" }} />
        </div>
    );
}
