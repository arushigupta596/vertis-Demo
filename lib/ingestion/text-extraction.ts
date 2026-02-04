import { PythonShell } from "python-shell";
import path from "path";

export interface TextChunk {
  page: number;
  chunkIndex: number;
  text: string;
  startChar?: number;
  endChar?: number;
}

export interface PageText {
  page: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract text from PDF file using pdfplumber (via Python)
 */
export async function extractTextFromPDF(pdfPath: string): Promise<{
  text: string;
  pageCount: number;
  pages: PageText[];
}> {
  const scriptPath = path.join(process.cwd(), "scripts", "extract_text.py");

  const results = await PythonShell.run(scriptPath, {
    args: [pdfPath],
    mode: "json",
  });

  const data = results[0] as {
    text: string;
    page_count: number;
    pages: Array<{ page: number; text: string }>;
  };

  // Convert Python output to PageText format
  const pages: PageText[] = [];
  let currentIndex = 0;

  for (const page of data.pages) {
    const pageText = page.text.trim();
    pages.push({
      page: page.page,
      text: pageText,
      startIndex: currentIndex,
      endIndex: currentIndex + pageText.length,
    });
    currentIndex += pageText.length;
  }

  return {
    text: data.text,
    pageCount: data.page_count,
    pages,
  };
}

/**
 * Chunk text into smaller pieces for embedding
 * Strategy: Create overlapping chunks to preserve context
 */
export function chunkText(
  pages: PageText[],
  options: {
    chunkSize?: number;
    overlap?: number;
  } = {}
): TextChunk[] {
  const chunkSize = options.chunkSize || 500; // characters
  const overlap = options.overlap || 100; // characters

  const chunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text;
    let startPos = 0;

    while (startPos < pageText.length) {
      const endPos = Math.min(startPos + chunkSize, pageText.length);
      const chunkText = pageText.slice(startPos, endPos).trim();

      if (chunkText.length > 50) {
        // Only keep meaningful chunks
        chunks.push({
          page: page.page,
          chunkIndex: globalChunkIndex++,
          text: chunkText,
          startChar: page.startIndex + startPos,
          endChar: page.startIndex + endPos,
        });
      }

      // Move start position with overlap
      startPos += chunkSize - overlap;

      // Break if we're at the end
      if (endPos >= pageText.length) break;
    }
  }

  return chunks;
}

/**
 * Extract verbatim text span from pages (for factual Q&A)
 */
export function findVerbatimSpan(
  pages: PageText[],
  searchText: string
): { page: number; text: string; context: string } | null {
  const normalizedSearch = searchText.toLowerCase().trim();

  for (const page of pages) {
    const normalizedPageText = page.text.toLowerCase();
    const index = normalizedPageText.indexOf(normalizedSearch);

    if (index !== -1) {
      // Extract with surrounding context (±100 chars)
      const contextStart = Math.max(0, index - 100);
      const contextEnd = Math.min(page.text.length, index + searchText.length + 100);
      const context = page.text.slice(contextStart, contextEnd);

      return {
        page: page.page,
        text: page.text.slice(index, index + searchText.length),
        context,
      };
    }
  }

  return null;
}
