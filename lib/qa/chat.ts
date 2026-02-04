import { classifyQuestion, QuestionType } from "./router";
import { answerFactualQuestion, FactualAnswer } from "./factual-qa";
import { answerFinancialQuestion, FinancialAnswer } from "./financial-qa";

export interface ChatResponse {
  questionType: QuestionType;
  answer: string;
  citations: Array<{
    documentName: string;
    page: number;
    tableId?: string;
    chunkId?: number;
  }>;
  evidence:
    | {
        type: "factual";
        quotedEvidence: string;
      }
    | {
        type: "financial";
        values: FinancialAnswer["values"];
      };
  confidence: "high" | "medium" | "low" | "not_found";
}

/**
 * Main chat function: routes question and returns unified response
 */
export async function chat(
  question: string,
  documentIds?: number[]
): Promise<ChatResponse> {
  try {
    // 1. Classify question
    const questionType = await classifyQuestion(question);

    console.log(`[Chat] Question classified as: ${questionType}`);

    // 2. Route to appropriate pipeline
    if (questionType === "factual") {
      const factualAnswer = await answerFactualQuestion(question, documentIds);

      return {
        questionType: "factual",
        answer: factualAnswer.answer,
        citations: factualAnswer.citations,
        evidence: {
          type: "factual",
          quotedEvidence: factualAnswer.quotedEvidence,
        },
        confidence: factualAnswer.confidence,
      };
    } else {
      // financial
      const financialAnswer = await answerFinancialQuestion(question, documentIds);

      return {
        questionType: "financial",
        answer: financialAnswer.answer,
        citations: financialAnswer.citations.map((c) => ({
          documentName: c.documentName,
          page: c.page,
          tableId: c.tableId,
        })),
        evidence: {
          type: "financial",
          values: financialAnswer.values,
        },
        confidence: financialAnswer.confidence,
      };
    }
  } catch (error) {
    console.error("[Chat] Error:", error);

    return {
      questionType: "factual",
      answer: "An error occurred while processing your question. Please try again.",
      citations: [],
      evidence: {
        type: "factual",
        quotedEvidence: "",
      },
      confidence: "not_found",
    };
  }
}
