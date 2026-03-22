export default function LoadingProjectDetail() {
    return (
        <div className="min-h-screen bg-[#050816] text-white">
            <div className="relative min-h-[72vh] overflow-hidden border-b border-white/6">
                <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
                <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 md:px-6">
                    <div className="h-9 w-40 rounded-full bg-white/10" />
                    <div className="mt-8 h-24 max-w-3xl rounded-[32px] bg-white/10 md:h-32" />
                    <div className="mt-6 h-8 w-96 max-w-full rounded-full bg-white/10" />
                    <div className="mt-10 flex gap-4">
                        <div className="h-14 w-56 rounded-full bg-white/10" />
                        <div className="h-14 w-56 rounded-full bg-white/10" />
                    </div>
                    <div className="mt-14 grid gap-4 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-40 rounded-[28px] bg-white/10" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl space-y-24 px-4 py-20 md:px-6">
                {Array.from({ length: 4 }).map((_, sectionIndex) => (
                    <div key={sectionIndex}>
                        <div className="h-5 w-36 rounded-full bg-white/10" />
                        <div className="mt-5 h-14 max-w-2xl rounded-[24px] bg-white/10" />
                        <div className="mt-4 h-6 max-w-3xl rounded-full bg-white/10" />
                        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, cardIndex) => (
                                <div key={cardIndex} className="h-64 rounded-[30px] bg-white/10" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
