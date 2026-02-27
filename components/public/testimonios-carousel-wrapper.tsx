"use client";

import dynamic from "next/dynamic";

const TestimoniosCarousel = dynamic(() => import("./testimonios-carousel"), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100/50 dark:bg-white/5 animate-pulse rounded-3xl" />,
});

export default function TestimoniosCarouselWrapper() {
    return <TestimoniosCarousel />;
}
