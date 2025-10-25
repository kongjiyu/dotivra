// Load environment variables first, before any imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { createBalancerFromEnv } from './server/gemini/balancer.js';





// Import regular Firebase
import { initializeApp } from 'firebase/app';
import {
	getFirestore,
	collection,
	addDoc,
	getDocs,
	getDoc,
	query,
	where,
	orderBy,
	doc,
	updateDoc,
	deleteDoc,
	Timestamp
} from 'firebase/firestore';

const app = express();
const PORT = process.env.PORT || 3001;

// Session storage for dashboard authentication
const dashboardSessions = new Map(); // sessionId -> { createdAt, expiresAt }

// Security middleware
app.use(helmet({
	crossOriginEmbedderPolicy: false,
	contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:5173',
	credentials: true,
}));

app.use(express.json());


// Initialize Firebase (regular Firebase instead of Admin)
const firebaseConfig = {
	apiKey: process.env.VITE_FIREBASE_API_KEY,
	authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

console.log('✅ Firebase initialized successfully');


// Security middleware
app.use(helmet({
	crossOriginEmbedderPolicy: false,
	contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
	origin: [
		'http://localhost:5173',
		'http://localhost:5174',
		'https://dotivra.firebaseapp.com',
		process.env.FRONTEND_URL
	].filter(Boolean),
	credentials: true,
}));

app.use(express.json());

// GitHub App configuration
const githubAuth = createAppAuth({
	appId: process.env.GITHUB_APP_ID,
	privateKey: process.env.GITHUB_PRIVATE_KEY,
});

// Gemini balancer initialization (server-side only) with Firebase
let geminiBalancer;
try {
	geminiBalancer = createBalancerFromEnv(firestore);
	console.log(`✅ Gemini balancer initialized with ${geminiBalancer.getConfig().keyCount} keys (Firebase storage)`);
} catch (e) {
	console.warn('⚠️ Gemini balancer not initialized:', e?.message || e);
}

// Import MCP Test Routes and toolService
import { createMcpTestRoutes } from './server/routes/mcpTestRoutes.js';
import { initFirestore } from './server/services/toolService.js';
import { createGeminiWithMcp } from './server/gemini/geminiMcpIntegration.js';

// Initialize firestore in toolService
initFirestore(firestore);

// Initialize Gemini with MCP integration
let geminiWithMcp;
if (geminiBalancer) {
	try {
		geminiWithMcp = createGeminiWithMcp({
			balancer: geminiBalancer,
			firestore: firestore
		});
		console.log('✅ Gemini with MCP integration initialized');
	} catch (error) {
		console.error('❌ Failed to initialize Gemini with MCP:', error);
	}
}

// Register MCP test routes with balancer
try {
	console.log('🔧 Initializing MCP test routes...');
	const mcpTestRoutes = createMcpTestRoutes(firestore, geminiBalancer);
	app.use('/api/mcp-test', mcpTestRoutes);
	console.log('✅ MCP test routes registered at /api/mcp-test');
} catch (error) {
	console.error('❌ Failed to initialize MCP test routes:', error);
	console.error(error.stack);
}

// Utility functions - Match existing Firebase format
function generateProjectId() {
	const now = new Date();
	const dateStr = now.getFullYear().toString().slice(-2) +
		String(now.getMonth() + 1).padStart(2, '0') +
		String(now.getDate()).padStart(2, '0');
	const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
	return "P" + dateStr + sequence;
}

function generateUserId() {
	return "USER_" + Math.random().toString(36).substring(2, 15);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===================== Gemini Endpoints =====================

// Helper: Clean expired sessions
function cleanExpiredSessions() {
	const now = Date.now();
	for (const [sessionId, session] of dashboardSessions.entries()) {
		if (now > session.expiresAt) {
			dashboardSessions.delete(sessionId);
		}
	}
}

// Helper: Verify session
function verifySession(sessionId) {
	if (!sessionId) return false;
	const session = dashboardSessions.get(sessionId);
	if (!session) return false;
	if (Date.now() > session.expiresAt) {
		dashboardSessions.delete(sessionId);
		return false;
	}
	return true;
}

// Authenticate with passkey
app.post('/api/gemini/auth', (req, res) => {
	try {
		const { passkey } = req.body;
		const expectedPasskey = process.env.GEMINI_DASHBOARD_PASS;

		if (!expectedPasskey) {
			return res.status(500).json({ error: 'Dashboard passkey not configured' });
		}

		if (passkey !== expectedPasskey) {
			return res.status(401).json({ error: 'Invalid passkey' });
		}

		// Create session with 10 minute expiration
		const sessionId = crypto.randomBytes(32).toString('hex');
		const now = Date.now();
		const expiresAt = now + 10 * 60 * 1000; // 10 minutes

		dashboardSessions.set(sessionId, {
			createdAt: now,
			expiresAt: expiresAt,
		});

		// Clean expired sessions
		cleanExpiredSessions();

		console.log('✅ Dashboard session created:', sessionId.slice(0, 12), '...');

		res.json({
			sessionId,
			expiresAt: new Date(expiresAt).toISOString(),
		});
	} catch (error) {
		console.error('❌ Dashboard auth error:', error);
		res.status(500).json({ error: 'Authentication failed' });
	}
});

// Verify session endpoint
app.post('/api/gemini/verify-session', (req, res) => {
	try {
		const { sessionId } = req.body;
		const isValid = verifySession(sessionId);

		if (isValid) {
			const session = dashboardSessions.get(sessionId);
			res.json({
				valid: true,
				expiresAt: new Date(session.expiresAt).toISOString(),
			});
		} else {
			res.json({ valid: false });
		}
	} catch (error) {
		console.error('❌ Session verification error:', error);
		res.status(500).json({ error: 'Verification failed' });
	}
});

// Logout endpoint
app.post('/api/gemini/logout', (req, res) => {
	try {
		const { sessionId } = req.body;
		if (sessionId) {
			dashboardSessions.delete(sessionId);
			console.log('🔓 Dashboard session ended:', sessionId.slice(0, 12), '...');
		}
		res.json({ success: true });
	} catch (error) {
		console.error('❌ Logout error:', error);
		res.status(500).json({ error: 'Logout failed' });
	}
});

// Dashboard: usage + limits (requires authentication)
app.get('/api/gemini/dashboard', async (req, res) => {
	try {
		// Check session
		const sessionId = req.headers['x-session-id'];
		if (!verifySession(sessionId)) {
			return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
		}

		if (!geminiBalancer) {
			return res.status(503).json({ error: 'Balancer not configured' });
		}

		// Read directly from Firebase
		console.log('📊 Dashboard requested, reading from Firebase...');
		const usage = await geminiBalancer.getUsageFromFirebase();
		console.log('📊 Dashboard data retrieved:', JSON.stringify(usage, null, 2));
		res.json(usage);
	} catch (error) {
		console.error('❌ Gemini dashboard error:', error);
		res.status(500).json({ error: 'Failed to get dashboard' });
	}
});

// Generate content via balancer: central entry for Chat Agent Calls
app.post('/api/gemini/reasoning', async (req, res) => {
	try {
		console.log("🧠 Reasoning API Request received");
		const {
			prompt,
			contents,
			model = "gemini-2.5-pro",
			tools,
			systemInstruction,
			generationConfig,
			safetySettings,
			toolConfig,
		} = req.body || {};


		if (!geminiBalancer) {
			console.error("❌ geminiBalancer not initialized");
			return res.status(503).json({ error: "Balancer not configured" });
		}


		let effectiveContents = contents;
		if (!effectiveContents && typeof prompt === "string") {
			effectiveContents = [
				{
					role: "user",
					parts: [
						{
							text: `You are a reasoning AI agent. Follow this process:\n\nTHINK → PLAN → EXECUTE → REVIEW\n\nRespond using short, natural explanations for each phase, prefixed by emojis (🧠, 🧩, ⚙️, ✅).\n\nUser prompt: ${prompt}`,
						},
					],
				},
			];
		}


		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");


		const pass = new PassThrough();
		pass.pipe(res);


		const stream = await geminiBalancer.generate({
			model,
			contents: effectiveContents,
			tools,
			systemInstruction,
			generationConfig: { ...generationConfig, stream: true },
			safetySettings,
			toolConfig,
		});


		if (!stream?.raw?.stream) {
			console.error("⚠️ Model returned non-streaming response");
			pass.write(`data: ${JSON.stringify({ phase: "error", message: "Streaming not supported." })}\n\n`);
			pass.end();
			return;
		}


		// Forward Gemini stream chunks to SSE
		for await (const chunk of stream.raw.stream) {
			const text = chunk?.text?.() || chunk?.response?.text?.() || "";
			if (text.trim()) {
				// Detect reasoning phase from text prefix (🧠, 🧩, ⚙️, ✅)
				const match = text.match(/^(🧠|🧩|⚙️|✅)\s*(.*)/);
				const phase = match ? match[1] : "message";
				const message = match ? match[2] : text;
				pass.write(`data: ${JSON.stringify({ phase, message })}\n\n`);
			}
		}


		pass.write(`data: ${JSON.stringify({ phase: "done", message: "Reasoning completed." })}\n\n`);
		pass.end();
	} catch (error) {
		console.error("❌ Reasoning error:", error);
		res.write(`data: ${JSON.stringify({ phase: "error", message: error.message || "Unknown error" })}\n\n`);
		res.end();
	}

});

// Generate via balancer: central entry for all AI calls
app.post('/api/gemini/generate', async (req, res) => {
	try {
		console.log('🔵 Gemini API Request received');
		console.log('  Request body keys:', Object.keys(req.body || {}));
		console.log('  Prompt:', req.body?.prompt?.substring(0, 100) + '...');
		console.log('  Model:', req.body?.model || 'default');

		if (!geminiBalancer) {
			console.error('❌ Balancer not configured!');
			return res.status(503).json({ error: 'Balancer not configured' });
		}

		const {
			prompt,
			contents,
			model = 'gemini-2.5-pro',
			tools,
			systemInstruction,
			generationConfig,
			safetySettings,
			toolConfig,
		} = req.body || {};

		let effectiveContents = contents;
		if (!effectiveContents && typeof prompt === 'string') {
			effectiveContents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
			console.log('  Converting prompt to contents format');
		}
		if (!effectiveContents) {
			console.error('❌ Missing prompt or contents');
			return res.status(400).json({ error: 'Missing prompt or contents' });
		}

		console.log('  Calling geminiBalancer.generate with model:', model);
		const result = await geminiBalancer.generate({
			model,
			contents: effectiveContents,
			tools,
			systemInstruction,
			generationConfig,
			safetySettings,
			toolConfig,
		});

		console.log('✅ Gemini generation successful, response length:', result.text?.length || 0);
		res.json({
			ok: true,
			text: result.text,
			usage: result.usage,
			key: { idShort: result.keyIdShort },
			model,
		});
	} catch (error) {
		console.error('❌ Gemini generate error:', error);
		console.error('   Error details:', {
			message: error?.message,
			status: error?.status,
			stack: error?.stack?.substring(0, 500)
		});
		const status = error?.status || 500;
		res.status(status).json({ ok: false, error: error?.message || 'Failed to generate' });
	}
});

// Generate with MCP tool calling
app.post('/api/gemini/generate-with-tools', async (req, res) => {
	try {
		console.log('🔧 Gemini API with Tools Request received');

		if (!geminiWithMcp) {
			console.warn('⚠️ MCP not configured, falling back to regular generation');
			// Fallback to regular generation
			const {
				prompt,
				model = 'gemini-2.5-pro',
				generationConfig = {},
			} = req.body || {};

			if (!prompt) {
				return res.status(400).json({ error: 'Missing prompt' });
			}

			const result = await geminiBalancer.generate({
				model,
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig
			});

			return res.json({
				success: true,
				text: result.text,
				toolCalls: [],
				toolsUsed: 0,
				model
			});
		}

		const {
			prompt,
			documentId,
			documentContent,
			systemPrompt,
			model = 'gemini-2.0-flash-exp',
			generationConfig = {},
		} = req.body || {};

		if (!prompt) {
			return res.status(400).json({ error: 'Missing prompt' });
		}

		// Set document context if provided
		if (documentId) {
			console.log(`📄 Setting document context: ${documentId}`);
			await geminiWithMcp.setDocument(documentId);
		}

		// Build contents with user prompt
		const contents = [{
			role: 'user',
			parts: [{ text: prompt }]
		}];

		// Add system instruction if provided
		const systemInstruction = systemPrompt ? {
			parts: [{ text: systemPrompt }]
		} : undefined;

		// Generate with tools
		console.log('🤖 Generating with MCP tools...');
		const result = await geminiWithMcp.generateWithTools({
			model,
			contents,
			systemInstruction,
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: 4096,
				...generationConfig
			},
			enableMcpTools: true
		});

		console.log(`✅ Generation complete (${result.toolCalls?.length || 0} tools used)`);

		res.json({
			success: true,
			text: result.text,
			toolCalls: result.toolCalls || [],
			toolsUsed: result.toolCalls?.length || 0,
			model
		});
	} catch (error) {
		console.error('❌ Gemini generate with tools error:', error);
		res.status(500).json({
			success: false,
			error: error?.message || 'Failed to generate with tools'
		});
	}
});

// Get GitHub App info and install URL
app.get('/api/github/install-url', async (req, res) => {
	try {
		const auth = await githubAuth({ type: 'app' });
		const octokit = new Octokit({ auth: auth.token });

		const { data: app } = await octokit.rest.apps.getAuthenticated();

		res.json({
			app_name: app.name,
			app_slug: app.slug,
			install_url: `https://github.com/apps/${app.slug}/installations/new`
		});
	} catch (error) {
		console.error('GitHub App error:', error);
		res.status(500).json({
			error: 'Failed to get GitHub App info',
			details: error.message
		});
	}
});

// Get user installations
app.get('/api/github/installations', async (req, res) => {
	try {
		const auth = await githubAuth({ type: 'app' });
		const octokit = new Octokit({ auth: auth.token });

		const { data } = await octokit.rest.apps.listInstallations();

		const installations = data.map(installation => ({
			id: installation.id,
			account: {
				login: installation.account.login,
				type: installation.account.type,
				avatar_url: installation.account.avatar_url,
			},
			repository_selection: installation.repository_selection,
			created_at: installation.created_at,
			updated_at: installation.updated_at,
		}));

		res.json({ installations });
	} catch (error) {
		console.error('Error fetching installations:', error);
		res.status(500).json({
			error: 'Failed to fetch installations',
			details: error.message
		});
	}
});

// Get repositories for an installation
app.get('/api/github/repositories', async (req, res) => {
	try {
		const { installation_id } = req.query;

		if (!installation_id) {
			return res.status(400).json({ error: 'installation_id is required' });
		}

		const auth = await githubAuth({ type: 'installation', installationId: installation_id });
		const octokit = new Octokit({ auth: auth.token });

		const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();

		const repositories = data.repositories.map(repo => ({
			id: repo.id,
			name: repo.name,
			full_name: repo.full_name,
			description: repo.description,
			private: repo.private,
			html_url: repo.html_url,
			language: repo.language,
			updated_at: repo.updated_at,
		}));

		res.json({ repositories });
	} catch (error) {
		console.error('Error fetching repositories:', error);
		res.status(500).json({
			error: 'Failed to fetch repositories',
			details: error.message
		});
	}
});

// Get repository contents
app.get('/api/github/repository/:owner/:repo/contents', async (req, res) => {
	try {
		const { owner, repo } = req.params;
		const { path = '', installation_id } = req.query;

		if (!installation_id) {
			return res.status(400).json({ error: 'installation_id is required' });
		}

		const auth = await githubAuth({ type: 'installation', installationId: installation_id });
		const octokit = new Octokit({ auth: auth.token });

		const { data } = await octokit.rest.repos.getContent({
			owner,
			repo,
			path: path || '',
		});

		res.json(data);
	} catch (error) {
		console.error('Error fetching repository contents:', error);
		res.status(500).json({
			error: 'Failed to fetch repository contents',
			details: error.message
		});
	}
});

// Get file content
app.get('/api/github/repository/:owner/:repo/file', async (req, res) => {
	try {
		const { owner, repo } = req.params;
		const { path, installation_id } = req.query;

		if (!path || !installation_id) {
			return res.status(400).json({ error: 'path and installation_id are required' });
		}

		const auth = await githubAuth({ type: 'installation', installationId: installation_id });
		const octokit = new Octokit({ auth: auth.token });

		const { data } = await octokit.rest.repos.getContent({
			owner,
			repo,
			path,
		});

		if (data.type === 'file' && data.content) {
			const content = Buffer.from(data.content, 'base64').toString('utf-8');
			res.json({
				name: data.name,
				path: data.path,
				content,
				size: data.size,
				sha: data.sha,
			});
		} else {
			res.status(400).json({ error: 'Path does not point to a file' });
		}
	} catch (error) {
		console.error('Error fetching file:', error);
		res.status(500).json({
			error: 'Failed to fetch file',
			details: error.message
		});
	}
});


// TEMPLATE OPERATIONS ENDPOINTS 

// Helper function to get all templates from Firestore
async function getAllTemplates() {
	const templatesRef = collection(firestore, 'Templates');
	const snapshot = await getDocs(templatesRef);

	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));
}

