
// src/router.tsx - Updated router with project navigation
import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DocumentEditor from "./pages/Document/DocumentEditor";
import AIGenerator from "./pages/AIGenerator";
import GithubConnect from "./pages/GithubConnect";
import Login from "./pages/Login";  
import DocumentSummary from "@/pages/Document/DocumentSummary";
import DocumentProject from "@/pages/Document/DocumentProject";
import DocumentHistory from "@/pages/Document/DocumentHistory";
import { DocumentProvider } from "./context/DocumentContext";

// Wrapper component for document pages that need context
const DocumentPageWrapper = ({ children }: { children: React.ReactNode }) => (
    <DocumentProvider>{children}</DocumentProvider>
);

const router = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/ai-generator",
        element: <AIGenerator />,
      },

      {
        path: "/github-connect",
        element: <GithubConnect />,
      },
    {
        path: "/document/editor",
        element: <DocumentPageWrapper><DocumentEditor /></DocumentPageWrapper>
    },
    {
        path: "/document/summary",
        element: <DocumentPageWrapper><DocumentSummary /></DocumentPageWrapper>
    },
    {
        path: "/document/project",
        element: <DocumentPageWrapper><DocumentProject /></DocumentPageWrapper>
    },
    {
        path: "/document/history",
        element: <DocumentPageWrapper><DocumentHistory /></DocumentPageWrapper>
    },
    { path: "/ai-generator", element: <AIGenerator /> },
    // Redirect old /editor path to new document editor
    {
        path: "/editor",
        element: <DocumentPageWrapper><DocumentEditor /></DocumentPageWrapper>
    },
  ]);

export default router;