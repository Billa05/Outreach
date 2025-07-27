import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai("gpt-4o"),
    messages,
    system: "You are a helpful AI assistant. Provide clear, concise, and helpful responses.",
  })

  return result.toDataStreamResponse()
}
