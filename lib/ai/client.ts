import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq from "groq-sdk"
import {
  SystemaGraphSchema,
  validateGraphAdditions,
  type SystemaGraph,
} from "@/lib/ai/schema"

const geminiModel = "gemini-3.8-flash"
const groqModel = "openai/gpt-oss-120b"

function getApiKey(name: "GEMINI_API_KEY" | "GROQ_API_KEY"): string {
  const apiKey = process.env[name]
  if (!apiKey) {
    throw new Error(`${name} must be configured in the Trigger.dev environment`)
  }
  return apiKey
}

function parseGraphResponse(responseText: string): SystemaGraph {
  const rawGraph: unknown = JSON.parse(responseText)
  return SystemaGraphSchema.parse(rawGraph)
}

export async function generateWithGemini(systemPrompt: string): Promise<SystemaGraph> {
  const client = new GoogleGenerativeAI(getApiKey("GEMINI_API_KEY"))
  const model = client.getGenerativeModel({
    model: geminiModel,
    generationConfig: { responseMimeType: "application/json" },
  })
  const result = await model.generateContent(systemPrompt)
  return parseGraphResponse(result.response.text())
}

export async function generateWithGroq(systemPrompt: string): Promise<SystemaGraph> {
  const client = new Groq({ apiKey: getApiKey("GROQ_API_KEY") })
  const completion = await client.chat.completions.create({
    model: groqModel,
    messages: [{ role: "system", content: systemPrompt }],
    response_format: { type: "json_object" },
  })
  const content = completion.choices[0]?.message.content
  if (!content) {
    throw new Error("Groq returned an empty graph response")
  }
  return parseGraphResponse(content)
}

export async function generateGraph(
  systemPrompt: string,
  currentGraph?: SystemaGraph,
): Promise<SystemaGraph> {
  try {
    return validateGraphAdditions(await generateWithGemini(systemPrompt), currentGraph)
  } catch (geminiError) {
    try {
      return validateGraphAdditions(await generateWithGroq(systemPrompt), currentGraph)
    } catch (groqError) {
      throw new AggregateError(
        [geminiError, groqError],
        "Graph generation failed with Gemini and its Groq fallback",
      )
    }
  }
}
