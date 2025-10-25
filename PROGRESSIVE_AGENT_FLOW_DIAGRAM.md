# Progressive Agent Flow - Visual Architecture

## 🎯 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ "Remove Project Overview section"
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (ChatSidebar.tsx)                       │
├─────────────────────────────────────────────────────────────────────┤
│  1. User types message                                              │
│  2. Add user message to state                                       │
│  3. Call mcpService.chat(text, documentId, history)                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND (mcpTestRoutes.js)                         │
├─────────────────────────────────────────────────────────────────────┤
│  POST /api/mcp-test/generate                                        │
│  ├─ Model: gemini-2.0-flash-thinking-exp-01-21                     │
│  ├─ System Instruction: Progressive Workflow                        │
│  │  ├─ 📋 Planning Phase                                           │
│  │  ├─ 🤔 Reasoning Phase (repeatable)                            │
│  │  ├─ ⚙️💭✅ Execution Phase (repeatable)                        │
│  │  └─ ✨ Summary Phase                                            │
│  └─ Available Tools: 8 MCP tools                                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│              GEMINI AI (Thinking Variant)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Processing request with progressive thinking...                     │
│                                                                      │
│  📋 Planning: Locate and remove Project Overview                   │
│  🤔 Reasoning: Need to scan document first                         │
│  ⚙️ Executing: scan_document_content                              │
│  💭 Reason: Finding section position                               │
│  ✅ Result: Found at 450-890 (440 chars)                          │
│  🤔 Reasoning: Now removing the section                           │
│  ⚙️ Executing: remove_document_content                            │
│  💭 Reason: Removing as requested                                  │
│  ✅ Result: Successfully removed 440 chars                         │
│  ⚙️ Executing: verify_document_content                            │
│  💭 Reason: Confirming removal                                     │
│  ✅ Result: Verified - section gone                               │
│  ✨ Summary: Successfully removed (440 chars)                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│           RESPONSE PARSER (parseProgressiveResponse)                 │
├─────────────────────────────────────────────────────────────────────┤
│  Split by emoji markers: 📋|🤔|⚙️|💭|✅|✨                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Parse Result: Array<ChatMessage>                             │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ [0] type: 'progress', stage: 'planning', content: "..."     │  │
│  │ [1] type: 'progress', stage: 'reasoning', content: "..."    │  │
│  │ [2] type: 'tool-use', stage: 'execution', content: "..."    │  │
│  │ [3] type: 'progress', stage: 'execution', toolReason: "..." │  │
│  │ [4] type: 'tool-response', toolResult: "..."                │  │
│  │ [5] type: 'progress', stage: 'reasoning', content: "..."    │  │
│  │ [6] type: 'tool-use', stage: 'execution', content: "..."    │  │
│  │ [7] type: 'progress', stage: 'execution', toolReason: "..." │  │
│  │ [8] type: 'tool-response', toolResult: "..."                │  │
│  │ [9] type: 'tool-use', stage: 'execution', content: "..."    │  │
│  │ [10] type: 'progress', toolReason: "..."                    │  │
│  │ [11] type: 'tool-response', toolResult: "..."               │  │
│  │ [12] type: 'progress', stage: 'summary', content: "..."     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  MESSAGE RENDERING (ChatSidebar)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 📋 Planning: Locate and remove Project Overview           │    │
│  │    [Blue-Indigo gradient, Blue border]                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🤔 Reasoning: Need to scan document first                 │    │
│  │    [Amber-Yellow gradient, Amber border]                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ⚙️ Executing: scan_document_content                       │    │
│  │    [Purple-Violet gradient, Purple border]                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 💭 Reason: Finding section position                       │    │
│  │    [Indigo-Purple gradient, Indigo border]                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ Result: Found at 450-890 (440 chars)                   │    │
│  │    [Green-Emerald gradient, Green border]                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🤔 Reasoning: Now removing the section                    │    │
│  │    [Amber-Yellow gradient, Amber border]                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ⚙️ Executing: remove_document_content                     │    │
│  │    [Purple-Violet gradient, Purple border]                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 💭 Reason: Removing as requested                          │    │
│  │    [Indigo-Purple gradient, Indigo border]                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ Result: Successfully removed 440 chars                  │    │
│  │    [Green-Emerald gradient, Green border]                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ⚙️ Executing: verify_document_content                     │    │
│  │    [Purple-Violet gradient, Purple border]                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 💭 Reason: Confirming removal                             │    │
│  │    [Indigo-Purple gradient, Indigo border]                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ Result: Verified - section gone                        │    │
│  │    [Green-Emerald gradient, Green border]                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│  ┃ ✨ Summary: Successfully removed (440 chars)             ┃    │
│  ┃    [Emerald-Green gradient, Thick Emerald border]         ┃    │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
└─────────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Guide

| Phase | Emoji | Color Scheme | Purpose |
|-------|-------|--------------|---------|
| Planning | 📋 | Blue → Indigo | Shows what AI plans to do |
| Reasoning | 🤔 | Amber → Yellow | Shows AI's thinking process |
| Tool Execution | ⚙️ | Purple → Violet | Shows which tool is running |
| Tool Reason | 💭 | Indigo → Purple | Explains why tool is needed |
| Tool Result | ✅ | Green → Emerald | Shows what tool accomplished |
| Summary | ✨ | Emerald → Green (thick) | Final outcome, stays permanent |

