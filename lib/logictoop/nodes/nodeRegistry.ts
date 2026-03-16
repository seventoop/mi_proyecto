import { NodeDefinition } from "./types";

/**
 * LogicToop V1 Central Node Registry
 */
class NodeRegistry {
    private nodes: Map<string, NodeDefinition> = new Map();

    /**
     * Registers a new node type.
     */
    register(definition: NodeDefinition) {
        if (this.nodes.has(definition.type)) {
            console.warn(`[LogicToop] Overwriting node type: ${definition.type}`);
        }
        this.nodes.set(definition.type, definition);
    }

    /**
     * Retrieves a node definition by type.
     */
    get(type: string): NodeDefinition | undefined {
        return this.nodes.get(type);
    }

    /**
     * Lists all registered nodes.
     */
    list(): NodeDefinition[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Lists nodes by category.
     */
    listByCategory(): Record<string, NodeDefinition[]> {
        const groups: Record<string, NodeDefinition[]> = {};
        this.list().forEach(node => {
            if (!groups[node.category]) groups[node.category] = [];
            groups[node.category].push(node);
        });
        return groups;
    }
}

export const nodeRegistry = new NodeRegistry();
