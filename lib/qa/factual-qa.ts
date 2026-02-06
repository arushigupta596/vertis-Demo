import { supabaseAdmin } from "../supabase";
import { generateEmbedding, generateChatCompletion } from "../openrouter";
import type { SupabaseClient } from "@supabase/supabase-js";

type TextChunk = {
  id: number;
  document_id: number;
  page: number;
  chunk_index: number;
  text: string;
  embedding: string | null;
};

export interface FactualAnswer {
  answer: string;
  quotedEvidence: string;
  citations: Array<{
    documentName: string;
    page: number;
    chunkId: number;
  }>;
  confidence: "high" | "medium" | "low" | "not_found";
}

/**
 * Answer a factual question using vector similarity search over text chunks
 */
export async function answerFactualQuestion(
  question: string,
  documentIds?: number[]
): Promise<FactualAnswer> {
  try {
    const client = supabaseAdmin as unknown as SupabaseClient<any>;

    // 1. Generate embedding for question
    const questionEmbedding = await generateEmbedding(question);

    // 2. Build RPC call for vector similarity search
    const embeddingString = `[${questionEmbedding.join(",")}]`;

    // Use Supabase RPC to call a custom function for vector search
    // First, let's use a direct query approach
    let query = client
      .from("text_chunks")
      .select(`
        id,
        document_id,
        page,
        chunk_index,
        text,
        embedding
      `)
      .limit(100); // Get more initially, we'll filter by similarity

    if (documentIds && documentIds.length > 0) {
      query = query.in("document_id", documentIds);
    }

    const { data: chunks, error: chunksError } = await query;
    const typedChunks = chunks as TextChunk[] | null;

    if (chunksError) {
      throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
    }

    if (!typedChunks || typedChunks.length === 0) {
      return {
        answer: "Not available in the provided documents.",
        quotedEvidence: "",
        citations: [],
        confidence: "not_found",
      };
    }

    // Calculate cosine similarity in JavaScript (since we can't use SQL with Supabase client)
    const chunksWithSimilarity = typedChunks
      .map((chunk) => {
        const chunkEmbedding = chunk.embedding ? JSON.parse(chunk.embedding) : null;
        if (!chunkEmbedding) return null;

        // Cosine similarity = dot product / (magnitude1 * magnitude2)
        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < questionEmbedding.length; i++) {
          dotProduct += questionEmbedding[i] * chunkEmbedding[i];
          mag1 += questionEmbedding[i] * questionEmbedding[i];
          mag2 += chunkEmbedding[i] * chunkEmbedding[i];
        }

        const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));

        return {
          ...chunk,
          similarity,
        };
      })
      .filter((c) => c !== null)
      .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
      .slice(0, 5);

    if (chunksWithSimilarity.length === 0) {
      return {
        answer: "Not available in the provided documents.",
        quotedEvidence: "",
        citations: [],
        confidence: "not_found",
      };
    }

    // Get document names for citations
    const documentIdsToFetch = [...new Set(chunksWithSimilarity.map((c) => c.document_id))];
    const { data: documents } = await supabaseAdmin
      .from("documents")
      .select("id, display_name")
      .in("id", documentIdsToFetch);

    const documentMap = new Map(documents?.map((d) => [d.id, d.display_name]) || []);

    // 3. Prepare context for LLM
    const context = chunksWithSimilarity
      .map((chunk: any, idx: number) => {
        const docName = documentMap.get(chunk.document_id) || `Document ${chunk.document_id}`;
        return `[Source ${idx + 1}: ${docName}, Page ${chunk.page}]\n${chunk.text}`;
      })
      .join("\n\n---\n\n");

    // 4. Generate answer with strict verbatim requirement
    const systemPrompt = `You are a precise document Q&A assistant. Your task is to answer questions using ONLY information from the provided document excerpts.

CRITICAL RULES:
1. Extract and present the answer from the source text, staying faithful to the original meaning
2. If the information is present but not in exact answer form, synthesize from the available context
3. Only respond with "Not available in the provided documents." if the information is truly not present in any form
4. Provide a direct answer (1-2 sentences) followed by the quoted evidence
5. DO NOT mention "search results", "web search", "provided context", or "retrieval" in your answer - just answer the question directly
6. Format your response as:

Answer: [Your direct answer based on the source]

Quoted Evidence:
"[Relevant quote from the source that supports your answer]"

Citation: [Document name, Page X]

7. Be flexible in matching questions to content - if the question asks "Who is the auditor?" and the text says "Statutory Auditors, M/s. Walker Chandiok", extract "M/s. Walker Chandiok" as the answer.`;

    const userPrompt = `Question: ${question}

Source Documents:
${context}

Provide your answer following the format specified.`;

    const llmResponse = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, maxTokens: 1000 }
    );

    // 5. Parse LLM response
    const parsed = parseFactualResponse(llmResponse);

    if (parsed.answer.toLowerCase().includes("not available")) {
      return {
        answer: "Not available in the provided documents.",
        quotedEvidence: "",
        citations: [],
        confidence: "not_found",
      };
    }

    // 6. Extract citations from relevant chunks
    const citations = chunksWithSimilarity.slice(0, 3).map((chunk: any) => ({
      documentName: documentMap.get(chunk.document_id) || `Document ${chunk.document_id}`,
      page: chunk.page,
      chunkId: chunk.id,
    }));

    // 7. Determine confidence based on similarity scores
    const topSimilarity = chunksWithSimilarity[0]?.similarity || 0;
    const confidence: FactualAnswer["confidence"] =
      topSimilarity > 0.8 ? "high" : topSimilarity > 0.6 ? "medium" : "low";

    return {
      answer: parsed.answer,
      quotedEvidence: parsed.quotedEvidence,
      citations,
      confidence,
    };
  } catch (error) {
    console.error("Error in factual Q&A:", error);
    return {
      answer: "An error occurred while processing your question.",
      quotedEvidence: "",
      citations: [],
      confidence: "not_found",
    };
  }
}

/**
 * Parse LLM response to extract answer and quoted evidence
 */
function parseFactualResponse(response: string): {
  answer: string;
  quotedEvidence: string;
} {
  // Try to extract structured response (using [\s\S] instead of s flag for ES2017 compatibility)
  const answerMatch = response.match(/Answer:\s*([\s\S]+?)(?=Quoted Evidence:|Citation:|$)/);
  const quotedMatch = response.match(/Quoted Evidence:\s*"?([\s\S]+?)"?(?=Citation:|$)/);

  const answer = answerMatch ? answerMatch[1].trim() : response.split("\n")[0].trim();
  const quotedEvidence = quotedMatch ? quotedMatch[1].trim() : "";

  return { answer, quotedEvidence };
}
