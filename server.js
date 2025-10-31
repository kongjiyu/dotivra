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

// Simple retry helper for transient upstream errors (e.g., 503)
async function fetchWithRetry(input, init, opts) {
	const retries = (opts && opts.retries !== undefined) ? opts.retries : 2;
	const baseBackoff = (opts && opts.backoffMs !== undefined) ? opts.backoffMs : 300;
	let attempt = 0;
	while (true) {
		try {
			const res = await fetch(input, init);
			if ([502, 503, 504].includes(res.status) && attempt < retries) {
				const delay = baseBackoff * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
				await new Promise((r) => setTimeout(r, delay));
				attempt++;
				continue;
			}
			return res;
		} catch (err) {
			if (attempt >= retries) throw err;
			const delay = baseBackoff * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
			await new Promise((r) => setTimeout(r, delay));
			attempt++;
			continue;
		}
	}
}





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
} catch (e) {
	// Gemini balancer initialization failed
}

// Import toolService and AIAgent
import { initFirestore, getToolService } from './server/services/toolService.js';
import { AIAgent } from './server/aiAgent.js';

// Initialize firestore in toolService
initFirestore(firestore);

// Get tool service instance
const toolService = getToolService();

// Initialize AI Agent
let aiAgent;
if (geminiBalancer) {
	try {
		// Initialize AI Agent
		aiAgent = new AIAgent(geminiBalancer, toolService);
	} catch (error) {
		console.error('❌ Failed to initialize AI Agent:', error);
	}
}

// Make globally available for routes
global.geminiBalancer = geminiBalancer;
global.aiAgent = aiAgent;
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
app.post('/api/gemini/generate-with-tools', async (req, res) => {
	try {

		const {
			prompt,
			model = 'gemini-2.5-pro',
			generationConfig = {},
		} = req.body || {};

		if (!prompt) {
			return res.status(400).json({ error: 'Missing prompt' });
		}

		// Fallback to regular generation (MCP removed)
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
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error?.message || 'Failed to generate with tools'
		});
	}
});


// Generate via balancer: central entry for all AI calls
app.post('/api/gemini/generate', async (req, res) => {
	try {


		if (!geminiBalancer) {
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
		}
		if (!effectiveContents) {
			return res.status(400).json({ error: 'Missing prompt or contents' });
		}

		const result = await geminiBalancer.generate({
			model,
			contents: effectiveContents,
			tools,
			systemInstruction,
			generationConfig,
			safetySettings,
			toolConfig,
		});

		res.json({
			ok: true,
			text: result.text,
			usage: result.usage,
			key: { idShort: result.keyIdShort },
			model,
		});
	} catch (error) {

		const status = error?.status || 500;
		res.status(status).json({ ok: false, error: error?.message || 'Failed to generate' });
	}
});

// Generate document recommendations
app.post('/api/gemini/recommendations', async (req, res) => {
	try {
		const { documentId, content } = req.body;

		if (!documentId || !content) {
			return res.status(400).json({ error: 'Missing documentId or content' });
		}
		// Generate recommendations using Gemini
		const prompt = `Analyze this document and provide exactly 4 actionable recommendations.

Document Content:
${content}

Provide 4 specific, actionable recommendations for improving or extending this document. Each recommendation should be:
- Brief (1-2 sentences)
- Actionable (user can immediately act on it)
- Relevant to the document content

Format your response as JSON:
{
  "recommendations": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`;

		const result = await geminiBalancer.generate({
			model: 'gemini-2.5-pro',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: 1024
			}
		});

		// Parse JSON from response
		let recommendations;
		try {
			const parsed = JSON.parse(result.text);
			recommendations = parsed.recommendations || [];
		} catch (parseError) {
			// Fallback: extract text recommendations
			recommendations = [
				{ title: 'Review Content', description: 'Review and verify the generated recommendations' },
				{ title: 'Add Details', description: 'Consider adding more specific details based on the context' },
				{ title: 'Improve Structure', description: 'Enhance document structure for better readability' },
				{ title: 'Add Examples', description: 'Include practical examples where appropriate' }
			];
		}

		res.json({ recommendations });

	} catch (error) {
		res.status(500).json({ error: 'Failed to generate recommendations' });
	}
});

// AI Agent - Standard HTTP with multi-step execution
// Store active sessions for multi-step execution
const aiAgentSessions = new Map();

