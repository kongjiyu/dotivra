import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'
import { CodeBlockNodeView } from './CodeBlockNodeView'

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

// Add additional languages
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import docker from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

// Register additional languages
lowlight.register('bash', bash)
lowlight.register('css', css)
lowlight.register('docker', docker)
lowlight.register('dockerfile', docker)
lowlight.register('go', go)
lowlight.register('java', java)
lowlight.register('json', json)
lowlight.register('kotlin', kotlin)
lowlight.register('markdown', markdown)
lowlight.register('php', php)
lowlight.register('python', python)
lowlight.register('ruby', ruby)
lowlight.register('rust', rust)
lowlight.register('scss', scss)
lowlight.register('shell', shell)
lowlight.register('sql', sql)
lowlight.register('swift', swift)
lowlight.register('typescript', typescript)
lowlight.register('xml', xml)
lowlight.register('yaml', yaml)

// Add a simple Mermaid syntax definition for basic highlighting
const mermaidLanguage = function(_hljs: any) {
  return {
    name: 'mermaid',
    keywords: {
      keyword: [
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2',
        'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline', 'zenuml',
        'TD', 'TB', 'BT', 'RL', 'LR', 'participant', 'actor', 'note', 'loop', 'alt', 'else',
        'opt', 'par', 'and', 'rect', 'activate', 'deactivate', 'title', 'class', 'click',
        'callback', 'link', 'linkStyle', 'classDef', 'style', 'fill', 'stroke', 'color',
        'dateFormat', 'axisFormat', 'section', 'done', 'active', 'crit', 'after'
      ].join(' ')
    },
    contains: [
      {
        className: 'string',
        begin: '"',
        end: '"'
      },
      {
        className: 'string',
        begin: "'",
        end: "'"
      },
      {
        className: 'comment',
        begin: '%%',
        end: '$'
      },
      {
        className: 'number',
        begin: '\\b\\d+\\b'
      },
      {
        className: 'symbol',
        begin: '-->|->|===|==|-.->|::|\\|\\||\\[\\*\\]'
      }
    ]
  }
}

lowlight.register('mermaid', mermaidLanguage)

export const CodeBlockWithHighlight = CodeBlockLowlight
  .extend({
    name: 'codeBlock',
    
    addAttributes() {
      return {
        language: {
          default: 'plaintext',
          parseHTML: (element: HTMLElement) => {
            // Try to get language from data-language attribute first
            const dataLang = element.getAttribute('data-language')
            if (dataLang) return dataLang
            
            // Fallback: try to extract from class attribute (language-*)
            const classList = element.className?.split(' ') || []
            for (const cls of classList) {
              if (cls.startsWith('language-')) {
                return cls.replace('language-', '')
              }
            }
            
            // Check code element inside pre (for standard markdown format)
            const codeElement = element.querySelector('code')
            if (codeElement) {
              const codeDataLang = codeElement.getAttribute('data-language')
              if (codeDataLang) return codeDataLang
              
              const codeClassList = codeElement.className?.split(' ') || []
              for (const cls of codeClassList) {
                if (cls.startsWith('language-')) {
                  return cls.replace('language-', '')
                }
              }
            }
            
            return null
          },
          renderHTML: (attributes: any) => {
            if (!attributes.language) {
              return {}
            }
            return {
              'data-language': attributes.language,
              class: `language-${attributes.language}`,
            }
          },
        },
      }
    },

    parseHTML() {
      return [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
          getAttrs: (element: string | HTMLElement) => {
            if (typeof element === 'string') return null
            
            const el = element as HTMLElement
            
            // Try to get language from pre element
            let language = el.getAttribute('data-language')
            
            // Try from class
            if (!language) {
              const classList = el.className?.split(' ') || []
              for (const cls of classList) {
                if (cls.startsWith('language-')) {
                  language = cls.replace('language-', '')
                  break
                }
              }
            }
            
            // Try from code element inside
            if (!language) {
              const codeElement = el.querySelector('code')
              if (codeElement) {
                language = codeElement.getAttribute('data-language')
                
                if (!language) {
                  const codeClassList = codeElement.className?.split(' ') || []
                  for (const cls of codeClassList) {
                    if (cls.startsWith('language-')) {
                      language = cls.replace('language-', '')
                      break
                    }
                  }
                }
              }
            }
            
            return language ? { language } : { language: 'plaintext' }
          },
        },
      ]
    },

    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockNodeView)
    },

    addCommands() {
      return {
        setCodeBlock: (attributes: any) => ({ commands }: any) => {
          return commands.setNode(this.name, attributes)
        },
        toggleCodeBlock: (attributes: any) => ({ commands }: any) => {
          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
      }
    },

    addKeyboardShortcuts() {
      return {
        'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
        // Exit code block with Enter
        'Mod-Enter': () => {
          return this.editor.commands.exitCode()
        },
      }
    },
  })
  .configure({
    lowlight,
    defaultLanguage: 'plaintext',
  })