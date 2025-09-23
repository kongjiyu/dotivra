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
          parseHTML: (element: HTMLElement) => element.getAttribute('data-language'),
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