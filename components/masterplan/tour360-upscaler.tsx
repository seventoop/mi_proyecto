"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
    originalUrl: string;
    isUpscaled: boolean;
    onUpscaledUrl: (url: string | null) => void; // null = volver al original
    scale?: 2 | 4;
};

const cache = new Map<string, string>(); // originalUrl -> blobUrl upscaled

export default function Tour360Upscaler({
    originalUrl,
    isUpscaled,
    onUpscaledUrl,
    scale = 2,
}: Props) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastBlobUrlRef = useRef<string | null>(null);

    async function enhance(selectedScale: number = 2) {
        if (busy) return;
        setBusy(true);
        setError(null);

        try {
            const cacheKey = `${originalUrl}-${selectedScale}`;
            const cached = cache.get(cacheKey);
            if (cached) {
                onUpscaledUrl(cached);
                setBusy(false);
                return;
            }

            const response = await fetch("/api/upscale", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: originalUrl, scale: selectedScale }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al mejorar la imagen");
            }

            const data = await response.json();
            const resultUrl = data.resultUrl; // results in base64 from API

            cache.set(cacheKey, resultUrl);
            onUpscaledUrl(resultUrl);
            setBusy(false);

        } catch (e: any) {
            setError(e?.message ?? "Error al mejorar la imagen");
            setBusy(false);
        }
    }

    function revert() {
        setError(null);
        onUpscaledUrl(null);
    }

    return (
        <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2 bg-black/40 text-white px-3 py-2 rounded-xl backdrop-blur-md border border-white/10">

            {!isUpscaled ? (
                <>
                    <button
                        onClick={() => enhance(2)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs font-medium"
                    >
                        {busy ? "Procesando..." : "8K AI (2x)"}
                    </button>
                    <button
                        onClick={() => enhance(4)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-xs font-bold shadow-lg"
                        title="Experimental: Puede requerir mucha memoria"
                    >
                        {busy ? "Procesando..." : "12K AI (Max)"}
                    </button>
                </>
            ) : (
                <button
                    onClick={revert}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50 text-xs"
                >
                    Restaurar Original
                </button>
            )}

            {error ? <span className="text-xs text-red-200 max-w-[200px] leading-tight ml-2">{error}</span> : null}
        </div>
    );
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // si el server lo permite
        img.onload = () => resolve(img);
        img.onerror = () =>
            reject(
                new Error(
                    "No se pudo cargar la imagen para upscaling (posible CORS o URL inválida). Si es externa, servila desde tu dominio."
                )
            );
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo exportar el canvas"))), type, quality);
    });
}
