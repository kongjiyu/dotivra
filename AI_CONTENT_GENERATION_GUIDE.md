# AI Content Generation Guide for TipTap Editor

This guide provides comprehensive instructions for AI agents on how to generate document content that fully utilizes the TipTap editor's styling and feature capabilities in the Dotivra application.

## Table of Contents

- [Overview](#overview)
- [Supported Features](#supported-features)
- [HTML Structure & Styling](#html-structure--styling)
- [Content Types & Formatting](#content-types--formatting)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Integration API](#integration-api)

## Overview

The Dotivra TipTap editor supports a rich set of features including:
- **Typography**: Headings (H1-H5), paragraphs, text formatting
- **Lists**: Ordered, unordered, and task lists with nesting
- **Tables**: Full table support with cell selection and formatting
- **Code Blocks**: Syntax-highlighted code blocks with 25+ languages (including Mermaid)
- **Diagrams**: Mermaid diagram support within code blocks
- **Links**: Smart link detection with tooltips
- **Indentation**: Custom indentation system (up to 21 levels)
- **Interactive Elements**: Task lists, blockquotes, and more

**Important Notes:**
- Mermaid diagrams are rendered within code blocks, not as separate elements
- No inline code styling is available (only code blocks)
- All programming languages use the same code block rendering system

## Supported Features

### 1. Headings (H1-H5)

**HTML Structure:**
```html
<h1>Main Title</h1>
<h2>Section Heading</h2>
<h3>Subsection</h3>
<h4>Sub-subsection</h4>
<h5>Minor Heading</h5>
```

**With Indentation:**
```html
<h2 data-indent="1" style="margin-left: 2rem;">Indented Heading</h2>
<h3 data-indent="2" style="margin-left: 4rem;">Double Indented</h3>
```

**Styling Notes:**
- H1: `2rem` font size, `700` weight, `2rem` top margin
- H2: `1.5rem` font size, `600` weight, `1.5rem` top margin
- H3: `1.17rem` font size, `600` weight, `1.25rem` top margin
- H4: `1rem` font size, `600` weight, `1rem` top margin
- H5: `0.83rem` font size, `600` weight, `0.75rem` top margin
- Maximum indentation: 21 levels (42rem = ~336px)

### 2. Paragraphs

**HTML Structure:**
```html
<p>Regular paragraph text with 18px Times New Roman font.</p>
<p data-indent="1" style="margin-left: 2rem;">Indented paragraph</p>
<p data-indent="3" style="margin-left: 6rem;">Triple indented paragraph</p>
```

**Default Styling:**
- Font: 18px Times New Roman
- Line height: 1.5
- Margin: 0.5em top/bottom

### 3. Text Formatting

**Basic Formatting:**
```html
<p><strong>Bold text</strong></p>
<p><em>Italic text</em></p>
<p><u>Underlined text</u></p>
<p><mark>Highlighted text</mark></p>
<p><s>Strikethrough text</s></p>
```

**Color and Font Styling:**
```html
<p><span style="color: #ff0000;">Red text</span></p>
<p><span style="background-color: #ffff00;">Yellow background</span></p>
<p><span style="font-family: Arial;">Arial font</span></p>
<p><span style="font-size: 24px;">Large text</span></p>
```

**Text Alignment:**
```html
<p style="text-align: left;">Left aligned</p>
<p style="text-align: center;">Center aligned</p>
<p style="text-align: right;">Right aligned</p>
<p style="text-align: justify;">Justified text</p>
```

### 4. Lists

**Unordered Lists:**
```html
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item with <strong>formatting</strong></li>
</ul>
```

**Ordered Lists:**
```html
<ol>
  <li>First step</li>
  <li>Second step</li>
  <li>Final step</li>
</ol>
```

**Nested Lists:**
```html
<ul>
  <li>Main item
    <ul>
      <li>Sub item 1</li>
      <li>Sub item 2</li>
    </ul>
  </li>
  <li>Another main item</li>
</ul>
```

**Task Lists:**
```html
<ul data-type="taskList" class="task-list">
  <li data-type="taskItem" class="task-item" data-checked="false">
    <label><input type="checkbox" /><span></span></label>
    <div>Uncompleted task</div>
  </li>
  <li data-type="taskItem" class="task-item" data-checked="true">
    <label><input type="checkbox" checked /><span></span></label>
    <div>Completed task</div>
  </li>
</ul>
```

### 5. Tables

**Basic Table:**
```html
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
      <th>Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cell 1</td>
      <td>Cell 2</td>
      <td>Cell 3</td>
    </tr>
    <tr>
      <td>Cell 4</td>
      <td>Cell 5</td>
      <td>Cell 6</td>
    </tr>
  </tbody>
</table>
```

**Table with Formatting:**
```html
<table>
  <thead>
    <tr>
      <th style="text-align: left;">Name</th>
      <th style="text-align: center;">Status</th>
      <th style="text-align: right;">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>John Doe</strong></td>
      <td><mark>Active</mark></td>
      <td style="text-align: right;">$1,250.00</td>
    </tr>
  </tbody>
</table>
```

### 6. Code Blocks

**Important**: All code (including Mermaid diagrams) uses the same code block system. There is no separate inline code styling available.

**Supported Languages:**
- JavaScript, TypeScript, Python, Java, C++, C, C#
- HTML, CSS, SCSS, JSON, XML, YAML
- Bash, Shell, Docker, SQL, Go, Rust
- PHP, Ruby, Swift, Kotlin, Markdown
- **Mermaid** (for diagrams within code blocks)
- Plaintext (default)

**Code Block Structure:**
```html
<pre><code class="language-javascript" data-language="javascript">
function calculateSum(a, b) {
  return a + b;
}

const result = calculateSum(5, 3);
console.log(result); // Output: 8
</code></pre>
```

**Language-Specific Examples:**

**Python:**
```html
<pre><code class="language-python" data-language="python">
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate first 10 fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
</code></pre>
```

**SQL:**
```html
<pre><code class="language-sql" data-language="sql">
SELECT u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email
ORDER BY order_count DESC;
</code></pre>
```

**JSON:**
```html
<pre><code class="language-json" data-language="json">
{
  "name": "AI Content Generator",
  "version": "1.0.0",
  "features": [
    "syntax highlighting",
    "multiple languages",
    "smart formatting"
  ],
  "config": {
    "theme": "dark",
    "lineNumbers": true
  }
}
</code></pre>
```

### 7. Mermaid Diagrams

**Important**: Mermaid diagrams are created as code blocks with `language="mermaid"`, not as separate diagram elements.

**Diagram Types Supported:**
- Flowcharts, Sequence diagrams, Class diagrams
- State diagrams, ER diagrams, Gantt charts
- Pie charts, Git graphs, Mind maps

**Mermaid Code Block Structure:**
```html
<pre><code class="language-mermaid" data-language="mermaid">
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E[End]
</code></pre>
```

**Complex Flowchart Example:**
```html
<pre><code class="language-mermaid" data-language="mermaid">
graph TD
    A[User Request] --> B{Content Type?}
    B -->|Text| C[Format Text]
    B -->|Code| D[Add Syntax Highlighting]
    B -->|Diagram| E[Generate Mermaid]
    C --> F[Apply Styling]
    D --> F
    E --> F
    F --> G[Insert into Editor]
</code></pre>
```

**Sequence Diagram Example:**
```html
<pre><code class="language-mermaid" data-language="mermaid">
sequenceDiagram
    participant U as User
    participant AI as AI Agent
    participant E as TipTap Editor
    
    U->>AI: Request content generation
    AI->>AI: Analyze content type
    AI->>E: Insert formatted content
    E->>U: Display styled content
</code></pre>
```

**Features:**
- Code blocks with Mermaid language support syntax highlighting
- Built-in preview toggle (Code/Preview modes)
- Copy functionality for diagram code
- Error handling for invalid syntax

### 8. Links

**Basic Links:**
```html
<p>Visit <a href="https://example.com">our website</a> for more information.</p>
```

**Links with Custom Attributes:**
```html
<p>Check out <a href="https://github.com/project" target="_blank" rel="noopener noreferrer" class="tiptap-link">this repository</a>.</p>
```

**Email and Phone Links:**
```html
<p>Contact us at <a href="mailto:contact@example.com">contact@example.com</a></p>
<p>Call us at <a href="tel:+1234567890">+1 (234) 567-890</a></p>
```

### 9. Blockquotes

**Basic Blockquote:**
```html
<blockquote>
  <p>This is an important quote that stands out from the regular text content.</p>
</blockquote>
```

**Blockquote with Attribution:**
```html
<blockquote>
  <p>"The best way to predict the future is to create it."</p>
  <p><em>— Peter Drucker</em></p>
</blockquote>
```

**Nested Content in Blockquote:**
```html
<blockquote>
  <h4>Important Note</h4>
  <p>This blockquote contains both a heading and paragraph text.</p>
  <ul>
    <li>Point one</li>
    <li>Point two</li>
  </ul>
</blockquote>
```

### 10. Code Content (No Inline Code)

**Important**: This editor does NOT support inline code styling. All code must be in code blocks.

**Incorrect - Inline Code (Not Supported):**
```html
<!-- This will NOT work -->
<p>Use the <code>editor.commands.insertContent()</code> method to add content.</p>
```

**Correct - Code Block:**
```html
<p>Use the editor.commands.insertContent() method to add content:</p>
<pre><code class="language-javascript" data-language="javascript">
editor.commands.insertContent()
</code></pre>
```

**For Short Code Snippets:**
```html
<p>To add content, use the following method:</p>
<pre><code class="language-javascript" data-language="javascript">
editor.commands.insertContent()
</code></pre>
```

## Content Types & Formatting

### Document Sections

**Executive Summary:**
```html
<h1>Executive Summary</h1>
<p>This document provides a comprehensive overview of...</p>

<h2>Key Objectives</h2>
<ul>
  <li><strong>Primary Goal:</strong> Implement AI content generation</li>
  <li><strong>Secondary Goal:</strong> Enhance user experience</li>
  <li><strong>Success Metrics:</strong> User engagement and content quality</li>
</ul>
```

**Technical Specifications:**
```html
<h2>Technical Requirements</h2>
<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Technology</th>
      <th>Version</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Editor</strong></td>
      <td>TipTap</td>
      <td>2.x</td>
      <td><mark>Implemented</mark></td>
    </tr>
    <tr>
      <td><strong>Highlighting</strong></td>
      <td>Highlight.js</td>
      <td>11.x</td>
      <td><mark>Implemented</mark></td>
    </tr>
  </tbody>
</table>
```

**Process Flows:**
```html
<h3>Content Generation Process</h3>
<pre><code class="language-mermaid" data-language="mermaid">
graph LR
    A[User Input] --> B[AI Processing]
    B --> C[Content Generation]
    C --> D[Format & Style]
    D --> E[Insert to Editor]
    E --> F[User Review]
</code></pre>
```

### Code Documentation

**Code Documentation:**
```html
<h3>API Reference</h3>

<h4>writeAIContent(editor, content, options)</h4>
<p>Writes AI-generated content to the TipTap editor with formatting options.</p>

<h5>Parameters:</h5>
<ul>
  <li><strong>editor</strong> (Editor): TipTap editor instance</li>
  <li><strong>content</strong> (string): Content to insert</li>
  <li><strong>options</strong> (object): Configuration options</li>
</ul>

<h5>Example:</h5>
<pre><code class="language-javascript" data-language="javascript">
await writeAIContent(editor, "# Hello World\nThis is **bold** text.", {
  position: 'current',
  animate: true,
  parseMarkdown: true
});
</code></pre>
```

### Structured Content

**Project Plans:**
```html
<h2>Project Implementation Plan</h2>

<h3>Phase 1: Foundation (Weeks 1-2)</h3>
<ul data-type="taskList" class="task-list">
  <li data-type="taskItem" class="task-item" data-checked="true">
    <label><input type="checkbox" checked /><span></span></label>
    <div>Set up TipTap editor configuration</div>
  </li>
  <li data-type="taskItem" class="task-item" data-checked="true">
    <label><input type="checkbox" checked /><span></span></label>
    <div>Implement syntax highlighting</div>
  </li>
  <li data-type="taskItem" class="task-item" data-checked="false">
    <label><input type="checkbox" /><span></span></label>
    <div>Add Mermaid diagram support</div>
  </li>
</ul>

<h3>Phase 2: AI Integration (Weeks 3-4)</h3>
<ul data-type="taskList" class="task-list">
  <li data-type="taskItem" class="task-item" data-checked="false">
    <label><input type="checkbox" /><span></span></label>
    <div>Implement content generation API</div>
  </li>
  <li data-type="taskItem" class="task-item" data-checked="false">
    <label><input type="checkbox" /><span></span></label>
    <div>Add streaming animation support</div>
  </li>
</ul>
```

## Summary

When generating content for the Dotivra TipTap editor, AI agents should:

1. **Use semantic HTML** with proper element hierarchy
2. **Apply consistent styling** following the established patterns
3. **Use code blocks for all code** - no inline code styling available
4. **Create Mermaid diagrams as code blocks** with `language="mermaid"`
5. **Support H1-H5 headings only** (H6 not available)
6. **Maintain accessibility** with proper attributes and structure
7. **Optimize for readability** with appropriate spacing and formatting
8. **Follow language conventions** for code examples and technical content
9. **Use the available toolbar features** for text formatting, lists, tables, and indentation
