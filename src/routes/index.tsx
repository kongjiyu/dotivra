import { createBrowserRouter } from "react-router-dom";
import { DocumentProvider } from "@/context/DocumentContext";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import DocumentEditor from "@/pages/Document/DocumentEditor";
import DocumentSummary from "@/pages/Document/DocumentSummary";
import DocumentProject from "@/pages/Document/DocumentProject";
import DocumentHistory from "@/pages/Document/DocumentHistory";
import AIGenerator from "@/pages/AIGenerator";

// Wrapper component for document pages that need context
const DocumentPageWrapper = ({ children }: { children: React.ReactNode }) => (
    <DocumentProvider>{children}</DocumentProvider>
);

const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "/dashboard", element: <Dashboard /> },
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
