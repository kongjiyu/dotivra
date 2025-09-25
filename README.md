# Dotivra - AI-Powered Documentation Platform

A modern React application that combines AI-powered documentation generation with rich text editing capabilities. Built with TypeScript, Vite, Tailwind CSS, and Firebase, featuring comprehensive authentication and real-time document management.

## 🚀 Features

### 🔐 Authentication & Security
- **Multi-Provider Authentication**: Email/password, Google OAuth, and GitHub OAuth
- **Protected Routes**: Secure access to all application features
- **User Profile Management**: Complete user profile with real-time data
- **Session Management**: Persistent login with automatic logout functionality

### � Documentation & Content
- **AI-Powered Generation**: Leverage advanced AI to automatically generate comprehensive documentation
- **Rich Text Editor**: Powered by TipTap with floating and bubble menus
- **Diagram Rendering**: Mermaid diagram support with multiple themes
- **Document Management**: Dashboard to organize and manage all your documents
- **Template System**: Pre-built templates for different documentation types

### 🌐 Platform & Infrastructure
- **Firebase Hosting**: Production-ready hosting with global CDN
- **Real-time Database**: Firestore integration for user data and document storage
- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript support
- **Fast Development**: Vite for lightning-fast HMR and builds

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **React Router** - Client-side routing with protected routes

### Authentication & Backend
- **Firebase Authentication** - Multi-provider authentication (Email, Google, GitHub)
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Functions** - Serverless backend functions
- **Firebase Hosting** - Production hosting with global CDN

### Rich Text & Diagrams
- **TipTap** - Headless rich text editor
- **Mermaid** - Diagram and chart rendering
- **ProseMirror** - Text editing engine

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Class Variance Authority** - Component variant management

### GitHub Integration
- **GitHub API** - Repository integration and OAuth
- **GitHub Apps** - Enhanced GitHub functionality

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting rules

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dotivra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration values
   # See Configuration section below for details
   ```

4. **Firebase Setup**
   ```bash
   # Install Firebase CLI (if not already installed)
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase (if needed)
   firebase init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and deploy to Firebase hosting
- `npm run server` - Start local backend server (development)

## ⚙️ Configuration

### Environment Variables

The application requires environment variables for Firebase, GitHub integration, and other services. Copy `.env.example` to `.env` and configure:

#### Firebase Configuration
```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

#### GitHub Integration (Optional)
```bash
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password, Google, and GitHub providers
3. Create a Firestore database
4. Add your domain to authorized domains in Authentication settings

### GitHub OAuth Setup (Optional)

