import type { Editor } from '@tiptap/react';

/**
 * Automatically adds horizontal rules after H1 and H2 headings during import/conversion
 * This function should be called after setContent() operations
 */
export function addDividersAfterHeadings(editor: Editor | null) {
  if (!editor) return;

  const { doc } = editor.state;
  let tr = editor.state.tr;
  let offset = 0;

  // Traverse the document and find H1 and H2 headings
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && (node.attrs.level === 1 || node.attrs.level === 2)) {
      // Get the position after this heading
      const afterPos = pos + node.nodeSize + offset;
      
      // Check if the next node exists and is not already a horizontal rule
      const nextNode = doc.resolve(afterPos).nodeAfter;
      
      if (!nextNode || nextNode.type.name !== 'horizontalRule') {
        // Insert horizontal rule after the heading
        const hrNode = editor.schema.nodes.horizontalRule.create();
        tr = tr.insert(afterPos, hrNode);
        offset += hrNode.nodeSize;
      }
    }
  });

  // Apply all insertions at once
  if (offset > 0) {
    editor.view.dispatch(tr);
  }
}
