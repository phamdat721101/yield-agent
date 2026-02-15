export interface AgentTool {
    /** Unique name of the tool/skill (e.g., 'news-analytics') */
    name: string;
    /** Description for LLM or user to understand purpose */
    description: string;
    /** Execute the tool logic */
    execute(input: any, context?: any): Promise<any>;
}