// Get all templates
app.get('/api/templates', async (req, res) => {
	try {
		const templates = await getAllTemplates();
		console.log(`GET /api/templates - Returned ${templates.length} templates`);
		res.json({ templates });
	} catch (error) {
		console.error('GET /api/templates - Error:', error.message);
		res.status(500).json({
			error: 'Failed to fetch templates',
			details: error.message
		});
	}
});

// ============================================================================
// PROJECT MANAGEMENT ENDPOINTS (Updated for regular Firebase)
// ============================================================================

// Create a new project
app.post('/api/projects', async (req, res) => {
	try {
		console.log('🔥 POST /api/projects received:', req.body);
		const { name, description, githubLink, selectedRepo, installationId, userId } = req.body;

		// Validate required fields
		if (!name || !description || !userId) {
			console.log('❌ Validation failed: missing required fields');
			return res.status(400).json({ error: 'Name, description, and userId are required' });
		}

		// Generate Project ID matching FirestoreService format
		const projectId = generateProjectId();

		// Create the project object matching FirestoreService interface
		const project = {
			Project_Id: projectId,
			ProjectName: name.trim(),
			User_Id: userId,
			Description: description.trim(),
			GitHubRepo: githubLink || '',
			Created_Time: Timestamp.now() // Regular Firebase Timestamp
		};

		// Add to Firestore Projects collection
		const docRef = await addDoc(collection(firestore, 'Projects'), project);

		console.log('✅ Project created with ID:', projectId);

		res.status(201).json({
			success: true,
			project: {
				...project,
				Created_Time: project.Created_Time.toDate().toISOString()
			}
		});
	} catch (error) {
		console.error('Error creating project:', error);
		res.status(500).json({
			error: 'Failed to create project',
			details: error.message
		});
	}
});