1. Create a GitHub OAuth App at [GitHub Developer Settings](https://github.com/settings/developers)
2. Set Authorization callback URL to: `https://your-domain.com/__/auth/handler`
3. Add Client ID and Secret to your environment variables

## 🏗️ Project Structure

```
dotivra/
├── src/
│   ├── pages/                    # Application pages
│   │   ├── Login.tsx            # Authentication page
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Profile.tsx          # User profile page
│   │   ├── Document/            # Document-related pages
│   │   ├── AIGenerator.tsx      # AI-powered documentation generator
│   │   └── Projects.tsx         # Projects overview
│   ├── components/
│   │   ├── Layout.tsx           # Main layout with navigation
│   │   ├── ProtectedRoute.tsx   # Route protection component
│   │   ├── auth/                # Authentication components
│   │   ├── profile/             # Profile page components
│   │   ├── ui/                  # Reusable UI components
│   │   └── MermaidDiagram.tsx   # Diagram rendering
│   ├── context/
│   │   ├── AuthContext.tsx      # Authentication context
│   │   └── DocumentContext.tsx  # Document state management
│   ├── services/
│   │   └── authService.ts       # Firebase authentication service
│   ├── config/
│   │   └── firebase.ts          # Firebase configuration
│   ├── lib/                     # Utility libraries
│   ├── router.tsx               # Application routing with protection
│   └── main.tsx                 # Application entry point
├── functions/                    # Firebase Functions
├── public/                      # Static assets
├── firebase.json                # Firebase configuration
└── .env.example                 # Environment variables template
```

## 🎨 Pages & Features

### Authentication System
- **Login/Register Page**: Multi-provider authentication (Email, Google, GitHub)
- **Protected Routes**: All pages require authentication
- **User Session Management**: Persistent login with automatic session handling
- **Profile Management**: Complete user profile with provider information

### Dashboard
- **Document Overview**: Statistics and recent activity
- **Project Management**: Organization and access to documentation projects
- **Quick Actions**: Easy access to create new documents
- **Navigation**: Integrated sidebar with user information

### Profile Page
- **User Information**: Display real user data from authentication providers
- **Account Settings**: Profile customization and management
- **Provider Integration**: Shows authentication method and connected accounts
- **Security Actions**: Account management including logout functionality

### Document Editor
- **Rich Text Editing**: Full-featured editor powered by TipTap
- **AI Integration**: AI-powered content generation and suggestions
- **Diagram Support**: Mermaid diagram insertion and rendering
- **Template System**: Pre-built templates for different documentation types

### AI Generator
- **Template-based Generation**: Structured documentation creation
- **Custom Prompt Input**: Flexible AI-powered content generation
- **Content Preview**: Real-time preview of generated content
- **Export Options**: Multiple export formats and sharing capabilities

## 🔧 Development Configuration

### Vite Configuration
- React plugin for Fast Refresh
- Tailwind CSS integration
- Path aliases (`@` points to `src/`)
- Environment variable handling (VITE_ prefix)

### Firebase Configuration
- Authentication providers setup
- Firestore database rules
- Hosting configuration with SPA routing
- Functions deployment settings

### Tailwind CSS
- Version 4 with latest features
- Custom utility classes
- Responsive design utilities
- Component styling consistency

### TypeScript
- Strict type checking
- Path mapping support
- Modern ES modules
- Firebase SDK type integration

## 🔒 Security Features

- **Environment Variable Protection**: Sensitive data excluded from repository
- **Authentication Required**: All routes protected except login
- **Firebase Security Rules**: Database access control
- **HTTPS Only**: Secure connections in production
- **Session Management**: Automatic logout and session expiry

## ⚠️ Known Issues & Limitations

The following features and improvements are currently under development:

### 🎨 UI/UX Issues
- **No Header/Footer**: Application currently lacks proper header and footer components
- **Layout Inconsistencies**: Some pages may have inconsistent spacing and styling

### 🔗 GitHub Integration
- **Repository Linking**: Users cannot currently link their GitHub account repositories to the platform
- **Commit Tracking**: Unable to track commit information and repository history
- **Repository Management**: No integration with user's GitHub repositories for documentation sync

### 🗄️ Database & Backend
- **Firebase Firestore Issues**: Current database implementation has stability and performance issues
- **Data Persistence**: Some user data may not persist correctly across sessions
- **Real-time Sync**: Document synchronization between users may be unreliable

### 📝 Document Generation
- **AI Generation Limitations**: AI-powered documentation generation produces incomplete or non-useful content
- **Template System**: Limited template options and customization capabilities
- **Content Quality**: Generated content may lack proper structure and relevant information

### ✏️ Editor Issues
- **Minor Editor Bugs**: Rich text editor has occasional formatting and input handling issues
- **Performance**: Editor may lag with large documents or complex formatting
- **Auto-save**: Document auto-save functionality may be unreliable

### 📊 Diagram Support
- **Mermaid Flexibility**: Diagram rendering lacks advanced customization options
- **Theme Integration**: Limited integration with application themes and styling
- **Export Options**: Diagrams cannot be exported independently or in different formats

### 🚧 Planned Improvements
These issues are actively being addressed in upcoming releases. Contributions and feedback are welcome to help prioritize and resolve these limitations.

## 🚀 Deployment

The project is configured for Firebase hosting with automatic deployment:

### Quick Deployment
```bash
# Build and deploy in one command
npm run deploy
```

### Manual Deployment Steps

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

3. **Deploy specific services**
   ```bash
   # Deploy only hosting
   firebase deploy --only hosting
   
   # Deploy only functions
   firebase deploy --only functions
   
   # Deploy hosting and functions
   firebase deploy --only hosting,functions
   ```

### Production Environment

- **Live URL**: Automatically provided by Firebase Hosting
- **Global CDN**: Automatic content distribution
- **SSL Certificates**: Automatic HTTPS configuration
- **Custom Domains**: Configurable through Firebase Console

### CI/CD Integration

The project supports continuous deployment through:
- GitHub Actions (configurable)
- Firebase CLI integration
- Automatic builds on deploy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## � Documentation & Resources

### Framework Documentation
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Firebase Documentation
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Database](https://firebase.google.com/docs/firestore)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Firebase Functions](https://firebase.google.com/docs/functions)

### Component Libraries
- [TipTap Documentation](https://tiptap.dev/)
- [Mermaid Documentation](https://mermaid.js.org/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Lucide React Icons](https://lucide.dev/)

### Integration Guides
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Firebase Hosting Setup Guide](FIREBASE_HOSTING_GUIDE.md)
