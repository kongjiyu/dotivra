
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
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./components/AppLayout";

import Projects from "./pages/Projects"; // NEW: All projects page
import AllTemplate from "./pages/AllTemplate";
import FeedbackForm from "./pages/FeedbackForm";
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
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "/dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: "/ai-generator",
        element: <ProtectedRoute><AllTemplate /></ProtectedRoute>,
      },
      {
        path: "/github-connect",
        element: <ProtectedRoute><GithubConnect /></ProtectedRoute>,
      },
      {
        path: "/document/editor",
        element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>,
      },
      {
        path: "/document/:documentId",
        element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>,
      },
      {
        path: "/document/summary/:documentId",
        element: <ProtectedDocumentWrapper><DocumentSummary /></ProtectedDocumentWrapper>,
      },
      {
        path: "/document/project",
        element: <ProtectedDocumentWrapper><DocumentProjectList /></ProtectedDocumentWrapper>,
      },
      {
        path: "/document/project/:documentId",
        element: <ProtectedDocumentWrapper><DocumentProject /></ProtectedDocumentWrapper>,
      },
      {
        path: "/document/history/:documentId",
        element: <ProtectedDocumentWrapper><DocumentHistory /></ProtectedDocumentWrapper>,
      },
      // Redirect old /editor path to new document editor
      {
        path: "/editor",
        element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>,
      },
      {
        path: "/profile",
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
      },
      {
        path: "/project/:projectId",  // NEW: Dynamic project route
        element: <ProtectedRoute><ProjectView /></ProtectedRoute>,
      },
      {
        path: "/projects", // NEW: All projects page
        element: <ProtectedRoute><Projects /></ProtectedRoute>,
      },
      {
        path: "/templates",
        element: <ProtectedRoute><AllTemplate /></ProtectedRoute>,
      },
      {
        path: "/feedback",
        element: <ProtectedRoute><FeedbackForm /></ProtectedRoute>,
      },
      {
        path: "/gemini",
        element: <ProtectedRoute><GeminiDashboard /></ProtectedRoute>,
      },
      {
        path: "/gemini/test-balancer",
        element: <ProtectedRoute><GeminiTestBalancer /></ProtectedRoute>,
      },
      // Catch-all route for 404s
      {
        path: "*",
        element: <ErrorPage />
      }
    ],
  },
]);


export default router;