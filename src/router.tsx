import {
    createBrowserRouter,
  } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import DocumentEditor from "./pages/DocumentEditor";
import AIGenerator from "./pages/AIGenerator";
import GithubConnect from "./pages/GithubConnect";

const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
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