app.post('/api/ai-agent/execute', async (req, res) => {
	try {

		if (!aiAgent) {
			return res.status(503).json({ error: 'AI Agent not initialized' });
		}

		const { prompt, documentId, conversationHistory, selectedText, sessionId } = req.body;

		// If sessionId provided, continue existing session
		if (sessionId && aiAgentSessions.has(sessionId)) {
			const iterator = aiAgentSessions.get(sessionId);
			try {
				const { value: stage, done } = await iterator.next();

				if (done || !stage || stage.stage === 'done') {
					aiAgentSessions.delete(sessionId);
					return res.json({ stage: 'done', content: null, sessionId: null });
				}

				return res.json({ ...stage, sessionId });
			} catch (error) {
				aiAgentSessions.delete(sessionId);
				return res.json({ stage: 'error', content: error.message, sessionId: null });
			}
		}

		// New session - validate prompt
		if (!prompt) {
			return res.status(400).json({ error: 'Missing prompt' });
		}

		// Build full prompt with context
		let fullPrompt = prompt;
		if (selectedText) {
			fullPrompt = `Selected text from document: "${selectedText}"\n\nUser request: ${prompt}`;
		}

		// Fetch document to get repository link if document ID is provided
		let repoLink = null;
		if (documentId) {
			try {
				const docRef = doc(firestore, 'Documents', documentId);
				const docSnap = await getDoc(docRef);
				if (docSnap.exists()) {
					const docData = docSnap.data();
					repoLink = docData.GitHubRepo || docData.githubLink || null;
				}
			} catch (err) {
			}
		}

		// Create new session
		const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		try {
			const iterator = aiAgent.executeWithStream(fullPrompt, documentId, conversationHistory || [], repoLink);
			aiAgentSessions.set(newSessionId, iterator);

			// Get first stage
			const { value: stage, done } = await iterator.next();

			if (done || !stage || stage.stage === 'done') {
				aiAgentSessions.delete(newSessionId);
				return res.json({ stage: 'done', content: null, sessionId: null });
			}

			return res.json({ ...stage, sessionId: newSessionId });

		} catch (agentError) {
			aiAgentSessions.delete(newSessionId);
			return res.json({ stage: 'error', content: agentError.message, sessionId: null });
		}

	} catch (error) {

		res.status(500).json({
			stage: 'error',
			content: error?.message || 'AI Agent execution failed',
			sessionId: null
		});
	}
});

// Clean up stale sessions every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [sessionId, iterator] of aiAgentSessions.entries()) {
		// Remove sessions older than 10 minutes
		const sessionAge = now - parseInt(sessionId.split('-')[1]);
		if (sessionAge > 10 * 60 * 1000) {
			aiAgentSessions.delete(sessionId);
		}
	}
}, 5 * 60 * 1000);

// ===================== Tool Execution Endpoint =====================
// Execute tools called by AI agent
app.post('/api/tools/execute', async (req, res) => {
	try {

		const { tool, args, documentId } = req.body;

		if (!tool) {
			return res.status(400).json({
				success: false,
				html: `<div class="error-message">Sorry, no tool was specified. Please try again.</div>`
			});
		}

		if (!args || typeof args !== 'object') {
			return res.status(400).json({
				success: false,
				html: `<div class="error-message">Sorry, the tool arguments are missing or invalid. Please try again.</div>`
			});
		}

		// Pre-validate required args for known tools to provide clearer errors
		const needsRange = tool === 'replace_document_content' || tool === 'remove_document_content' || tool === 'replace_doument_summary' || tool === 'remove_document_summary';
		if (needsRange) {
			const pos = args?.position;
			if (!pos || typeof pos.from !== 'number' || typeof pos.to !== 'number') {
				const errorHtml = `<div class="error-message">Missing required position range. Provide { position: { from: number, to: number } }.</div>`;
				// Log system error to ChatHistory when we have a document context
				try {
					if (documentId) {
						await firestore.collection('ChatHistory').add({
							DocID: documentId,
							Role: 'system-error',
							Message: 'Tool argument error: position.from/to is required',
							CreatedAt: new Date().toISOString(),
						});
					}
				} catch (e) {
					// Failed to log error
				}
				return res.status(400).json({ success: false, html: errorHtml, tool });
			}
		}		// Import setCurrentDocument from toolService
		const { setCurrentDocument } = await import('./server/services/toolService.js');

		// Set document context if documentId provided
		if (documentId && documentId !== 'NOT_SET') {
			try {
				await setCurrentDocument(documentId);
			} catch (error) {
				return res.status(500).json({
					success: false,
					html: `<div class="error-message">Sorry, we couldn't load your document. Please try again.</div>`
				});
			}
		}

		// Execute the tool
		let result;
		try {
			result = await toolService.executeTool(tool, args);
		} catch (toolError) {

			// Log system error
			try {
				if (documentId) {
					await firestore.collection('ChatHistory').add({
						DocID: documentId,
						Role: 'system-error',
						Message: `Tool execution error for ${tool}: ${toolError?.message || toolError}`,
						CreatedAt: new Date().toISOString(),
					});
				}
			} catch (e) {
				// Failed to log error
			}
			return res.status(500).json({
				success: false,
				html: `<div class="error-message">Sorry, something went wrong while running the tool. Please try again.</div>`,
				tool: tool
			});
		}		// If tool returned an error, store it as system-error
		if (!result?.success && documentId) {
			try {
				await firestore.collection('ChatHistory').add({
					DocID: documentId,
					Role: 'system-error',
					Message: typeof result?.html === 'string' ? result.html.replace(/<[^>]*>/g, '') : (result?.error || 'Tool returned an error'),
					CreatedAt: new Date().toISOString(),
				});
			} catch (e) {
				// Failed to log error
			}
		}

		// Return the result
		res.json(result);
	} catch (error) {

		res.status(500).json({
			success: false,
			error: error?.message || 'Tool execution failed',
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
});

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


		res.json({
			sessionId,
			expiresAt: new Date(expiresAt).toISOString(),
		});
	} catch (error) {

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

		res.status(500).json({ error: 'Verification failed' });
	}
});

