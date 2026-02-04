import OpenAI from "openai";

// Lazy-initialize OpenRouter client to allow module loading even without API key
let openrouterInstance: OpenAI | null = null;

function getOpenRouter(): OpenAI {
  if (!openrouterInstance) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured. Please add it to your .env.local file. " +
        "Get your API key from https://openrouter.ai"
      );
    }

    openrouterInstance = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Vertis Document Chat",
      },
    });
  }
  return openrouterInstance;
}

export const openrouter = getOpenRouter;

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-ada-002";

  try {
    const client = getOpenRouter();
    const response = await client.embeddings.create({
      model,
      input: text.slice(0, 8000), // Limit to 8000 chars to avoid token limits
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Generate chat completion
export async function generateChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
) {
  const model = process.env.OPENROUTER_LLM_MODEL || "anthropic/claude-3.5-sonnet";

  try {
    const client = getOpenRouter();
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.1, // Low temperature for factual accuracy
      max_tokens: options.maxTokens ?? 2000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating chat completion:", error);
    throw error;
  }
}
