
// src/router.tsx - Updated router with project navigation and authentication
import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DocumentEditor from "./pages/Document/DocumentEditor";
import GithubConnect from "./pages/GithubConnect";
import Login from "./pages/Login";
import ProjectView from "./pages/ProjectOverview";
import DocumentSummary from "@/pages/Document/DocumentSummary";
import DocumentProject from "@/pages/Document/DocumentProject";
import DocumentProjectList from "@/pages/Document/DocumentProjectList";
import DocumentHistory from "@/pages/Document/DocumentHistory";
import { DocumentProvider } from "./context/DocumentContext";
import Profile from "./pages/Profile";
import FeedbackForm from "./pages/FeedbackForm";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

import Projects from "./pages/Projects"; // NEW: All projects page
import AllTemplate from "./pages/AllTemplate";
import GeminiDashboard from "./pages/gemini/geminiDashboard";
import GeminiTestBalancer from "./pages/gemini/geminiTestBalancer";

// Error page component
const ErrorPage = () => (
  <ErrorBoundary>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  </ErrorBoundary>
);

// Wrapper component for document pages that need context
const DocumentPageWrapper = ({ children }: { children: React.ReactNode }) => (
  <DocumentProvider>{children}</DocumentProvider>
);

// Wrapper component for protected document pages
const ProtectedDocumentWrapper = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DocumentPageWrapper>{children}</DocumentPageWrapper>
  </ProtectedRoute>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/ai-generator",
    element: <ProtectedRoute><AllTemplate /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/github-connect",
    element: <ProtectedRoute><GithubConnect /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/document/editor",
    element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  {
    path: "/document/:documentId",
    element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  {
    path: "/document/summary",
    element: <ProtectedDocumentWrapper><DocumentSummary /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  {
    path: "/document/project",
    element: <ProtectedDocumentWrapper><DocumentProjectList /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  {
    path: "/document/project/:documentId",
    element: <ProtectedDocumentWrapper><DocumentProject /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  {
    path: "/document/history",
    element: <ProtectedDocumentWrapper><DocumentHistory /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  // Redirect old /editor path to new document editor
  {
    path: "/editor",
    element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>,
    errorElement: <ErrorPage />
  },
  {
    path: "/profile",
    element: <ProtectedRoute><Profile /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/project/:projectId",  // NEW: Dynamic project route
    element: <ProtectedRoute><ProjectView /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/projects", // NEW: All projects page
    element: <ProtectedRoute><Projects /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/templates",
    element: <ProtectedRoute><AllTemplate /></ProtectedRoute>,
  },
  {
    path: "/feedback",
    element: <ProtectedRoute><FeedbackForm /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/gemini",
    element: <ProtectedRoute><GeminiDashboard /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "/gemini/test-balancer",
    element: <ProtectedRoute><GeminiTestBalancer /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  // Catch-all route for 404s
  {
    path: "*",
    element: <ErrorPage />
  }
]);


export default router;