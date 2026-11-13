import type { SystemaGraph } from "@/lib/ai/schema"

export function buildSpecPrompt(graph: SystemaGraph, comments: string[]): string {
  return `You are a senior software architect. Generate a comprehensive technical specification in Markdown format based on the following system design graph and team comments.

System Graph:
${JSON.stringify(graph, null, 2)}

Team Comments:
${comments.length > 0 ? `- ${comments.join("\n- ")}` : "No comments provided."}

Requirements for the Markdown output:
1. Include a high-level overview.
2. Detail the components (nodes) and their responsibilities.
3. Explain the data flow and connections (edges).
4. Incorporate any relevant insights from the team comments.
5. Output valid Markdown only. Do not wrap the entire output in a code block.`
}
