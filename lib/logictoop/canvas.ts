/**
 * LogicToop V1 Canvas Utilities
 * Handles graph serialization, node-to-action conversion, and validation.
 */

export interface CanvasNode {
    id: string;
    type: string;
    data: any;
    position: { x: number; y: number };
}

export interface CanvasEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
}

export interface CanvasConfig {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

/**
 * Converts a LogicToop Action list (linear) to a basic Canvas config (if possible)
 */
export function migrateToCanvas(actions: any[]): CanvasConfig {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    // Add a Trigger dummy node at start
    nodes.push({
        id: "trigger",
        type: "triggerNode",
        data: { label: "Trigger" },
        position: { x: 250, y: 0 }
    });

    let lastId = "trigger";
    actions.forEach((action, index) => {
        const id = action.uid || `node-${index}`;
        nodes.push({
            id,
            type: action.type === "CONDITION" ? "conditionNode" : "actionNode",
            data: { ...action },
            position: { x: 250, y: (index + 1) * 150 }
        });
        edges.push({ id: `e-${lastId}-${id}`, source: lastId, target: id });
        lastId = id;
    });

    return { nodes, edges };
}

/**
 * Validates the graph structure.
 * - Exactly one trigger
 * - No cycles
 * - Condition branches are valid
 */
export function validateGraph(nodes: CanvasNode[], edges: CanvasEdge[]): { valid: boolean; error?: string } {
    const triggerNodes = nodes.filter(n => n.type === "triggerNode");
    if (triggerNodes.length !== 1) return { valid: false, error: "Debe haber exactamente un nodo de Trigger" };

    // Check for cycles (very basic)
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(nodeId: string): boolean {
        if (stack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        stack.add(nodeId);

        const neighbors = edges.filter(e => e.source === nodeId).map(e => e.target);
        for (const neighbor of neighbors) {
            if (hasCycle(neighbor)) return true;
        }

        stack.delete(nodeId);
        return false;
    }

    if (hasCycle(triggerNodes[0].id)) {
        return { valid: false, error: "El flujo detectó un ciclo infinito (Loop)" };
    }

    // Check branching
    const conditionNodes = nodes.filter(n => n.type === "conditionNode");
    for (const node of conditionNodes) {
        const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === "true");
        const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === "false");
        
        // Temporarily allowing incomplete branches but recommending them
        if (!trueEdge && !falseEdge) {
            return { valid: false, error: `La condición ${node.data.label || node.id} no tiene ramas de salida` };
        }
    }

    return { valid: true };
}

/**
 * Serializes Canvas back to Action/Step config for the engine.
 * The engine expects a list of steps, but now with 'next' pointers for branching.
 */
export function serializeCanvas(nodes: CanvasNode[], edges: CanvasEdge[]) {
    return nodes.filter(n => n.type !== "triggerNode").map(node => {
        const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === "true");
        const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === "false");
        const defaultEdge = edges.find(e => e.source === node.id && !e.sourceHandle);

        return {
            uid: node.id,
            type: node.data.type || (node.type === "conditionNode" ? "CONDITION" : "ACTION"),
            label: node.data.label,
            config: node.data.config,
            position: node.position,
            next: defaultEdge?.target || null,
            nextTrue: trueEdge?.target || null,
            nextFalse: falseEdge?.target || null
        };
    });
}