// Logout endpoint
app.post('/api/gemini/logout', (req, res) => {
	try {
		const { sessionId } = req.body;
		if (sessionId) {
			dashboardSessions.delete(sessionId);
		}
		res.json({ success: true });
	} catch (error) {
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
		const usage = await geminiBalancer.getUsageFromFirebase();
		res.json(usage);
	} catch (error) {

		res.status(500).json({ error: 'Failed to get dashboard' });
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
		res.json({ templates });
	} catch (error) {
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
		const { name, description, githubLink, selectedRepo, installationId, userId } = req.body;

		// Validate required fields
		if (!name || !description || !userId) {
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


		res.status(201).json({
			success: true,
			project: {
				...project,
				Created_Time: project.Created_Time.toDate().toISOString()
			}
		});
	} catch (error) {

		res.status(500).json({
			error: 'Failed to create project',
			details: error.message
		});
	}
});

// Get all projects
app.get('/api/projects', async (req, res) => {
	try {

		const q = query(collection(firestore, 'Projects'), orderBy('Created_Time', 'desc'));
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
		const {
			Title,
			DocumentName, // Keep for backward compatibility
			DocumentType,
			DocumentCategory,
			Project_Id,
			Template_Id,
			User_Id,
			Content,
			IsDraft
		} = req.body;

		// Use Title field, fallback to DocumentName for backward compatibility
		const documentTitle = Title || DocumentName;

		// Validate required fields
		if (!documentTitle || !DocumentType || !DocumentCategory || !Project_Id || !User_Id) {
			return res.status(400).json({
				error: 'Title (or DocumentName), DocumentType, DocumentCategory, Project_Id, and User_Id are required',
				received: {
					Title: !!Title,
					DocumentName: !!DocumentName,
					DocumentType: !!DocumentType,
					DocumentCategory: !!DocumentCategory,
					Project_Id: !!Project_Id,
					User_Id: !!User_Id
				}
			});
		}


		// Create the document object
		const document = {
			Title: documentTitle.trim(),
			DocumentName: documentTitle.trim(), // Keep for backward compatibility
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



		// Add to Firestore Documents collection
		const docRef = await addDoc(collection(firestore, 'Documents'), document);



		const responseDocument = {
			...document,
			id: docRef.id, // Add Firestore document ID
			Created_Time: document.Created_Time.toDate().toISOString(),
			Updated_Time: document.Updated_Time.toDate().toISOString()
		};



		res.status(201).json({
			success: true,
			document: responseDocument
		});
	} catch (error) {
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


		res.json({
			success: true,
			documents
		});
	} catch (error) {
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


		const docRef = doc(firestore, 'Documents', documentId);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
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



		res.json({
			success: true,
			document
		});
	} catch (error) {
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

		const docRef = doc(firestore, 'Documents', documentId);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			return res.status(404).json({ error: 'Document not found' });
		}

		const docData = docSnap.data();
		const currentVersion = docData?.version || 0;
		const newVersion = currentVersion + 1;

		// Add timestamp and version for update
		updateData.Updated_Time = Timestamp.now();
		updateData.version = newVersion;

		await updateDoc(docRef, updateData);

		// ✅ Save version to DocumentHistory if content changed
		if (updateData.Content !== undefined) {
			try {
				await addDoc(collection(firestore, 'DocumentHistory'), {
					Document_Id: documentId,
					Content: updateData.Content,
					Version: newVersion,
					CreatedAt: Timestamp.now(),
					EditedBy: updateData.EditedBy || docData?.EditedBy || 'anonymous',
					Channel: 'content',
				});
			} catch (historyError) {
				console.error('❌ Failed to save version history:', historyError);
			}
		}


		res.json({
			success: true,
			message: 'Document updated successfully',
			version: newVersion
		});
	} catch (error) {
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

		// Delete the document from Firestore
		const docRef = doc(firestore, 'Documents', documentId);
		await deleteDoc(docRef);


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

		res.json({
			success: true,
			message: 'Profile updated successfully',
			user: userResponse
		});
	} catch (error) {
		res.status(500).json({
			error: 'Failed to update profile',
			details: error.message
		});
	}
});

// Delete user profile
app.delete('/api/profile/delete', async (req, res) => {
	try {
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
	// Server started on PORT
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
		const { content, isDraft, EditedBy } = req.body;

		const docRef = doc(firestore, 'Documents', docId);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			return res.status(404).json({ error: 'NOT_FOUND' });
		}

		const docData = docSnap.data();
		const currentVersion = docData?.version || 0;
		const newVersion = currentVersion + 1;

		await updateDoc(docRef, {
			Content: content,
			IsDraft: isDraft,
			Updated_Time: Timestamp.now(),
			Hash: hashJSON(content),
			version: newVersion,
		});

		// ✅ Save version to DocumentHistory
		try {
			await addDoc(collection(firestore, 'DocumentHistory'), {
				Document_Id: docId,
				Content: content,
				Version: newVersion,
				CreatedAt: Timestamp.now(),
				EditedBy: EditedBy || docData?.EditedBy || 'anonymous',
				Channel: 'content',
			});
		} catch (historyError) {
			console.error('❌ Failed to save version history:', historyError);
		}

		res.json({ status: "ok", version: newVersion });
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

		const historyRef = collection(firestore, "DocumentHistory");

		// DEBUG: Get ALL documents in the collection to see what's there
		const allSnapshot = await getDocs(historyRef);
		allSnapshot.docs.forEach(doc => {
			const data = doc.data();

		});

		// Now try the filtered query
		const q = query(historyRef, where("Document_Id", "==", docId), orderBy("Version", "desc"));
		const snapshot = await getDocs(q);

		const versions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
		res.json({ versions });
	} catch (err) {
		res.status(500).json({ error: "SERVER_ERROR", details: err.message });
	}
});

