// src/router.tsx - Updated router with project navigation
import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectView from "./pages/ProjectOverview";
import DocumentEditor from "./pages/DocumentEditor";
import AIGenerator from "./pages/AIGenerator";
import GithubConnect from "./pages/GithubConnect";
import Login from "./pages/Login";  


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
        path: "/editor",
        element: <DocumentEditor />,
      },
      
      {
        path: "/ai-generator",
        element: <AIGenerator />,
      },

      {
        path: "/github-connect",
        element: <GithubConnect />,
      },
    
  ]);

export default router;