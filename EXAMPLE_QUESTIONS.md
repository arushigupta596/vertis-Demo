# Example Questions for Vertis Document Chat

## 📊 Two Types of Questions Supported

### 1️⃣ **Factual Questions** (Answered from Document Text Chunks)
These questions retrieve verbatim citations from the document text using vector similarity search on text chunks.

**Example Questions:**
- "Who is the auditor?"
- "What is the company's registered office address?"
- "What were the key decisions in the board meeting?"
- "What is the company's business model?"
- "Who are the directors?"
- "What are the risk factors mentioned?"

**How it works:**
- Query is embedded using OpenAI embeddings
- Searches text_chunks table using pgvector similarity
- Returns top-k most relevant text chunks
- LLM synthesizes answer with verbatim citations
- Evidence panel shows exact text snippets with page numbers

---

### 2️⃣ **Financial Questions** (Answered from Table Data)
These questions retrieve numeric data from extracted tables with full provenance tracking.

**Example Questions:**
- "What are the financial ratios?"
- "What is the total distribution amount?"
- "What is the NDCF for the current period?"
- "Show me the debt-equity ratio"
- "What are the current assets?"
- "What is the profit and loss statement?"

**How it works:**
- Query is embedded using OpenAI embeddings
- Searches table_rows table using pgvector similarity
- Returns matching table rows with context lines
- LLM extracts numeric values from table structure
- Evidence panel shows full table with highlighted relevant rows

---

## 🎯 Current Documents Available

### Document 1: Financial Statements (275 pages)
- **File**: `1.-Financial-Statements.pdf`
- **Category**: Financial Results
- **Date**: January 1, 2025
- **Tags**: Financial, Statements, Q4 2024
- **Tables Extracted**: 1 table
- **Text Chunks**: ~5,500 chunks

**Good questions for this document:**
- "Who is the statutory auditor?"
- "What are the key accounting policies?"
- "What is the revenue for the year?"
- "Show me the balance sheet"
- "What are the contingent liabilities?"

### Document 6: Board Outcome - July 2024 (102 pages)
- **File**: `709bed4f-f1c7-4920-83fc-e9b8cba4492b.pdf`
- **Category**: Board Outcome
- **Date**: July 1, 2024
- **Tags**: Board, Meeting, July 2024
- **Tables Extracted**: 9 tables
- **Text Chunks**: ~2,040 chunks

**Good questions for this document:**
- "What was discussed in the board meeting?"
- "What are the distribution details?" (has DISTRIBUTION table)
- "What are the financial ratios?" (has RATIOS table)
- "What decisions were made regarding dividends?"
- "Who attended the board meeting?"

---

## 🧪 Testing the Dual-Pipeline Q&A

### Scenario 1: Factual Question
**Question**: "Who is the auditor?"

**Expected behavior:**
- ✅ Classifies as `questionType: "factual"`
- ✅ Searches text_chunks table
- ✅ Returns answer like: "The statutory auditor is [name from document]"
- ✅ Shows text snippets in evidence panel with page numbers
- ✅ Includes verbatim citations

### Scenario 2: Financial Question
**Question**: "What are the financial ratios?"

**Expected behavior:**
- ✅ Classifies as `questionType: "financial"`
- ✅ Searches table_rows table
- ✅ Finds rows from RATIOS table (doc6_p52_t3)
- ✅ Returns numeric values with provenance
- ✅ Shows full table in evidence panel
- ✅ Highlights relevant rows

---

## 📱 UI Features Added

### Welcome Screen (Empty Chat State)
When no messages exist, users see:

1. **Welcome message** with app description
2. **Two columns of example questions**:
   - **Left column**: Factual Questions (blue indicator)
   - **Right column**: Financial Questions (green indicator)
3. **Click-to-populate**: Clicking any question fills the input field
4. **Visual distinction**: Color-coded dots (blue for factual, green for financial)

### Example Question Cards
- Clickable buttons with hover effect
- Border changes to primary color on hover
- Populates input field when clicked
- User can edit before sending

---

## 🚀 How to Use

1. **Open the app**: http://localhost:3000
2. **See example questions** on the welcome screen
3. **Click any question** to populate the input field
4. **Press Enter or click Send** to submit
5. **View results**:
   - Answer appears in chat
   - Evidence panel shows sources (text chunks or tables)
   - Question type and confidence score displayed

---

## 🎨 Visual Design

### Factual Questions (Left Column)
```
🔵 Factual Questions (from text)
┌─────────────────────────────────────┐
│ Who is the auditor?                 │
├─────────────────────────────────────┤
│ What is the company's registered    │
│ office address?                     │
├─────────────────────────────────────┤
│ What were the key decisions in      │
│ the board meeting?                  │
└─────────────────────────────────────┘
```

### Financial Questions (Right Column)
```
🟢 Financial Questions (from tables)
┌─────────────────────────────────────┐
│ What are the financial ratios?      │
├─────────────────────────────────────┤
│ What is the total distribution      │
│ amount?                             │
├─────────────────────────────────────┤
│ What is the NDCF for the current    │
│ period?                             │
└─────────────────────────────────────┘
```

---

## 🔍 Technical Implementation

### Component: `components/chat-area.tsx`

**New function added:**
```typescript
const handleExampleQuestion = (question: string) => {
  setInput(question);
};
```

**UI Structure:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Factual Questions */}
  <div>
    <h3>Factual Questions (from text)</h3>
    <button onClick={() => handleExampleQuestion("...")}>
      Question text
    </button>
  </div>

  {/* Financial Questions */}
  <div>
    <h3>Financial Questions (from tables)</h3>
    <button onClick={() => handleExampleQuestion("...")}>
      Question text
    </button>
  </div>
</div>
```

---

## 📝 Notes

- Example questions are only shown when `messages.length === 0`
- After first message, the welcome screen is replaced by chat history
- Questions are specifically chosen to test both pipelines
- Financial questions target known table types (DISTRIBUTION, RATIOS, NDCF)
- Factual questions test different aspects of document comprehension

---

## ✅ Current Status

✅ Example questions UI added to chat interface
✅ Click-to-populate functionality working
✅ Visual distinction between question types
✅ Responsive design (stacks on mobile)
✅ Server compiled successfully
✅ Ready to test at http://localhost:3000