// ✅ Save document history snapshot
app.post("/api/document/history", async (req, res) => {
	try {
		const { Document_Id, Content, Version, Edited_Time } = req.body;

		if (!Document_Id || !Content || !Version) {
			return res.status(400).json({ error: "Missing required fields" });
		}


		const historyData = {
			Document_Id,
			Content,
			Version,
			Edited_Time: Edited_Time || new Date().toISOString()
		};

		const historyRef = await addDoc(collection(firestore, "DocumentHistory"), historyData);

		res.status(201).json({
			success: true,
			id: historyRef.id,
			...historyData
		});
	} catch (err) {
		console.error('❌ Error saving document history:', err.message);
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
		const tokenResponse = await fetchWithRetry('https://github.com/login/oauth/access_token', {
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
		}, { retries: 2 });

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

		const response = await fetchWithRetry('https://api.github.com/user/repos?sort=updated&per_page=100', {
			headers: {
				'Authorization': authorization,
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Dotivra-App'
			}
		}, { retries: 2 });

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
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': authorization,
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Dotivra-App'
			}
		}, { retries: 2 });

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
		const response = await fetchWithRetry(validUrl.href, {
			method: 'GET',
			headers: {
				'User-Agent': 'Dotivra-Bot/1.0 (+https://dotivra.com)',
				'Accept': 'text/html,application/xhtml+xml',
				'Accept-Language': 'en-US,en;q=0.9',
			},
			timeout: 10000, // 10 second timeout
			redirect: 'follow',
			size: 1024 * 1024, // 1MB limit
		}, { retries: 2, backoffMs: 400 });

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



/* ------------------ WebSocket ------------------ */
const wss = new WebSocketServer({ noServer: true });

// Store document rooms: documentId -> Set<WebSocket>
const documentRooms = new Map();

wss.on("connection", (ws) => {
	let currentDocumentId = null;

	ws.on("message", async (msg) => {
		try {
			const data = JSON.parse(msg.toString());

			switch (data.type) {
				case 'join':
					// Join document room
					currentDocumentId = data.documentId;
					if (!documentRooms.has(currentDocumentId)) {
						documentRooms.set(currentDocumentId, new Set());
					}
					documentRooms.get(currentDocumentId).add(ws);
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
						} else {
							ws.send(JSON.stringify({
								type: 'error',
								message: 'Document not found',
								documentId: syncDocId
							}));
						}
					} catch (error) {
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
						}


						// Check if baseVersion matches current version
						if (baseVersion !== currentVersion) {
							// Reject stale edit
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
						} else {
							updateData.Content = editContent;
						}

						await updateDoc(docRef, updateData);

						// Send acknowledgment to sender
						const ackMessage = {
							type: 'ack',
							documentId: editDocId,
							seq,
							newVersion,
							channel: editChannel // Include channel in response
						};
						ws.send(JSON.stringify(ackMessage));

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
		}
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
