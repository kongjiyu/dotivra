// server/routes/gemini.js - Shared Gemini routes for both local and Firebase
export function createGeminiRoutes(options = {}) {
  const { geminiBalancer, logger = console, geminiWithMcp = null } = options;

  // Session storage for dashboard authentication
  const dashboardSessions = new Map();

  // Helper functions
  function cleanExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of dashboardSessions.entries()) {
      if (now > session.expiresAt) {
        dashboardSessions.delete(sessionId);
      }
    }
  }

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

  return {
    // Authenticate with passkey
    auth: async (req, res) => {
      try {
        const { passkey } = req.body;
        const expectedPasskey = process.env.GEMINI_DASHBOARD_PASS;

        if (!expectedPasskey) {
          return res.status(500).json({ error: 'Dashboard passkey not configured' });
        }

        if (passkey !== expectedPasskey) {
          return res.status(401).json({ error: 'Invalid passkey' });
        }

        const crypto = await import('crypto');
        const sessionId = crypto.default.randomBytes(32).toString('hex');
        const now = Date.now();
        const expiresAt = now + 10 * 60 * 1000;

        dashboardSessions.set(sessionId, { createdAt: now, expiresAt });
        cleanExpiredSessions();

        logger.log('✅ Dashboard session created');

        res.json({
          sessionId,
          expiresAt: new Date(expiresAt).toISOString(),
        });
      } catch (error) {
        logger.error('❌ Dashboard auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    },

    // Generate via Gemini API
    generate: async (req, res) => {
      try {
        logger.log('🔵 Gemini API Request received');

        if (!geminiBalancer) {
          logger.error('❌ Balancer not configured!');
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

        logger.log('✅ Gemini generation successful');
        res.json({
          ok: true,
          text: result.text,
          usage: result.usage,
          key: { idShort: result.keyIdShort },
          model,
        });
      } catch (error) {
        logger.error('❌ Gemini generate error:', error);
        const status = error?.status || 500;
        res.status(status).json({
          ok: false,
          error: error?.message || 'Failed to generate'
        });
      }
    },

    // Generate with MCP tool calling
    generateWithTools: async (req, res) => {
      try {
        logger.log('🔧 Gemini API with Tools Request received');

        if (!geminiWithMcp) {
          logger.warn('⚠️ MCP not configured, falling back to regular generation');
          return await createGeminiRoutes.generate(req, res);
        }

        const {
          prompt,
          documentId,
          documentContent,
          systemPrompt,
          model = 'gemini-2.5-pro',
          generationConfig = {},
        } = req.body || {};

        if (!prompt) {
          return res.status(400).json({ error: 'Missing prompt' });
        }

        // Set document context if provided
        if (documentId) {
          logger.log(`📄 Setting document context: ${documentId}`);
          await geminiWithMcp.setDocument(documentId);
        }

        // Build contents with system instruction and user prompt
        const contents = [{
          role: 'user',
          parts: [{ text: prompt }]
        }];

        // Add system instruction if provided
        const systemInstruction = systemPrompt ? {
          parts: [{ text: systemPrompt }]
        } : undefined;

        // Generate with tools
        logger.log('🤖 Generating with MCP tools...');
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

        logger.log(`✅ Generation complete (${result.toolCalls?.length || 0} tools used)`);

        res.json({
          success: true,
          text: result.text,
          toolCalls: result.toolCalls || [],
          toolsUsed: result.toolCalls?.length || 0,
          model
        });
      } catch (error) {
        logger.error('❌ Gemini generate with tools error:', error);
        res.status(500).json({
          success: false,
          error: error?.message || 'Failed to generate with tools'
        });
      }
    },

    // Dashboard endpoint
    dashboard: async (req, res) => {
      try {
        const sessionId = req.headers['x-session-id'];
        if (!verifySession(sessionId)) {
          return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
        }

        if (!geminiBalancer) {
          return res.status(503).json({ error: 'Balancer not configured' });
        }

        const usage = await geminiBalancer.getUsageFromFirebase();
        res.json(usage);
      } catch (error) {
        logger.error('❌ Gemini dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
      }
    },

    // Verify session endpoint
    verifySession: (req, res) => {
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
        logger.error('❌ Session verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
      }
    },

    // Logout endpoint
    logout: (req, res) => {
      try {
        const { sessionId } = req.body;
        if (sessionId) {
          dashboardSessions.delete(sessionId);
          logger.log('🔓 Dashboard session ended');
        }
        res.json({ success: true });
      } catch (error) {
        logger.error('❌ Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
      }
    }
  };
}
