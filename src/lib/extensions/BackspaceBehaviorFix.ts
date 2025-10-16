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
                        const grandParentNode = $from.node(-2)
                        const grandParentType = grandParentNode?.type.name
                        
                        // Check if we're in a special block that should convert to paragraph
                        const shouldConvertToParagraph = [
                            'heading',
                            'listItem',
                            'bulletList',
                            'orderedList',
                            'taskItem',
                            'taskList'
                        ].includes(currentBlockType)
                        
                        const isInSpecialParent = [
                            'listItem', 
                            'taskItem', 
                            'bulletList',
                            'orderedList'
                        ].includes(parentType || '')
                        
                        if (shouldConvertToParagraph || isInSpecialParent) {
                            
                            // Prevent default backspace behavior 
                            event.preventDefault()
                            
                            let tr = state.tr
                            
                            if (isInSpecialParent && currentBlockType === 'paragraph') {
                                // We're in a paragraph inside a list/quote - lift it out
                                const specialParentPos = $from.before(-1)
                                const specialParentNode = parentNode
                                
                                // Extract the paragraph content 
                                const paragraphContent = currentBlockNode.content
                                
                                // Create a new standalone paragraph
                                const newParagraph = state.schema.nodes.paragraph.create({}, paragraphContent)
                                
                                // Replace the entire special parent with just the paragraph
                                tr = tr.replaceWith(specialParentPos, specialParentPos + specialParentNode!.nodeSize, newParagraph)
                                
                                // Calculate proper cursor position inside the new paragraph
                                const newCursorPos = specialParentPos + 1
                                
                                // Use a safer selection method that validates the position
                                try {
                                    const $newPos = tr.doc.resolve(newCursorPos)
                                    if ($newPos.parent.type.name === 'paragraph') {
                                        tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                                    } else {
                                        tr = tr.setSelection(TextSelection.near($newPos))
                                    }
                                } catch (e) {
                                    const $fallback = tr.doc.resolve(specialParentPos)
                                    tr = tr.setSelection(TextSelection.near($fallback))
                                }
                                
                            } else if (currentBlockType === 'heading') {
                                // Convert heading to paragraph
                                const headingContent = currentBlockNode.content
                                const newParagraph = state.schema.nodes.paragraph.create({}, headingContent)
                                
                                tr = tr.replaceWith(currentBlockPos, currentBlockPos + currentBlockNode.nodeSize, newParagraph)
                                
                                const newCursorPos = currentBlockPos + 1
                                
                                try {
                                    tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                                } catch (e) {
                                    const $fallback = tr.doc.resolve(currentBlockPos)
                                    tr = tr.setSelection(TextSelection.near($fallback))
                                }
                                
                            } else if (['listItem', 'taskItem'].includes(currentBlockType)) {
                                // Convert list item to paragraph
                                const itemContent = currentBlockNode.content
                                const newParagraph = state.schema.nodes.paragraph.create({}, itemContent)
                                
                                // Find the list container position
                                const listPos = $from.before(-1)
                                const listNode = parentNode
                                
                                if (listNode && listNode.childCount === 1) {
                                    // If this is the only item in the list, replace entire list
                                    tr = tr.replaceWith(listPos, listPos + listNode.nodeSize, newParagraph)
                                    
                                    const newCursorPos = listPos + 1
                                    
                                    try {
                                        tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                                    } catch (e) {
                                        const $fallback = tr.doc.resolve(listPos)
                                        tr = tr.setSelection(TextSelection.near($fallback))
                                    }
                                } else {
                                    // Replace just this item with a paragraph
                                    tr = tr.replaceWith(currentBlockPos, currentBlockPos + currentBlockNode.nodeSize, newParagraph)
                                    
                                    const newCursorPos = currentBlockPos + 1
                                    
                                    try {
                                        tr = tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
                                    } catch (e) {
                                        const $fallback = tr.doc.resolve(currentBlockPos)
                                        tr = tr.setSelection(TextSelection.near($fallback))
                                    }
                                }
                                
                            } 
                            
                            // Apply the transaction
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