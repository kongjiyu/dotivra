/**
 * Quick AI Content Writer Helper
 * 
 * This module provides simple helper functions for common AI content writing tasks.
 * Import these functions for easy integration throughout the application.
 */

import type { Editor } from '@tiptap/react';
import { writeAIContent, streamAIContent, insertAIStructuredContent } from './aiContentWriter';

/**
 * Quick insert AI text with default animation
 */
export async function quickInsertAI(editor: Editor, content: string): Promise<void> {
  return streamAIContent(editor, content, {
    animate: true,
    streamDelay: 30,
    parseMarkdown: true,
    focus: true
  });
}

/**
 * Quick append AI content to end of document
 */
export async function quickAppendAI(editor: Editor, content: string): Promise<void> {
  return streamAIContent(editor, content, {
    position: 'end',
    animate: true,
    streamDelay: 20,
    parseMarkdown: true,
    focus: true
  });
}

/**
 * Instantly insert AI content without animation
 */
export async function instantInsertAI(editor: Editor, content: string): Promise<void> {
  return writeAIContent(editor, content, {
    animate: false,
    parseMarkdown: true,
    focus: true
  });
}

/**
 * Insert AI summary at current position
 */
export async function insertAISummary(editor: Editor, summaryText: string): Promise<void> {
  const formattedSummary = `## Summary\n\n${summaryText}`;
  return quickInsertAI(editor, formattedSummary);
}

/**
 * Insert AI outline/structure
 */
export async function insertAIOutline(editor: Editor, outlineItems: string[]): Promise<void> {
  return insertAIStructuredContent(editor, 'list', {
    items: outlineItems,
    ordered: true
  });
}

/**
 * Insert AI-generated table
 */
export async function insertAITable(
  editor: Editor, 
  headers: string[], 
  rows: string[][]
): Promise<void> {
  return insertAIStructuredContent(editor, 'table', {
    headers,
    rows
  });
}

/**
 * Insert AI-generated Mermaid diagram
 */
export async function insertAIDiagram(editor: Editor, diagramCode: string): Promise<void> {
  return insertAIStructuredContent(editor, 'mermaid', {
    chart: diagramCode,
    theme: 'default'
  });
}

/**
 * Replace selected text with AI content
 */
export async function replaceWithAI(editor: Editor, newContent: string): Promise<void> {
  const { from, to } = editor.state.selection;
  
  if (from !== to) {
    // Delete selection
    editor.commands.deleteRange({ from, to });
  }
  
  // Insert new content
  return quickInsertAI(editor, newContent);
}

/**
 * Common AI prompts for quick access
 */
export const AI_PROMPTS = {
  IMPROVE: "Please improve and enhance this content",
  SUMMARIZE: "Create a concise summary of this content",
  OUTLINE: "Create an outline structure for this content",
  EXPAND: "Expand this content with more details and examples",
  SIMPLIFY: "Simplify this content for better readability",
  PROOFREAD: "Proofread and correct any errors in this content",
  BULLET_POINTS: "Convert this content into bullet points",
  CONCLUSION: "Write a strong conclusion for this content"
};

/**
 * Execute common AI operations
 */
export const AI_OPERATIONS = {
  /**
   * Generate and insert an executive summary
   */
  async executiveSummary(editor: Editor, _documentContent?: string): Promise<void> {
    const summary = `## Executive Summary

This document presents key findings and recommendations based on comprehensive analysis. The main objectives focus on strategic implementation and measurable outcomes.

### Key Highlights:
• **Strategic Alignment**: Ensures all initiatives align with business objectives
• **Implementation Roadmap**: Clear timeline and milestones for execution  
• **Success Metrics**: Quantifiable measures for tracking progress
• **Risk Mitigation**: Proactive identification and management of potential challenges

### Recommendations:
1. Prioritize high-impact initiatives with immediate ROI potential
2. Establish clear governance structure for decision-making
3. Implement regular review cycles for continuous improvement
4. Ensure adequate resource allocation for successful execution`;

    return insertAISummary(editor, summary);
  },

  /**
   * Generate and insert a project outline
   */
  async projectOutline(editor: Editor): Promise<void> {
    const outline = [
      "Project Overview and Objectives",
      "Scope and Deliverables", 
      "Timeline and Milestones",
      "Resource Requirements",
      "Risk Assessment and Mitigation",
      "Success Criteria and Metrics",
      "Next Steps and Action Items"
    ];

    return insertAIOutline(editor, outline);
  },

  /**
   * Generate and insert a sample data table
   */
  async sampleTable(editor: Editor): Promise<void> {
    const headers = ["Task", "Owner", "Due Date", "Status", "Priority"];
    const rows = [
      ["Requirements Analysis", "Project Team", "2024-01-15", "In Progress", "High"],
      ["Design Phase", "Design Team", "2024-01-30", "Not Started", "High"],
      ["Development", "Dev Team", "2024-03-15", "Not Started", "Medium"],
      ["Testing & QA", "QA Team", "2024-04-01", "Not Started", "High"],
      ["Deployment", "DevOps Team", "2024-04-15", "Not Started", "Medium"]
    ];

    return insertAITable(editor, headers, rows);
  }
};

export default {
  quickInsertAI,
  quickAppendAI,
  instantInsertAI,
  insertAISummary,
  insertAIOutline,
  insertAITable,
  insertAIDiagram,
  replaceWithAI,
  AI_PROMPTS,
  AI_OPERATIONS
};