import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

export interface Testimonial {
    name: string;
    role: string;
    image: string;
    quote: string;
    property: string;
    returns: string;
}

interface TestimonialCardProps {
    testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
    const { dictionary: t } = useLanguage();

    return (
        <div className="bg-card dark:bg-card/50 backdrop-blur-md border border-border shadow-soft rounded-[1.5rem] p-6 lg:p-7 flex flex-col h-full min-h-[300px] w-full relative group transition-all duration-300">
            {/* Quote Icon Background */}
            <Quote className="absolute top-4 right-4 w-10 h-10 text-brand-orange/10 rotate-180 pointer-events-none" />

            <div className="flex items-center gap-3 mb-4 relative z-10">
                {testimonial.image ? (
                    <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand-orange shadow-sm"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center text-lg font-black text-white shadow-sm shrink-0">
                        {testimonial.name.charAt(0)}
                    </div>
                )}
                <div>
                    <h4 className="font-bold text-base text-foreground leading-tight">{testimonial.name}</h4>
                    <p className="text-[11px] font-bold text-brand-orange uppercase tracking-wider mt-0.5">{testimonial.role}</p>
                </div>
            </div>

            <div className="flex-1 relative z-10 flex flex-col justify-center mb-5">
                <p className="text-foreground/90 font-medium text-[15px] leading-relaxed italic">
                    "{testimonial.quote}"
                </p>
            </div>

            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{t.testimonials.card.property}</span>
                    <span className="text-sm font-bold text-foreground">{testimonial.property}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{t.testimonials.card.returns}</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {testimonial.returns}
                    </span>
                </div>
            </div>
        </div>
    );
}