## 📊 Data Flow Details

### 1. User Input → Backend
```typescript
// Frontend sends
{
  prompt: "Remove Project Overview section",
  documentId: "doc-123",
  chatHistory: [/* last 5 messages */]
}

// Backend receives and adds to
{
  model: "gemini-2.0-flash-thinking-exp-01-21",
  contents: [
    ...chatHistory,
    { role: "user", parts: [{ text: prompt }] }
  ],
  systemInstruction: { /* progressive workflow */ },
  enableMcpTools: true
}
```

### 2. AI Response → Parser
```typescript
// AI returns (as single string)
`📋 Planning: Locate and remove Project Overview
🤔 Reasoning: Need to scan document first
⚙️ Executing: scan_document_content
💭 Reason: Finding section position
✅ Result: Found at 450-890 (440 chars)
...
✨ Summary: Successfully removed (440 chars)`

// Parser splits into array
[
  { id: "progress-1", type: "progress", progressStage: "planning", content: "Locate and remove Project Overview" },
  { id: "progress-2", type: "progress", progressStage: "reasoning", content: "Need to scan document first" },
  { id: "progress-3", type: "tool-use", progressStage: "execution", content: "scan_document_content" },
  { id: "progress-4", type: "progress", progressStage: "execution", toolReason: "Finding section position" },
  { id: "progress-5", type: "tool-response", progressStage: "execution", toolResult: "Found at 450-890 (440 chars)" },
  // ... more messages
  { id: "progress-12", type: "progress", progressStage: "summary", content: "Successfully removed (440 chars)", isTemporary: false }
]
```

### 3. Parser → State → Render
```typescript
// Add to state
setInternalMessages(prev => [...prev, ...parsedMessages]);

// Render loop
messages.map((m) => {
  // Determine style based on type + progressStage
  const bgClass = getBackgroundClass(m);
  const icon = getIcon(m);
  
  return (
    <div className={bgClass}>
      {icon}
      {m.content}
    </div>
  );
})
```

## 🔄 State Management

### Message State Lifecycle

```
User types → setInternalMessages([...prev, userMsg])
              ↓
AI responds → parseProgressiveResponse(response)
              ↓
Multiple messages → setInternalMessages([...prev, ...parsedMessages])
              ↓
Render with types → Different colors per type
              ↓
Save to Firebase → Only summary saved (not temporary)
```

### Temporary vs Permanent

**Temporary Messages (isTemporary: true)**
- Planning (📋)
- Reasoning (🤔)
- Tool execution (⚙️)
- Tool reason (💭)
- Tool result (✅)

**Purpose:** Show AI thinking process, not saved to Firebase

**Permanent Messages (isTemporary: false)**
- User messages
- Summary (✨)
- Fallback (if no markers found)

**Purpose:** Chat history, saved to Firebase

## 🛠️ Component Architecture

```
ChatSidebar.tsx
├─ parseProgressiveResponse() [Lines 30-127]
│  └─ Parse emoji markers into typed messages
│
├─ handleSend() [Lines 377-487]
│  ├─ Add user message
│  ├─ Call mcpService.chat()
│  ├─ Parse AI response
│  ├─ Add parsed messages to state
│  └─ Save summary to Firebase
│
└─ Render [Lines 556-649]
   ├─ Determine styling per message type
   ├─ Show icon for each phase
   └─ Apply gradient backgrounds
```

## 📈 Performance Considerations

### Optimization Strategies
1. **Message Deduplication:** Each message has unique ID based on timestamp
2. **Efficient Parsing:** Single pass through response string
3. **Conditional Saving:** Only summary saved to Firebase (reduces writes)
4. **Memoization:** `useMemo` for messages array
5. **Scroll Optimization:** IntersectionObserver for infinite scroll

### Scalability
- **Max Messages:** No artificial limit (handled by React rendering)
- **Long Responses:** Parser handles any length (splits by markers)
- **Complex Operations:** Multiple tool calls supported (repeatable phases)
- **Nested Reasoning:** Multiple reasoning phases allowed

## 🧪 Testing Scenarios

### Scenario 1: Simple Removal
```
Input: "Remove the introduction"
Expected: Planning → Reasoning → Tool → Reason → Result → Summary
Messages: 6 total (1 planning, 1 reasoning, 3 execution, 1 summary)
```

### Scenario 2: Multi-step Operation
```
Input: "Replace X with Y and add a note at the end"
Expected: Planning → Reasoning → (Tool → Reason → Result) × 3 → Summary
Messages: 11 total (1 planning, 2 reasoning, 9 execution, 1 summary)
```

### Scenario 3: Fallback (No Markers)
```
Input: "What is this document about?"
AI Response: Regular text without emoji markers
Expected: Single assistant message (type: 'assistant')
Messages: 1 total
```

---
Generated: $(Get-Date)