// Get all projects
app.get('/api/projects', async (req, res) => {
	try {
		console.log('📋 GET /api/projects - fetching from Firestore');

		const q = query(collection(firestore, 'Projects'), orderBy('Created_Time', 'desc'));
		const querySnapshot = await getDocs(q);

		const projects = querySnapshot.docs.map(doc => ({
			...doc.data(),
			Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString()
		}));

		console.log('📋 Returning', projects.length, 'projects from Firestore');

		res.json({
			success: true,
			projects
		});
	} catch (error) {
		console.error('Error fetching projects:', error);
		res.status(500).json({
			error: 'Failed to fetch projects',
			details: error.message
		});
	}
});

// Get a specific project
app.get('/api/projects/:id', async (req, res) => {
	try {
		const projectId = req.params.id;
		console.log('📋 GET /api/projects/' + projectId);

		// Query by Project_Id field
		const q = query(
			collection(firestore, 'Projects'),
			where('Project_Id', '==', projectId)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return res.status(404).json({ error: 'Project not found' });
		}

		const projectDoc = querySnapshot.docs[0];
		const project = {
			...projectDoc.data(),
			Created_Time: projectDoc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString()
		};

		res.json({
			success: true,
			project
		});
	} catch (error) {
		console.error('Error fetching project:', error);
		res.status(500).json({
			error: 'Failed to fetch project',
			details: error.message
		});
	}
});

