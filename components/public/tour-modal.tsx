"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import TourViewer, { Scene } from "@/components/tour360/tour-viewer";
import { View } from "lucide-react";
import { isTour360Category } from "@/lib/tour-media";

interface TourModalProps {
    tours: {
        id: string;
        nombre: string;
        scenes: any[];
    }[];
}

export default function TourModal({ tours }: TourModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTour, setSelectedTour] = useState(tours[0]);

    if (!tours || tours.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="px-8 py-3.5 rounded-xl border border-white/20 text-white font-bold text-lg hover:bg-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2">
                    <View className="w-5 h-5" />
                    Ver Tour 360
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-full h-[80vh] bg-black border-white/10 p-0 overflow-hidden">
                <div className="relative w-full h-full flex flex-col">
                    {tours.length > 1 && (
                        <div className="absolute top-4 left-4 z-20 flex gap-2">
                            {tours.map(tour => (
                                <button
                                    key={tour.id}
                                    onClick={() => setSelectedTour(tour)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${selectedTour.id === tour.id
                                        ? "bg-brand-500/80 border-brand-400 text-white"
                                        : "bg-black/50 border-white/10 text-slate-300 hover:bg-black/70"
                                        }`}
                                >
                                    {tour.nombre}
                                </button>
                            ))}
                        </div>
                    )}

                    {isOpen && (
                        <TourViewer
                            scenes={(selectedTour.scenes as Scene[]).filter((scene) => isTour360Category(scene))}
                            className="w-full h-full rounded-none"
                            autoRotate={true}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
