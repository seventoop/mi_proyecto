"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Clock, Brain, Layout, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { installTemplate } from "@/lib/actions/logictoop-templates";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
    template: any;
    orgId: string;
}

export function TemplateCard({ template, orgId }: TemplateCardProps) {
    const [installing, setInstalling] = useState(false);
    const router = useRouter();

    const handleInstall = async () => {
        setInstalling(true);
        try {
            const res = await installTemplate(template.id, orgId);
            if (res.success) {
                toast.success("¡Plantilla instalada con éxito!");
                router.push(`/dashboard/admin/logictoop/flows/${res.flowId}`);
            } else {
                toast.error(`Error: ${'error' in res ? res.error : 'Error desconocido'}`);
            }
        } catch (e) {
            toast.error("Error al instalar la plantilla.");
        } finally {
            setInstalling(false);
        }
    };

    return (
        <Card className="hover:shadow-md transition-all border-slate-200">
            <CardHeader>
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-brand-50 text-brand-700 hover:bg-brand-100 border-none px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                        {template.category}
                    </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-slate-800">{template.nombre}</CardTitle>
                <CardDescription className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                    {template.descripcion}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <Rocket className="w-3 h-3 text-brand-500" />
                        <span>Trigger: {template.triggerType}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <Layout className="w-3 h-3 text-indigo-500" />
                        <span>{Array.isArray(template.flowConfig) ? template.flowConfig.length : 0} pasos</span>
                    </div>
                    {template.flowConfig.some((a: any) => a.type.startsWith('AI')) && (
                        <div className="flex items-center gap-1 bg-brand-50 px-2 py-1 rounded border border-brand-100 text-brand-700">
                            <Brain className="w-3 h-3" />
                            <span>IA Powered</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="pt-2">
                <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold gap-2 hover:bg-brand-600 hover:text-white transition-all border-brand-200"
                    onClick={handleInstall}
                    disabled={installing}
                >
                    {installing ? (
                        "Instalando..."
                    ) : (
                        <>
                            <Plus className="w-3 h-3" />
                            Instalar Workflow
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

function Plus({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
    )
}
