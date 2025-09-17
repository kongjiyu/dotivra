// src/router.tsx - Updated router with project navigation
import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectView from "./pages/ProjectOverview";
import DocumentEditor from "./pages/DocumentEditor";
import AIGenerator from "./pages/AIGenerator";
import AuthPage from "@/components/auth/AuthPage";  


const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthPage />,
  },
  {
    path: "/dashboard", 
    element: <Dashboard />,
  },
  {
    path: "/project/:projectId",  // NEW: Dynamic project route
    element: <ProjectView />,
  },
  {
    path: "/document/:documentId", // NEW: Document editor route
    element: <DocumentEditor />,
  },
  {
    path: "/ai-generator",
    element: <AIGenerator />,
  },
]);

export default router;