// Get projects by user
app.get('/api/projects/user/:userId', async (req, res) => {
	try {
		const userId = req.params.userId;
		console.log('📋 GET /api/projects/user/' + userId);

		const q = query(
			collection(firestore, 'Projects'),
			where('User_Id', '==', userId),
			orderBy('Created_Time', 'desc')
		);
		const querySnapshot = await getDocs(q);

		const projects = querySnapshot.docs.map(doc => ({
			...doc.data(),
			Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString()
		}));

		res.json({
			success: true,
			projects
		});
	} catch (error) {
		console.error('Error fetching user projects:', error);
		res.status(500).json({
			error: 'Failed to fetch user projects',
			details: error.message
		});
	}
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
	try {
		const projectId = req.params.id;
		const updates = req.body;

		// Find document by Project_Id
		const q = query(
			collection(firestore, 'Projects'),
			where('Project_Id', '==', projectId)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return res.status(404).json({ error: 'Project not found' });
		}

		const docRef = querySnapshot.docs[0].ref;
		await updateDoc(docRef, {
			...updates,
			Updated_Time: Timestamp.now()
		});

		res.json({
			success: true,
			message: 'Project updated successfully'
		});
	} catch (error) {
		console.error('Error updating project:', error);
		res.status(500).json({
			error: 'Failed to update project',
			details: error.message
		});
	}
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
	try {
		const projectId = req.params.id;

		// Find document by Project_Id
		const q = query(
			collection(firestore, 'Projects'),
			where('Project_Id', '==', projectId)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return res.status(404).json({ error: 'Project not found' });
		}

		const docRef = querySnapshot.docs[0].ref;
		await deleteDoc(docRef);

		res.json({
			success: true,
			message: 'Project deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting project:', error);
		res.status(500).json({
			error: 'Failed to delete project',
			details: error.message
		});
	}
});

// ============================================================================
// DOCUMENTS MANAGEMENT ENDPOINTS
// ============================================================================

// Create document
app.post('/api/documents', async (req, res) => {
	try {
		console.log('🔥 POST /api/documents received:', req.body);
		const {
			DocumentName,
			DocumentType,
			DocumentCategory,
			Project_Id,
			Template_Id,
			User_Id,
			Content,
			IsDraft
		} = req.body;

		// Validate required fields
		if (!DocumentName || !DocumentType || !DocumentCategory || !Project_Id || !User_Id) {
			console.log('❌ Document validation failed: missing required fields');
			return res.status(400).json({
				error: 'DocumentName, DocumentType, DocumentCategory, Project_Id, and User_Id are required',
				received: {
					DocumentName: !!DocumentName,
					DocumentType: !!DocumentType,
					DocumentCategory: !!DocumentCategory,
					Project_Id: !!Project_Id,
					User_Id: !!User_Id
				}
			});
		}

		console.log('✅ Document validation passed, creating document...');

		// Create the document object
		const document = {
			DocumentName: DocumentName.trim(),
			DocumentType: DocumentType.trim(),
			DocumentCategory: DocumentCategory,
			Project_Id: Project_Id,
			Template_Id: Template_Id || null,
			User_Id: User_Id,
			Content: Content || '',
			Created_Time: Timestamp.now(),
			Updated_Time: Timestamp.now(),
			IsDraft: IsDraft !== undefined ? IsDraft : true,
			EditedBy: User_Id,
			Hash: null // Will be calculated when content is saved
		};

		console.log('Creating document in Firestore:', document);

		// Add to Firestore Documents collection
		const docRef = await addDoc(collection(firestore, 'Documents'), document);

		console.log('✅ Document created with Firestore ID:', docRef.id);

		const responseDocument = {
			...document,
			id: docRef.id, // Add Firestore document ID
			Created_Time: document.Created_Time.toDate().toISOString(),
			Updated_Time: document.Updated_Time.toDate().toISOString()
		};

		console.log('Sending document response:', responseDocument);

		res.status(201).json({
			success: true,
			document: responseDocument
		});
	} catch (error) {
		console.error('❌ Error creating document:', error);
		console.error('Error stack:', error.stack);
		res.status(500).json({
			error: 'Failed to create document',
			details: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
});

// Get documents for a project
app.get('/api/documents/project/:projectId', async (req, res) => {
	try {
		const projectId = req.params.projectId;
		console.log('📋 GET /api/documents/project/' + projectId);

		const q = query(
			collection(firestore, 'Documents'),
			where('Project_Id', '==', projectId)
		);
		const querySnapshot = await getDocs(q);

		const documents = querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
			Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString(),
			Updated_Time: doc.data().Updated_Time?.toDate?.()?.toISOString() || new Date().toISOString()
		}));

		console.log('📋 Returning', documents.length, 'documents for project', projectId);

		res.json({
			success: true,
			documents
		});
	} catch (error) {
		console.error('Error fetching project documents:', error);
		res.status(500).json({
			error: 'Failed to fetch project documents',
			details: error.message
		});
	}
});

// Get single document by ID
app.get('/api/documents/:documentId', async (req, res) => {
	try {
		const documentId = req.params.documentId;
		console.log('📄 GET /api/documents/' + documentId);

		const docRef = doc(firestore, 'Documents', documentId);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			console.log('❌ Document not found:', documentId);
			return res.status(404).json({
				success: false,
				error: 'Document not found'
			});
		}

		const document = {
			id: docSnap.id,
			...docSnap.data(),
			Created_Time: docSnap.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString(),
			Updated_Time: docSnap.data().Updated_Time?.toDate?.()?.toISOString() || new Date().toISOString()
		};

		console.log('📄 Returning document:', document.DocumentName);

		res.json({
			success: true,
			document
		});
	} catch (error) {
		console.error('Error fetching document:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch document',
			details: error.message
		});
	}
});

// Update document by ID
app.put('/api/documents/:documentId', async (req, res) => {
	try {
		const documentId = req.params.documentId;
		const updateData = req.body;
		console.log('📝 PUT /api/documents/' + documentId, 'Updates:', Object.keys(updateData));

		// Add timestamp for update
		updateData.Updated_Time = Timestamp.now();

		const docRef = doc(firestore, 'Documents', documentId);
		await updateDoc(docRef, updateData);

		console.log('📝 Document updated successfully');

		res.json({
			success: true,
			message: 'Document updated successfully'
		});
	} catch (error) {
		console.error('Error updating document:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update document',
			details: error.message
		});
	}
});

