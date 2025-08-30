# Dotivra - AI Documentation Platform

A modern React application that combines AI-powered documentation generation with rich text editing capabilities. Built with TypeScript, Vite, and Tailwind CSS, featuring TipTap editor and Mermaid diagram rendering.

## 🚀 Features

- **AI-Powered Generation**: Leverage advanced AI to automatically generate comprehensive documentation
- **Rich Text Editor**: Powered by TipTap with floating and bubble menus
- **Diagram Rendering**: Mermaid diagram support with multiple themes
- **Document Management**: Dashboard to organize and manage all your documents
- **Template System**: Pre-built templates for different documentation types
- **Real-time Collaboration**: Work together with your team in real-time
- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript support
- **Fast Development**: Vite for lightning-fast HMR and builds

## 🛠️ Tech Stack

### Core
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **React Router** - Client-side routing

### Rich Text & Diagrams
- **TipTap** - Headless rich text editor
- **Mermaid** - Diagram and chart rendering
- **ProseMirror** - Text editing engine

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Class Variance Authority** - Component variant management

### Backend & AI
- **Firebase** - Backend as a service
- **Google Generative AI** - AI-powered features
- **Axios** - HTTP client

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting rules

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dotivra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
src/
├── pages/                    # Application pages
│   ├── Home.tsx             # Landing page with features overview
│   ├── Dashboard.tsx        # Document management dashboard
│   ├── DocumentEditor.tsx   # Rich text editor with AI tools
│   ├── AIGenerator.tsx      # AI-powered documentation generator
│   └── index.ts             # Page exports
├── components/
│   ├── Layout.tsx           # Main layout with navigation
│   ├── ui/                  # Reusable UI components
│   ├── Tiptap.tsx           # Rich text editor component
│   └── MermaidDiagram.tsx   # Diagram rendering component
├── lib/
│   └── utils.ts             # Utility functions
├── App.tsx                  # Main application with routing
└── main.tsx                 # Application entry point
```

## 🎨 Pages & Features

### Home Page
- Hero section with platform overview
- Feature highlights with icons
- Call-to-action sections

### Dashboard
- Document overview with statistics
- Recent documents list
- Search and filtering capabilities
- Quick action buttons

### Document Editor
- Full-featured rich text editor
- AI-powered content generation
- Template selection
- Diagram insertion
- Real-time collaboration tools

### AI Generator
- Template-based documentation generation
- Custom prompt input
- Sample prompts for guidance
- Generated content preview
- Export and copy functionality

## 🔧 Configuration

### Vite Configuration
- React plugin for Fast Refresh
- Tailwind CSS integration
- Path aliases (`@` points to `src/`)

### Tailwind CSS
- Version 4 with latest features
- Custom utility classes
- Responsive design utilities

### TypeScript
- Strict type checking
- Path mapping support
- Modern ES modules

## 🚀 Deployment

The project is configured for easy deployment:

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Preview the build**
   ```bash
   npm run preview
   ```

3. **Deploy to your preferred platform**
   - Vercel, Netlify, or any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TipTap Documentation](https://tiptap.dev/)
- [Mermaid Documentation](https://mermaid.js.org/)
