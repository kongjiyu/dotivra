# Dotivra

A modern React application built with TypeScript, Vite, and Tailwind CSS, featuring rich text editing capabilities with TipTap and Mermaid diagram rendering.

## 🚀 Features

- **Rich Text Editor**: Powered by TipTap with floating and bubble menus
- **Diagram Rendering**: Mermaid diagram support with multiple themes
- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript support
- **Fast Development**: Vite for lightning-fast HMR and builds
- **AI Integration**: Google Generative AI support
- **Firebase Integration**: Ready for backend services
- **Responsive Design**: Mobile-first approach

## 🛠️ Tech Stack

### Core
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework

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
├── components/
│   ├── ui/           # Reusable UI components
│   ├── Tiptap.tsx    # Rich text editor component
│   └── MermaidDiagram.tsx  # Diagram rendering component
├── lib/
│   └── utils.ts      # Utility functions
├── assets/           # Static assets
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

## 🎨 Components

### TipTap Editor
A rich text editor with floating and bubble menus, supporting:
- Basic text formatting
- Extensible with TipTap extensions
- Customizable menus

### Mermaid Diagram
A component for rendering Mermaid diagrams with:
- Multiple theme support (default, forest, dark, neutral)
- Error handling
- Responsive design

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