// Delete document
app.delete('/api/documents/:documentId', async (req, res) => {
	try {
		const documentId = req.params.documentId;
		console.log('🗑️ DELETE /api/documents/' + documentId);

		// Delete the document from Firestore
		const docRef = doc(firestore, 'Documents', documentId);
		await deleteDoc(docRef);

		console.log('✅ Document deleted successfully:', documentId);

		res.json({
			success: true,
			message: 'Document deleted successfully',
			documentId
		});
	} catch (error) {
		console.error('❌ Error deleting document:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete document',
			details: error.message
		});
	}
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// Create user
app.post('/api/users', async (req, res) => {
	try {
		const { UserEmail, UserName, UserPw } = req.body;

		if (!UserEmail || !UserName || !UserPw) {
			return res.status(400).json({ error: 'UserEmail, UserName, and UserPw are required' });
		}

		// Check if user already exists
		const q = query(
			collection(firestore, 'Users'),
			where('UserEmail', '==', UserEmail)
		);
		const existingUser = await getDocs(q);

		if (!existingUser.empty) {
			return res.status(409).json({ error: 'User with this email already exists' });
		}

		const userId = generateUserId();
		const user = {
			User_Id: userId,
			UserEmail,
			UserName,
			UserPw // In production, hash this password!
		};

		await addDoc(collection(firestore, 'Users'), user);

		// Don't return password in response
		const { UserPw: _, ...userResponse } = user;

		res.status(201).json({
			success: true,
			user: userResponse
		});
	} catch (error) {
		console.error('Error creating user:', error);
		res.status(500).json({
			error: 'Failed to create user',
			details: error.message
		});
	}
});

// Get user by email (for login)
app.get('/api/users/email/:email', async (req, res) => {
	try {
		const email = req.params.email;

		const q = query(
			collection(firestore, 'Users'),
			where('UserEmail', '==', email)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return res.status(404).json({ error: 'User not found' });
		}

		const user = querySnapshot.docs[0].data();
		// Don't return password
		const { UserPw: _, ...userResponse } = user;

		res.json({
			success: true,
			user: userResponse
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({
			error: 'Failed to fetch user',
			details: error.message
		});
	}
});

// ============================================================================
// PROFILE MANAGEMENT ENDPOINTS
// ============================================================================

// Edit user profile
app.put('/api/profile/edit', async (req, res) => {
	try {
		console.log('✏️ PUT /api/profile/edit received:', req.body);
		const { userId, UserName, UserEmail, currentPassword, newPassword } = req.body;

		// Validate required fields
		if (!userId) {
			return res.status(400).json({ error: 'userId is required' });
		}

		// Find the user by User_Id
		const q = query(
			collection(firestore, 'Users'),
			where('User_Id', '==', userId)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return res.status(404).json({ error: 'User not found' });
		}

		const userDoc = querySnapshot.docs[0];
		const userData = userDoc.data();

		// If password is being changed, verify current password
		if (newPassword && currentPassword) {
			if (userData.UserPw !== currentPassword) {
				return res.status(401).json({ error: 'Current password is incorrect' });
			}
		}

		// Prepare update data
		const updateData = {};
		if (UserName) updateData.UserName = UserName;
		if (UserEmail) updateData.UserEmail = UserEmail;
		if (newPassword) updateData.UserPw = newPassword; // In production, hash this!

		// Update the user document
		await updateDoc(doc(firestore, 'Users', userDoc.id), updateData);

		// Return updated user data (without password)
		const updatedUser = { ...userData, ...updateData };
		const { UserPw: _, ...userResponse } = updatedUser;

		console.log('✅ Profile updated successfully for user:', userId);
		res.json({
			success: true,
			message: 'Profile updated successfully',
			user: userResponse
		});
	} catch (error) {
		console.error('❌ Error updating profile:', error);
		res.status(500).json({
			error: 'Failed to update profile',
			details: error.message
		});
	}
});

// Delete user profile
app.delete('/api/profile/delete', async (req, res) => {
	try {
		console.log('🗑️ DELETE /api/profile/delete received:', req.body);
		const { userId, password } = req.body;

		// Validate required fields
		if (!userId || !password) {
			return res.status(400).json({ error: 'userId and password are required' });
		}

		// Find the user by User_Id
		const q = query(
			collection(firestore, 'Users'),
			where('User_Id', '==', userId)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return res.status(404).json({ error: 'User not found' });
		}

		const userDoc = querySnapshot.docs[0];
		const userData = userDoc.data();

		// Verify password before deletion
		if (userData.UserPw !== password) {
			return res.status(401).json({ error: 'Incorrect password. Cannot delete profile.' });
		}

		// Delete the user document
		await deleteDoc(doc(firestore, 'Users', userDoc.id));

		console.log('✅ Profile deleted successfully for user:', userId);
		res.json({
			success: true,
			message: 'Profile deleted successfully'
		});
	} catch (error) {
		console.error('❌ Error deleting profile:', error);
		res.status(500).json({
			error: 'Failed to delete profile',
			details: error.message
		});
	}
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Server error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server for WebSocket upgrade support
const server = http.createServer(app);

// Start server
server.listen(PORT, async () => {
	console.log(`🚀 GitHub Server running on port ${PORT}`);
	console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
	console.log(`🔑 GitHub App ID: ${process.env.GITHUB_APP_ID}`);
	console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
	console.log(`🔌 WebSocket server ready for connections`);


});

/* ------------------ Utility ------------------ */
function hashJSON(obj) {
	return "sha256:" + crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

/* ------------------ Document APIs ------------------ */

// ✅ Get all documents for a project
app.get("/api/project/:projectId/documents", async (req, res) => {
	try {
		const { projectId } = req.params;
		const docsRef = firestore.collection("Document");
		const snapshot = await docsRef.where("ProjectID", "==", projectId).get();

		const documents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
		res.json({ documents });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Get single document
app.get("/api/document/editor/content/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const docSnap = await firestore.collection("Document").doc(docId).get();

		if (!docSnap.exists) return res.status(404).json({ error: "NOT_FOUND" });
		res.json({ id: docSnap.id, ...docSnap.data() });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Update document content
app.put("/api/document/editor/content/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const { content, isDraft } = req.body;

		await firestore.collection("Document").doc(docId).update({
			Content: content,
			IsDraft: isDraft,
			UpdatedAt: new Date().toISOString(),
			Hash: hashJSON(content),
		});

		res.json({ status: "ok" });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Delete document (and related history + chat)
app.delete("/api/document/:docId", async (req, res) => {
	try {
		const { docId } = req.params;

		await firestore.collection("Document").doc(docId).delete();

		// cleanup related records
		const batch = firestore.batch();

		const chatSnap = await firestore.collection("ChatHistory").where("DocID", "==", docId).get();
		chatSnap.forEach((d) => batch.delete(d.ref));

		const histSnap = await firestore.collection("DocumentHistory").where("DocID", "==", docId).get();
		histSnap.forEach((d) => batch.delete(d.ref));

		await batch.commit();

		res.json({ status: "deleted", docId });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Document version history
app.get("/api/document/editor/history/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		console.log('📜 Fetching version history for document:', docId);

		const historyRef = collection(firestore, "DocumentHistory");

		// DEBUG: Get ALL documents in the collection to see what's there
		const allSnapshot = await getDocs(historyRef);
		console.log('🔍 Total documents in DocumentHistory collection:', allSnapshot.docs.length);
		allSnapshot.docs.forEach(doc => {
			const data = doc.data();
			console.log('  📄 Doc ID:', doc.id);
			console.log('     Document_Id:', data.Document_Id);
			console.log('     Version:', data.Version);
			console.log('     Content preview:', (data.Content || '').substring(0, 50));
		});

		// Now try the filtered query
		const q = query(historyRef, where("Document_Id", "==", docId), orderBy("Version", "desc"));
		const snapshot = await getDocs(q);

		console.log('📊 Found', snapshot.docs.length, 'versions matching docId:', docId);
		const versions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
		res.json({ versions });
	} catch (err) {
		console.error('❌ Error fetching version history:', err.message);
		console.error('Full error:', err);
		res.status(500).json({ error: "SERVER_ERROR", details: err.message });
	}
});

// ✅ Latest summary (assistant reply)
app.get("/api/document/editor/summary/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const chatRef = firestore.collection("ChatHistory");
		const snapshot = await chatRef
			.where("DocID", "==", docId)
			.where("Role", "==", "assistant")
			.orderBy("CreatedAt", "desc")
			.limit(1)
			.get();

		if (snapshot.empty) return res.json({ summary: null });

		const summary = snapshot.docs[0].data();
		res.json({ summary: summary.Message });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

/* ------------------ Chat APIs ------------------ */

// ✅ Get normal chat history
app.get("/api/document/chat/history/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const chatsRef = firestore.collection("ChatHistory");
		const snapshot = await chatsRef.where("DocID", "==", docId).orderBy("CreatedAt", "asc").get();

		const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
		res.json({ messages });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Add chat message (user/assistant)
app.post("/api/document/chat/prompt", async (req, res) => {
	try {
		const { userId, docId, message, role } = req.body;

		const newMsg = {
			UserID: userId || null,
			DocID: docId,
			Message: message,
			Role: role || "user", // 'user' or 'assistant'
			CreatedAt: new Date().toISOString(),
		};

		const ref = await firestore.collection("ChatHistory").add(newMsg);
		res.status(201).json({ id: ref.id, ...newMsg });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

/* ------------------ AI Agent Workflow ------------------ */

// ✅ Get workflow messages (reasoning → thinking → action)
app.get("/api/document/chat/agent/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const chatsRef = firestore.collection("ChatHistory");
		const snapshot = await chatsRef
			.where("DocID", "==", docId)
			.orderBy("CreatedAt", "asc")
			.get();

		const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
		res.json({ workflow: messages });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Add AI agent step
app.post("/api/document/chat/agent", async (req, res) => {
	try {
		const { docId, stage, message, userId } = req.body;

		if (!["reasoning", "thinking", "action", "user"].includes(stage)) {
			return res.status(400).json({ error: "INVALID_STAGE" });
		}

		const newMsg = {
			UserID: userId || null,
			DocID: docId,
			Stage: stage, // reasoning | thinking | action | user
			Message: message,
			Role: stage === "user" ? "user" : "assistant",
			CreatedAt: new Date().toISOString(),
		};

		const ref = await firestore.collection("ChatHistory").add(newMsg);

		// auto-log Action step to DocumentHistory
		if (stage === "action") {
			await firestore.collection("DocumentHistory").add({
				DocID: docId,
				ActionID: ref.id,
				Content: message,
				CreatedAt: new Date().toISOString(),
				Version: Date.now(), // naive version tracking
			});
		}

		res.status(201).json({ id: ref.id, ...newMsg });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

// ✅ Get latest Action only
app.get("/api/document/chat/agent/action/:docId", async (req, res) => {
	try {
		const { docId } = req.params;
		const snapshot = await firestore.collection("ChatHistory")
			.where("DocID", "==", docId)
			.where("Stage", "==", "action")
			.orderBy("CreatedAt", "desc")
			.limit(1)
			.get();

		if (snapshot.empty) return res.json({ action: null });

		const action = snapshot.docs[0].data();
		res.json({ action });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR" });
	}
});

/* ------------------ GitHub OAuth ------------------ */
// GitHub OAuth token exchange endpoint
app.post('/api/github/oauth/token', async (req, res) => {
	try {
		const { code, client_id, redirect_uri } = req.body;

		if (!code || !client_id) {
			return res.status(400).json({ error: 'Missing required parameters' });
		}

		// Use client secret from server environment variables for security
		const client_secret = process.env.GITHUB_CLIENT_SECRET;
		if (!client_secret) {
			return res.status(500).json({ error: 'Server configuration error' });
		}

		// Exchange code for access token with GitHub
		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': 'Dotivra-App'
			},
			body: JSON.stringify({
				client_id,
				client_secret,
				code,
				redirect_uri
			})
		});

		if (!tokenResponse.ok) {
			throw new Error(`GitHub API error: ${tokenResponse.status}`);
		}

		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			return res.status(400).json({
				error: tokenData.error,
				error_description: tokenData.error_description
			});
		}

		// Return the token data
		res.json(tokenData);
	} catch (error) {
		console.error('GitHub OAuth error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: error.message
		});
	}
});

// GitHub API proxy endpoint for authenticated requests
app.get('/api/github/user/repos', async (req, res) => {
	try {
		const authorization = req.headers.authorization;
		if (!authorization) {
			return res.status(401).json({ error: 'Authorization header required' });
		}

		const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
			headers: {
				'Authorization': authorization,
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Dotivra-App'
			}
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const repos = await response.json();
		res.json(repos);
	} catch (error) {
		console.error('GitHub repos fetch error:', error);
		res.status(500).json({
			error: 'Failed to fetch repositories',
			message: error.message
		});
	}
});

// GitHub repository contents endpoint
app.get('/api/github/repos/:owner/:repo/contents/*', async (req, res) => {
	try {
		const { owner, repo } = req.params;
		const path = req.params[0] || '';
		const authorization = req.headers.authorization;

		if (!authorization) {
			return res.status(401).json({ error: 'Authorization header required' });
		}

		const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
		const response = await fetch(url, {
			headers: {
				'Authorization': authorization,
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Dotivra-App'
			}
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const contents = await response.json();
		res.json(contents);
	} catch (error) {
		console.error('GitHub contents fetch error:', error);
		res.status(500).json({
			error: 'Failed to fetch repository contents',
			message: error.message
		});
	}
});

/* ------------------ Link Preview API ------------------ */
app.get('/api/link-preview', async (req, res) => {
	try {
		const { url } = req.query;

		if (!url) {
			return res.status(400).json({ error: 'URL parameter is required' });
		}

		// Validate URL
		let validUrl;
		try {
			validUrl = new URL(url);
			if (!['http:', 'https:'].includes(validUrl.protocol)) {
				return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
			}
		} catch {
			return res.status(400).json({ error: 'Invalid URL format' });
		}

		// Fetch webpage
		const response = await fetch(validUrl.href, {
			method: 'GET',
			headers: {
				'User-Agent': 'Dotivra-Bot/1.0 (+https://dotivra.com)',
				'Accept': 'text/html,application/xhtml+xml',
				'Accept-Language': 'en-US,en;q=0.9',
			},
			timeout: 10000, // 10 second timeout
			redirect: 'follow',
			size: 1024 * 1024, // 1MB limit
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get('content-type') || '';
		if (!contentType.includes('text/html')) {
			return res.json({
				url: validUrl.href,
				title: validUrl.hostname,
				error: 'Content is not HTML'
			});
		}

		const html = await response.text();

		// Parse HTML using a simple regex approach (for production, consider using a proper HTML parser)
		const metadata = {
			url: validUrl.href,
			title: extractMetaContent(html, /<title[^>]*>([^<]+)<\/title>/i) ||
				extractMetaContent(html, /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
				validUrl.hostname,
			description: extractMetaContent(html, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
				extractMetaContent(html, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i),
			image: extractMetaContent(html, /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i),
			siteName: extractMetaContent(html, /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i),
			favicon: `${validUrl.protocol}//${validUrl.hostname}/favicon.ico`
		};

		// Clean up the title (remove extra whitespace and decode HTML entities)
		if (metadata.title) {
			metadata.title = metadata.title.trim().replace(/\s+/g, ' ')
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>');
		}

		// Limit description length
		if (metadata.description && metadata.description.length > 200) {
			metadata.description = metadata.description.substring(0, 200) + '...';
		}

		res.json(metadata);
	} catch (error) {
		console.error('Link preview error:', error);

		// Return partial metadata even on error
		const urlObj = req.query.url ? new URL(req.query.url) : null;
		res.json({
			url: req.query.url,
			title: urlObj ? urlObj.hostname : 'Unknown',
			error: error.message || 'Failed to fetch preview'
		});
	}
});

// Helper function to extract meta content using regex
function extractMetaContent(html, regex) {
	const match = html.match(regex);
	return match ? match[1].trim() : null;
}

/* ------------------ Document Agent with Gemini Pro 2.5 ------------------ */
app.post('/api/document-agent/chat', async (req, res) => {
	try {
		const { prompt, context, documentId } = req.body;

		if (!prompt || !context) {
			return res.status(400).json({ error: 'Prompt and context are required' });
		}

		if (!geminiBalancer) {
			return res.status(503).json({ error: 'Gemini service not available' });
		}

		// Set current document for MCP tools
		if (documentId) {
			try {
				await setCurrentDocument(documentId);
				console.log(`📄 Current document set for MCP tools: ${documentId}`);
			} catch (error) {
				console.warn('⚠️ Failed to set current document:', error.message);
			}
		}

		// Set headers for Server-Sent Events (SSE)
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');

		// Build system instruction for the agent
		const systemInstruction = `You are an intelligent document editing assistant with access to MCP (Model Context Protocol) tools. You help users write, edit, and improve their documents.

IMPORTANT: You work with the USER'S DOCUMENT CONTENT, not code repositories or technical files.

Available Tools:
1. **append** - Add new content to the end of the document
2. **insert** - Insert content at a specific character position
3. **replace** - Replace text in a specific range with new content
4. **delete** - Remove text in a specific range
5. **read** - Read and analyze without making changes

Response format (JSON only):
{
  "reasoning": "Explain your analysis and what you plan to do",
  "actions": [
    {
      "type": "append|insert|replace|delete|read",
      "content": "text content",
      "position": number OR {from: number, to: number},
      "reason": "why this change"
    }
  ]
}

Guidelines:
- Think step by step and explain your reasoning
- Use character positions precisely
- Match the user's writing style and tone
- Be creative for creative writing; be professional for formal writing`;

		// Build the prompt with context
		const fullPrompt = `Document context:
- Full content: ${context.documentContent || '(empty document)'}
- Selected text: ${context.selectedText || '(no selection)'}
- Selection range: ${context.selectionRange ? `${context.selectionRange.from} to ${context.selectionRange.to}` : '(no selection)'}
- Document length: ${context.documentLength} characters
- Cursor at: ${context.cursorPosition}

User request: ${prompt}

Think through this step by step, explain your reasoning, then provide the JSON response.`;

		// Call Gemini API with streaming enabled
		const { stream, keyIdShort } = await geminiBalancer.generateStream({
			model: 'gemini-2.5-pro',
			contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
			systemInstruction: { parts: [{ text: systemInstruction }] },
			generationConfig: {
				temperature: 0.7,
				topP: 0.95,
				topK: 40,
				maxOutputTokens: 4096,
			},
			useMcpTools: true,
		});

		console.log(`🤖 Streaming document agent response using key: ${keyIdShort}`);

		let fullText = '';

		// Stream the response
		for await (const chunk of stream) {
			const chunkText = chunk.text;
			if (chunkText) {
				fullText += chunkText;

				// Send chunk as SSE event
				res.write(`data: ${JSON.stringify({
					type: 'chunk',
					text: chunkText,
					timestamp: Date.now()
				})}\n\n`);
			}
		}

		// Parse final response to extract JSON
		let agentResponse;
		try {
			const jsonMatch = fullText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				agentResponse = JSON.parse(jsonMatch[0]);
			} else {
				agentResponse = {
					reasoning: fullText,
					actions: []
				};
			}
		} catch (parseError) {
			console.error('Error parsing agent response:', parseError);
			agentResponse = {
				reasoning: fullText,
				actions: [],
				rawResponse: fullText
			};
		}

		// Send final response
		res.write(`data: ${JSON.stringify({
			type: 'done',
			response: agentResponse,
			fullText: fullText,
			timestamp: Date.now()
		})}\n\n`);

		res.end();
	} catch (error) {
		console.error('Document agent error:', error);

		// Try to send error as SSE if headers not sent yet
		if (!res.headersSent) {
			res.setHeader('Content-Type', 'text/event-stream');
		}

		res.write(`data: ${JSON.stringify({
			type: 'error',
			error: 'Agent processing failed',
			details: error.message,
			timestamp: Date.now()
		})}\n\n`);

		res.end();
	}
});

// Test endpoint for MCP tool integration
app.post('/api/test-mcp', async (req, res) => {
	try {
		const { prompt } = req.body;

		if (!prompt) {
			return res.status(400).json({ error: 'Prompt is required' });
		}

		if (!geminiBalancer) {
			return res.status(503).json({ error: 'Gemini service not available' });
		}

		console.log('🧪 Testing MCP integration with prompt:', prompt);

		const response = await geminiBalancer.generate({
			model: 'gemini-2.5-pro',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			systemInstruction: {
				parts: [{ text: 'You are a helpful assistant with access to document manipulation tools. Use the available tools when needed to help users.' }]
			},
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: 1024,
			},
			useMcpTools: true,
		});

		console.log('✅ MCP test response:', {
			text: response.text?.substring(0, 200),
			hasRaw: !!response.raw,
			keyId: response.keyIdShort
		});

		res.json({
			success: true,
			response: response.text,
			usage: response.usage,
			keyId: response.keyIdShort,
		});
	} catch (error) {
		console.error('❌ MCP test error:', error);
		res.status(500).json({
			error: 'MCP test failed',
			details: error.message,
			stack: error.stack
		});
	}
});

// ========================================
// TOOL USAGE TRACKING ENDPOINTS
// ========================================

// Import tool service functions
import { getToolUsageLog, clearToolUsageLog, setCurrentDocument } from './server/services/toolService.js';

// Get tool usage log
app.get('/api/tool-usage', async (req, res) => {
	try {
		const log = getToolUsageLog();
		res.json({
			success: true,
			log,
			count: log.length
		});
	} catch (error) {
		console.error('❌ Error fetching tool usage:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch tool usage',
			details: error.message
		});
	}
});

// Clear tool usage log
app.post('/api/tool-usage/clear', async (req, res) => {
	try {
		clearToolUsageLog();
		res.json({
			success: true,
			message: 'Tool usage log cleared'
		});
	} catch (error) {
		console.error('❌ Error clearing tool usage:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to clear tool usage',
			details: error.message
		});
	}
});

// Set current document for MCP tools
app.post('/api/document-agent/set-document', async (req, res) => {
	try {
		const { documentId } = req.body;

		if (!documentId) {
			return res.status(400).json({
				success: false,
				error: 'documentId is required'
			});
		}

		const result = await setCurrentDocument(documentId);

		res.json({
			success: true,
			...result
		});
	} catch (error) {
		console.error('❌ Error setting current document:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to set current document',
			details: error.message
		});
	}
});

/* ------------------ WebSocket ------------------ */
const wss = new WebSocketServer({ noServer: true });

// Store document rooms: documentId -> Set<WebSocket>
const documentRooms = new Map();

wss.on("connection", (ws) => {
	console.log("Client connected ✅");
	let currentDocumentId = null;

	ws.on("message", async (msg) => {
		try {
			const data = JSON.parse(msg.toString());
			console.log("Received:", data.type, data.documentId);

			switch (data.type) {
				case 'join':
					// Join document room
					currentDocumentId = data.documentId;
					if (!documentRooms.has(currentDocumentId)) {
						documentRooms.set(currentDocumentId, new Set());
					}
					documentRooms.get(currentDocumentId).add(ws);
					console.log(`📄 Client joined document: ${currentDocumentId}`);
					ws.send(JSON.stringify({ type: 'joined', documentId: currentDocumentId }));
					break;

				case 'sync_request':
					// Client requesting current document state (for reconnection)
					try {
						const syncDocId = data.documentId;
						const syncChannel = data.channel; // 'content' or 'summary'
						const docRef = doc(firestore, 'Documents', syncDocId);
						const docSnap = await getDoc(docRef);

						if (docSnap.exists()) {
							const docData = docSnap.data();

							// Ensure Summary field exists, add if missing
							if (!docData.Summary) {
								await updateDoc(docRef, { Summary: '' });
								console.log(`➕ Added missing Summary field to document: ${syncDocId}`);
							}

							// Send appropriate content based on channel
							let content = '';
							if (syncChannel === 'summary') {
								content = docData.Summary || '';
							} else {
								content = docData.Content || '';
							}

							ws.send(JSON.stringify({
								type: 'sync_response',
								documentId: syncDocId,
								content: content,
								version: docData.version || 0,
								channel: syncChannel,
							}));
							console.log(`🔄 Sync response sent for document: ${syncDocId}, channel: ${syncChannel}, version: ${docData.version || 0}`);
						} else {
							ws.send(JSON.stringify({
								type: 'error',
								message: 'Document not found',
								documentId: syncDocId
							}));
						}
					} catch (error) {
						console.error('Error handling sync_request:', error);
						ws.send(JSON.stringify({
							type: 'error',
							message: 'Failed to sync document',
							documentId: data.documentId
						}));
					}
					break;

				case 'edit':
					// OT protocol: Handle edit with version checking
					const { documentId: editDocId, content: editContent, baseVersion, seq, channel: editChannel } = data;
					const editIsSummary = editChannel === 'summary';

					console.log(`📝 Processing edit. DocId: ${editDocId}, Seq: ${seq}, BaseVersion: ${baseVersion}, Channel: ${editChannel}`);

					try {
						const docRef = doc(firestore, 'Documents', editDocId);
						const docSnap = await getDoc(docRef);

						if (!docSnap.exists()) {
							console.error(`❌ Document not found: ${editDocId}`);
							ws.send(JSON.stringify({
								type: 'error',
								message: 'Document not found',
								documentId: editDocId
							}));
							break;
						}

						const docData = docSnap.data();
						const currentVersion = docData.version || 0;

						// Ensure Summary field exists if we're editing summary
						if (editIsSummary && !docData.Summary) {
							await updateDoc(docRef, { Summary: '' });
							console.log(`➕ Added missing Summary field to document: ${editDocId}`);
						}

						console.log(`📊 Current document version: ${currentVersion}, Incoming baseVersion: ${baseVersion}`);

						// Check if baseVersion matches current version
						if (baseVersion !== currentVersion) {
							// Reject stale edit
							console.log(`⚠️ Rejecting stale edit. Base: ${baseVersion}, Current: ${currentVersion}`);
							ws.send(JSON.stringify({
								type: 'reject',
								documentId: editDocId,
								seq,
								currentVersion,
								reason: 'stale_base_version'
							}));
							break;
						}

						// Version matches, apply edit
						const newVersion = currentVersion + 1;
						const updateData = {
							Updated_Time: Timestamp.now(),
							version: newVersion
						};

						if (editIsSummary) {
							updateData.Summary = editContent;
							console.log(`💾 Updating Summary field (channel: ${editChannel})`);
						} else {
							updateData.Content = editContent;
							console.log(`💾 Updating Content field (channel: ${editChannel})`);
						}

						console.log(`🔄 Saving to Firestore...`);
						await updateDoc(docRef, updateData);
						console.log(`💾 Firestore updated successfully`);

						// Send acknowledgment to sender
						const ackMessage = {
							type: 'ack',
							documentId: editDocId,
							seq,
							newVersion,
							channel: editChannel // Include channel in response
						};
						console.log(`📤 Sending ACK:`, ackMessage);
						ws.send(JSON.stringify(ackMessage));

						console.log(`✅ Edit applied. Seq: ${seq}, New version: ${newVersion}, Channel: ${editChannel}`);

						// Broadcast to other clients in the same document room (same channel only)
						if (documentRooms.has(editDocId)) {
							const clients = documentRooms.get(editDocId);
							clients.forEach(client => {
								if (client !== ws && client.readyState === client.OPEN) {
									client.send(JSON.stringify({
										type: 'update',
										documentId: editDocId,
										content: editContent,
										version: newVersion,
										channel: editChannel // Include channel so clients know which field updated
									}));
								}
							});
						}
					} catch (error) {
						console.error('Error handling edit:', error);
						ws.send(JSON.stringify({
							type: 'error',
							message: 'Failed to save edit',
							documentId: editDocId,
							seq
						}));
					}
					break;

				case 'update':
					// Legacy: Save document update and broadcast to other clients (for backward compatibility)
					const { documentId, content, isSummary } = data;

					try {
						// Save to Firestore
						const docRef = doc(firestore, 'Documents', documentId);
						const docSnap = await getDoc(docRef);
						const currentVersion = docSnap.exists() ? (docSnap.data().version || 0) : 0;
						const newVersion = currentVersion + 1;

						const updateData = {
							Updated_Time: Timestamp.now(),
							version: newVersion
						};

						if (isSummary) {
							updateData.Summary = content;
						} else {
							updateData.Content = content;
						}

						await updateDoc(docRef, updateData);

						// Send acknowledgment to sender
						ws.send(JSON.stringify({
							type: 'synced',
							documentId
						}));

						// Broadcast to other clients in the same document room
						if (documentRooms.has(documentId)) {
							const clients = documentRooms.get(documentId);
							clients.forEach(client => {
								if (client !== ws && client.readyState === client.OPEN) {
									client.send(JSON.stringify({
										type: 'update',
										documentId,
										content,
										version: newVersion,
										isSummary
									}));
								}
							});
						}

						console.log(`💾 Document ${documentId} saved and synced (legacy mode)`);
					} catch (error) {
						console.error('Error saving document:', error);
						ws.send(JSON.stringify({
							type: 'error',
							message: 'Failed to save document',
							documentId
						}));
					}
					break;

				default:
					console.log("Unknown message type:", data.type);
			}
		} catch (error) {
			console.error('Error processing WebSocket message:', error);
			ws.send(JSON.stringify({
				type: 'error',
				message: 'Invalid message format'
			}));
		}
	});

	ws.on('close', () => {
		// Remove client from document room
		if (currentDocumentId && documentRooms.has(currentDocumentId)) {
			documentRooms.get(currentDocumentId).delete(ws);
			if (documentRooms.get(currentDocumentId).size === 0) {
				documentRooms.delete(currentDocumentId);
			}
			console.log(`📄 Client left document: ${currentDocumentId}`);
		}
		console.log("Client disconnected ❌");
	});

	ws.send(JSON.stringify({ type: "connected" }));
});

// Handle WebSocket upgrade requests
server.on("upgrade", (req, socket, head) => {
	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit("connection", ws, req);
	});
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
	console.error(reason?.stack || reason);
});

process.on('uncaughtException', (error) => {
	console.error('❌ Uncaught Exception:', error);
	console.error(error.stack);
	process.exit(1);
});