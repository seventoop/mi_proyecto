import { getFlowById, getNodeDefinitions } from "@/lib/actions/logictoop";
import { LogicToopCanvas } from "../../canvas-components/CanvasClient";
import { migrateToCanvas } from "@/lib/logictoop/canvas";

interface CanvasPageProps {
    params: Promise<{
        id: string;
    }>
}

export default async function LogicToopCanvasPage({ params }: CanvasPageProps) {
    const { id } = await params;
    const [flowResult, nodesResult] = await Promise.all([
        getFlowById(id),
        getNodeDefinitions()
    ]);

    if (!flowResult.success || !flowResult.data) {
        return <div className="p-8 text-center uppercase font-black italic">Flow no encontrado</div>;
    }

    const flow = flowResult.data;
    const nodeDefinitions = nodesResult.success ? nodesResult.data : [];
    
    // Check if flow already has a canvas-like config or migrate
    let initialNodes: any[] = [];
    let initialEdges: any[] = [];

    // Simple heuristic: if actions have 'position', they might come from a canvas
    const hasCanvasData = Array.isArray(flow.actions) && flow.actions.some((a: any) => a.position);

    if (hasCanvasData) {
        // Build nodes and edges from existing pointers
        initialNodes.push({
            id: "trigger",
            type: "triggerNode",
            data: { label: "Trigger Activo" },
            position: { x: 250, y: 0 }
        });

        // Add nodes
        (flow.actions as any[]).forEach(action => {
            initialNodes.push({
                id: action.uid,
                type: action.type === "CONDITION" ? "conditionNode" : "actionNode",
                data: { ...action },
                position: action.position || { x: 250, y: 250 }
            });
            
            // Rebuild edges
            if (action.next) {
                initialEdges.push({ id: `e-${action.uid}-${action.next}`, source: action.uid, target: action.next });
            }
            if (action.nextTrue) {
                initialEdges.push({ id: `e-${action.uid}-true`, source: action.uid, target: action.nextTrue, sourceHandle: "true" });
            }
            if (action.nextFalse) {
                initialEdges.push({ id: `e-${action.uid}-false`, source: action.uid, target: action.nextFalse, sourceHandle: "false" });
            }
        });

        // Corner case: link trigger to first action if linear migration happened but no edge exists
        if (initialEdges.length === 0 && flow.actions.length > 0) {
            initialEdges.push({ id: "e-trigger-start", source: "trigger", target: flow.actions[0].uid });
        }
    } else {
        // Migrate from linear Phase 4 builder
        const migrated = migrateToCanvas(flow.actions || []);
        initialNodes = migrated.nodes;
        initialEdges = migrated.edges;
    }

    return (
        <div className="space-y-6 pb-12 px-4 md:px-0">
            <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                    Lienzo <span className="text-brand-500">Visual</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                    Visualizando flujo para {flow.org.nombre}
                </p>
            </div>

            <LogicToopCanvas 
                flow={flow} 
                initialNodes={initialNodes} 
                initialEdges={initialEdges} 
                nodeDefinitions={nodeDefinitions}
            />
        </div>
    );
}
