import { generateChatCompletion } from "../openrouter";

export type QuestionType = "factual" | "financial";

/**
 * Classify question as factual or financial
 * Uses LLM with strict guidelines
 */
export async function classifyQuestion(question: string): Promise<QuestionType> {
  const prompt = `You are a question classifier for a financial document Q&A system.

Classify the user's question as either "factual" or "financial".

FACTUAL questions ask about:
- Who/what/when/where information
- Record dates, appointment details
- Names of people, companies, auditors
- Board outcomes, resolutions, meeting details
- Regulatory wording, compliance statements
- Textual information from documents

FINANCIAL questions ask about:
- Numbers, amounts, values
- Ratios (debt service coverage, ICR, etc.)
- Distributions per unit (DPU)
- Revenue, expenses, profit/loss figures
- Quarter ended or year-to-date comparisons
- Financial metrics from tables
- Percentages, times (multipliers)

User question: "${question}"

Respond with ONLY one word: either "factual" or "financial".

If ambiguous, default to "financial" to ensure numeric questions are handled correctly.`;

  try {
    const response = await generateChatCompletion(
      [
        {
          role: "system",
          content: "You are a precise question classifier. Respond with only 'factual' or 'financial'.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0, maxTokens: 10 }
    );

    const classification = response.trim().toLowerCase();

    if (classification.includes("financial")) {
      return "financial";
    } else if (classification.includes("factual")) {
      return "factual";
    } else {
      // Default to financial if unclear
      return "financial";
    }
  } catch (error) {
    console.error("Error classifying question:", error);
    // Default to financial on error (safer)
    return "financial";
  }
}
