import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import {createAppAuth} from "@octokit/auth-app";
import {Octokit} from "@octokit/rest";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS configuration - Allow all origins for Firebase Functions
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Helper functions
function generateProjectId(): string {
  return "PROJ_" + Math.random().toString(36).substring(2, 15);
}

function generateUserId(): string {
  return "USER_" + Math.random().toString(36).substring(2, 15);
}

// GitHub App configuration
const getGitHubAuth = () => {
  return createAppAuth({
    appId: process.env.GITHUB_APP_ID || "",
    privateKey: (process.env.GITHUB_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  });
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
});

// Get GitHub App info and install URL
app.get("/api/github/install-url", async (req, res) => {
  try {
    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({type: "app"});
    const octokit = new Octokit({auth: auth.token});

    const {data: appData} = await octokit.rest.apps.getAuthenticated();

    res.json({
      app_name: appData.name,
      app_slug: appData.slug,
      install_url: `https://github.com/apps/${appData.slug}/installations/new`,
    });
  } catch (error) {
    logger.error("GitHub App error:", error);
    res.status(500).json({
      error: "Failed to get GitHub App info",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get user installations
app.get("/api/github/installations", async (req, res) => {
  try {
    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({type: "app"});
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.apps.listInstallations();

    const installations = data.map((installation) => ({
      id: installation.id,
      account: {
        login: installation.account?.login,
        type: installation.account?.type,
        avatar_url: installation.account?.avatar_url,
      },
      repository_selection: installation.repository_selection,
      created_at: installation.created_at,
      updated_at: installation.updated_at,
    }));

    res.json({installations});
  } catch (error) {
    logger.error("Error fetching installations:", error);
    res.status(500).json({
      error: "Failed to fetch installations",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get repositories for an installation
app.get("/api/github/repositories", async (req, res) => {
  try {
    const {installation_id} = req.query;

    if (!installation_id) {
      return res.status(400).json({error: "installation_id is required"});
    }

    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({
      type: "installation",
      installationId: installation_id as string,
    });
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.apps.listReposAccessibleToInstallation();

    const repositories = data.repositories?.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      html_url: repo.html_url,
      language: repo.language,
      updated_at: repo.updated_at,
    })) || [];

    res.json({repositories});
  } catch (error) {
    logger.error("Error fetching repositories:", error);
    res.status(500).json({
      error: "Failed to fetch repositories",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get repository contents
app.get("/api/github/repository/:owner/:repo/contents", async (req, res) => {
  try {
    const {owner, repo} = req.params;
    const {path = "", installation_id} = req.query;

    if (!installation_id) {
      return res.status(400).json({error: "installation_id is required"});
    }

    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({
      type: "installation",
      installationId: installation_id as string,
    });
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path as string || "",
    });

    res.json(data);
  } catch (error) {
    logger.error("Error fetching repository contents:", error);
    res.status(500).json({
      error: "Failed to fetch repository contents",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get file content
app.get("/api/github/repository/:owner/:repo/file", async (req, res) => {
  try {
    const {owner, repo} = req.params;
    const {path, installation_id} = req.query;

    if (!path || !installation_id) {
      return res.status(400).json({
        error: "path and installation_id are required",
      });
    }

    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({
      type: "installation",
      installationId: installation_id as string,
    });
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path as string,
    });

    if (Array.isArray(data)) {
      return res.status(400).json({error: "Path points to a directory"});
    }

    if (data.type === "file" && "content" in data && data.content) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      res.json({
        name: data.name,
        path: data.path,
        content,
        size: data.size,
        sha: data.sha,
      });
    } else {
      res.status(400).json({error: "Path does not point to a file"});
    }
  } catch (error) {
    logger.error("Error fetching file:", error);
    res.status(500).json({
      error: "Failed to fetch file",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// PROJECT MANAGEMENT ENDPOINTS (Firebase Admin)
// ============================================================================

// Create a new project
app.post("/api/projects", async (req, res) => {
  try {
    logger.info("POST /api/projects received:", req.body);
    const {name, description, githubLink, selectedRepo, installationId, userId} = req.body;

    // Validate required fields
    if (!name || !description || !userId) {
      logger.warn("Validation failed: missing required fields");
      return res.status(400).json({
        error: "Name, description, and userId are required",
      });
    }

    // Generate Project ID matching FirestoreService format
    const projectId = generateProjectId();

    // Create the project object matching FirestoreService interface
    const project = {
      Project_Id: projectId,
      ProjectName: name.trim(),
      User_Id: userId,
      Description: description.trim(),
      GitHubRepo: githubLink || "",
      Created_Time: admin.firestore.Timestamp.now(),
    };

    // Add to Firestore Projects collection
    const docRef = await db.collection("Projects").add(project);

    logger.info("Project created with ID:", projectId);

    res.status(201).json({
      success: true,
      project: {
        ...project,
        Created_Time: project.Created_Time.toDate().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error creating project:", error);
    res.status(500).json({
      error: "Failed to create project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all projects
app.get("/api/projects", async (req, res) => {
  try {
    logger.info("GET /api/projects - fetching from Firestore");

    const querySnapshot = await db.collection("Projects")
      .orderBy("Created_Time", "desc")
      .get();

    const projects = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    }));

    logger.info(`Returning ${projects.length} projects from Firestore`);

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    logger.error("Error fetching projects:", error);
    res.status(500).json({
      error: "Failed to fetch projects",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get a specific project
app.get("/api/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    logger.info("GET /api/projects/" + projectId);

    // Query by Project_Id field
    const querySnapshot = await db.collection("Projects")
      .where("Project_Id", "==", projectId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "Project not found"});
    }

    const projectDoc = querySnapshot.docs[0];
    const project = {
      ...projectDoc.data(),
      Created_Time: projectDoc.data().Created_Time?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    };

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    logger.error("Error fetching project:", error);
    res.status(500).json({
      error: "Failed to fetch project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get projects by user
app.get("/api/projects/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    logger.info("GET /api/projects/user/" + userId);

    const querySnapshot = await db.collection("Projects")
      .where("User_Id", "==", userId)
      .orderBy("Created_Time", "desc")
      .get();

    const projects = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    }));

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    logger.error("Error fetching user projects:", error);
    res.status(500).json({
      error: "Failed to fetch user projects",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update project
app.put("/api/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;

    // Find document by Project_Id
    const querySnapshot = await db.collection("Projects")
      .where("Project_Id", "==", projectId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "Project not found"});
    }

    const docRef = querySnapshot.docs[0].ref;
    await docRef.update({
      ...updates,
      Updated_Time: admin.firestore.Timestamp.now(),
    });

    res.json({
      success: true,
      message: "Project updated successfully",
    });
  } catch (error) {
    logger.error("Error updating project:", error);
    res.status(500).json({
      error: "Failed to update project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete project
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;

    // Find document by Project_Id
    const querySnapshot = await db.collection("Projects")
      .where("Project_Id", "==", projectId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "Project not found"});
    }

    const docRef = querySnapshot.docs[0].ref;
    await docRef.delete();

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting project:", error);
    res.status(500).json({
      error: "Failed to delete project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// Create user
app.post("/api/users", async (req, res) => {
  try {
    const {UserEmail, UserName, UserPw} = req.body;

    if (!UserEmail || !UserName || !UserPw) {
      return res.status(400).json({
        error: "UserEmail, UserName, and UserPw are required",
      });
    }

    // Check if user already exists
    const existingUser = await db.collection("Users")
      .where("UserEmail", "==", UserEmail)
      .get();

    if (!existingUser.empty) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    const userId = generateUserId();
    const user = {
      User_Id: userId,
      UserEmail,
      UserName,
      UserPw, // In production, hash this password!
    };

    await db.collection("Users").add(user);

    // Don't return password in response
    const {UserPw: _, ...userResponse} = user;

    res.status(201).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(500).json({
      error: "Failed to create user",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get user by email (for login)
app.get("/api/users/email/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const querySnapshot = await db.collection("Users")
      .where("UserEmail", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "User not found"});
    }

    const user = querySnapshot.docs[0].data();
    // Don't return password
    const {UserPw: _, ...userResponse} = user;

    res.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    logger.error("Error fetching user:", error);
    res.status(500).json({
      error: "Failed to fetch user",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Export the Express app as a Firebase Function
export const api = onRequest(app);
