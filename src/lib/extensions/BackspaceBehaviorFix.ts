import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'

// Notion-style backspace behavior: Convert to paragraph without moving cursor
// When backspace is pressed at the start of a list/quote/heading, convert to paragraph on same line
export const BackspaceBehaviorFix = Extension.create({
    name: 'backspaceBehaviorFix',
    
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('backspaceBehaviorFix'),
                
                props: {
                    handleKeyDown: (view, event) => {
                        // Only handle backspace key
                        if (event.key !== 'Backspace') {
                            return false
                        }
                        
                        const { state, dispatch } = view
                        const { selection } = state
                        const { $from, empty } = selection
                        
                        // Only handle when cursor is at the very start of a block with no selection
                        if (!empty || $from.parentOffset !== 0) {
                            return false
                        }
                        
                        // Get the current block node and its position
                        const currentBlockNode = $from.parent
                        const currentBlockType = currentBlockNode.type.name
                        const currentBlockPos = $from.before()
                        
                        // Also check parent context for nested structures
                        const parentNode = $from.node(-1)
                        const parentType = parentNode?.type.name
                        
                        // Check if we're in an indented paragraph or heading
                        const isIndentedContent = (currentBlockType === 'paragraph' || currentBlockType === 'heading') && 
                                                 currentBlockNode.attrs.indent && 
                                                 currentBlockNode.attrs.indent > 0;
                        
                        if (isIndentedContent) {
                            // For indented content, reduce indent level instead of converting to paragraph
                            event.preventDefault()
                            
                            const currentIndent = currentBlockNode.attrs.indent || 0
                            const newIndent = Math.max(0, currentIndent - 1)
                            
                            let tr = state.tr.setNodeMarkup(currentBlockPos, undefined, {
                                ...currentBlockNode.attrs,
                                indent: newIndent,
                            })
                            
                            // Keep cursor at the beginning of the line
                            const newCursorPos = $from.pos
                            tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                            
                            if (dispatch) {
                                dispatch(tr)
                            }
                            
                            return true
                        }
                        
                        // Special handling for paragraphs inside list items
                        // This is the most common case: list > listItem > paragraph
                        if (currentBlockType === 'paragraph' && ['listItem', 'taskItem'].includes(parentType || '')) {
                            event.preventDefault()
                            
                            const listItemPos = $from.before(-1)
                            const listPos = $from.before(-2)
                            const listNode = $from.node(-2)
                            const listItemNode = parentNode
                            
                            // Get the paragraph content
                            const paragraphContent = currentBlockNode.content
                            
                            // Create a new standalone paragraph
                            const newParagraph = state.schema.nodes.paragraph.create({}, paragraphContent)
                            
                            let tr = state.tr
                            
                            // If this is the only item in the list (single-line list)
                            if (listNode && listNode.childCount === 1) {
                                // Replace the entire list with paragraph and stay at current line
                                tr = tr.replaceWith(listPos, listPos + listNode.nodeSize, newParagraph)
                                
                                // Keep cursor at the beginning of the new paragraph (same line position)
                                const newCursorPos = listPos + 1
                                try {
                                    tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                                } catch (e) {
                                    const $newPos = tr.doc.resolve(listPos)
                                    tr = tr.setSelection(TextSelection.near($newPos))
                                }
                            } else {
                                // Multi-line list: Remove current list item formatting only, stay at current line
                                // Replace the current list item with a standalone paragraph at the same position
                                tr = tr.replaceWith(listItemPos, listItemPos + listItemNode!.nodeSize, newParagraph)
                                
                                // Keep cursor at the beginning of the converted paragraph (same line)
                                const newCursorPos = listItemPos + 1
                                try {
                                    tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                                } catch (e) {
                                    const $newPos = tr.doc.resolve(listItemPos)
                                    tr = tr.setSelection(TextSelection.near($newPos))
                                }
                            }
                            
                            if (dispatch && tr.docChanged) {
                                dispatch(tr)
                            }
                            
                            return true
                        }
                        
                        // Handle headings
                        if (currentBlockType === 'heading') {
                            event.preventDefault()
                            
                            const headingContent = currentBlockNode.content
                            const newParagraph = state.schema.nodes.paragraph.create({}, headingContent)
                            
                            let tr = state.tr.replaceWith(currentBlockPos, currentBlockPos + currentBlockNode.nodeSize, newParagraph)
                            
                            const newCursorPos = currentBlockPos + 1
                            
                            try {
                                tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                            } catch (e) {
                                const $fallback = tr.doc.resolve(currentBlockPos)
                                tr = tr.setSelection(TextSelection.near($fallback))
                            }
                            
                            if (dispatch && tr.docChanged) {
                                dispatch(tr)
                            }
                            
                            return true
                        }
                        
                        // Handle code blocks
                        if (currentBlockType === 'codeBlock') {
                            event.preventDefault()
                            
                            const codeContent = currentBlockNode.content
                            
                            // If code block is empty or only has whitespace, delete it and merge with previous block
                            const codeText = currentBlockNode.textContent.trim()
                            
                            if (codeText === '') {
                                // Empty code block - delete it entirely
                                const $before = state.doc.resolve(currentBlockPos)
                                const before = $before.nodeBefore
                                
                                if (before) {
                                    // Move cursor to end of previous block
                                    const beforePos = currentBlockPos - before.nodeSize
                                    let tr = state.tr.delete(currentBlockPos, currentBlockPos + currentBlockNode.nodeSize)
                                    
                                    // Set cursor to end of previous block
                                    const newPos = beforePos + before.nodeSize - 1
                                    try {
                                        tr = tr.setSelection(TextSelection.create(tr.doc, newPos))
                                    } catch (e) {
                                        const $newPos = tr.doc.resolve(beforePos)
                                        tr = tr.setSelection(TextSelection.near($newPos))
                                    }
                                    
                                    if (dispatch && tr.docChanged) {
                                        dispatch(tr)
                                    }
                                    return true
                                }
                            } 
                            
                            // Code block has content - convert to paragraph
                            const newParagraph = state.schema.nodes.paragraph.create({}, codeContent)
                            let tr = state.tr.replaceWith(currentBlockPos, currentBlockPos + currentBlockNode.nodeSize, newParagraph)
                            
                            const newCursorPos = currentBlockPos + 1
                            
                            try {
                                tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                            } catch (e) {
                                const $fallback = tr.doc.resolve(currentBlockPos)
                                tr = tr.setSelection(TextSelection.near($fallback))
                            }
                            
                            if (dispatch && tr.docChanged) {
                                dispatch(tr)
                            }
                            
                            return true
                        }
                        
                        return false
                    }
                }
            })
        ]
    }
})
