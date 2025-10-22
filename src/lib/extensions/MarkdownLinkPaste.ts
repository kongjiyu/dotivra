import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Extension to automatically convert markdown-style links [text](url) to HTML links
 * Handles both paste and typing
 */
export const MarkdownLinkPaste = Extension.create({
  name: 'markdownLinkPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownLinkPaste'),
        
        props: {
          // Handle text input (typing)
          handleTextInput(view, from, to, text) {
            const { state, dispatch } = view;
            const { schema } = state;
            
            // Check if user just typed a closing parenthesis that completes a markdown link
            if (text === ')') {
              const textBefore = state.doc.textBetween(Math.max(0, from - 100), from, '\n');
              const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)$/;
              const match = textBefore.match(markdownLinkRegex);
              
              if (match) {
                const [fullMatch, linkText, url] = match;
                const matchStart = from - fullMatch.length;
                const matchEnd = from + 1; // Include the closing )
                
                // Create link node
                const linkNode = schema.text(linkText, [
                  schema.marks.link.create({ href: url })
                ]);
                
                // Replace the markdown syntax with the link
                const tr = state.tr.replaceWith(matchStart, matchEnd, linkNode);
                dispatch(tr);
                
                return true; // Handled
              }
            }
            
            return false; // Not handled, continue with default
          },
          
          // Handle paste events
          handlePaste(view, event, slice) {
            const { state, dispatch } = view;
            const { schema } = state;
            
            // Get pasted text
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;
            
            // Regex to match markdown links: [text](url)
            const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            
            // Check if text contains markdown links
            if (markdownLinkRegex.test(text)) {
              event.preventDefault();
              
              // Split text and convert markdown links to HTML
              const fragments: any[] = [];
              let lastIndex = 0;
              const matches = text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
              
              for (const match of matches) {
                const [fullMatch, linkText, url] = match;
                const matchIndex = match.index || 0;
                
                // Add text before the link
                if (matchIndex > lastIndex) {
                  const textBefore = text.substring(lastIndex, matchIndex);
                  fragments.push(schema.text(textBefore));
                }
                
                // Add the link
                fragments.push(
                  schema.text(linkText, [schema.marks.link.create({ href: url })])
                );
                
                lastIndex = matchIndex + fullMatch.length;
              }
              
              // Add remaining text after last link
              if (lastIndex < text.length) {
                fragments.push(schema.text(text.substring(lastIndex)));
              }
              
              // Insert the converted content
              const { from } = state.selection;
              const tr = state.tr.replaceWith(from, from, fragments);
              dispatch(tr);
              
              return true; // Handled
            }
            
            return false; // Not handled, continue with default
          },
        },
      }),
    ];
  },
});

export default MarkdownLinkPaste;
