
// src/router.tsx - Updated router with project navigation and authentication
import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DocumentEditor from "./pages/Document/DocumentEditor";
import GithubConnect from "./pages/GithubConnect";
import Login from "./pages/Login";
import ProjectView from "./pages/ProjectOverview";
import DocumentSummary from "@/pages/Document/DocumentSummary";
import DocumentProject from "@/pages/Document/DocumentProject";
import DocumentHistory from "@/pages/Document/DocumentHistory";
import { DocumentProvider } from "./context/DocumentContext";
import Profile from "./pages/Profile";
import FeedbackForm from "./pages/FeedbackForm";
import ProtectedRoute from "./components/ProtectedRoute";

import Projects from "./pages/Projects"; // NEW: All projects page
import AllTemplate from "./pages/AllTemplate";

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
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: "/github-connect",
    element: <ProtectedRoute><GithubConnect /></ProtectedRoute>,
  },
  {
    path: "/document/editor",
    element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>
  },
  {
    path: "/document/summary",
    element: <ProtectedDocumentWrapper><DocumentSummary /></ProtectedDocumentWrapper>
  },
  {
    path: "/document/project",
    element: <ProtectedDocumentWrapper><DocumentProject /></ProtectedDocumentWrapper>
  },
  {
    path: "/document/history",
    element: <ProtectedDocumentWrapper><DocumentHistory /></ProtectedDocumentWrapper>
  },
  // Redirect old /editor path to new document editor
  {
    path: "/editor",
    element: <ProtectedDocumentWrapper><DocumentEditor /></ProtectedDocumentWrapper>
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
  }
]);


export default router;