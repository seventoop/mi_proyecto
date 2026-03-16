import { AgentMessage } from "./types";

/**
 * Short-term memory for a single agent execution.
 */
export class AgentMemory {
    private messages: AgentMessage[] = [];

    constructor(initialMessages: AgentMessage[] = []) {
        this.messages = initialMessages;
    }

    add(message: AgentMessage) {
        this.messages.push(message);
    }

    getHistory(): AgentMessage[] {
        return this.messages;
    }

    // Utility to get a simplified view for logs
    getSummary() {
        return this.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content.length > 100 ? m.content.substring(0, 100) + "..." : m.content
        }));
    }
}
