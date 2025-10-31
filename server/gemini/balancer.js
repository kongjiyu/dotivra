// server/gemini/balancer.js - ESM compatible runtime balancer with Firebase support
import crypto from 'crypto';
import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';

const DEFAULT_LIMITS = {
	RPM: Number(process.env.GEMINI_LIMIT_RPM || 15),
	RPD: Number(process.env.GEMINI_LIMIT_RPD || 1500),
	TPM: Number(process.env.GEMINI_LIMIT_TPM || 20000),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function estimateTokensFromContents(contents) {
	try {
		const text = (contents || [])
			.map((c) => (typeof c === 'string' ? c : JSON.stringify(c)))
			.join(' ');
		return Math.ceil((text || '').length / 4);
	} catch {
		return 100;
	}
}

export class GeminiBalancer {
	constructor({ apiKeys, firestore, limits = DEFAULT_LIMITS }) {
		if (!apiKeys || !apiKeys.length) throw new Error('No GEMINI API keys configured');
		if (!firestore) throw new Error('Firestore instance required');

		this.limits = limits;
		this.firestore = firestore;
		this.state = {
			keys: apiKeys.map((key) => ({
				key,
				id: crypto.createHash('sha256').update(String(key)).digest('hex'),
				cooldownUntil: 0,
				minuteWindowStart: 0,
				dayWindowStart: 0,
				rpmUsed: 0,
				rpdUsed: 0,
				tpmUsed: 0,
				lastUsedAt: 0,
				totalRequests: 0,
				totalTokens: 0,
			})),
			rrIndex: 0,
			lastPersistAt: 0,
		};
		this._loadPromise = this._load();
		this._debouncedSave = this._debounce(() => this._save(), 500);
	}

	_debounce(fn, wait) {
		let t;
		return (...args) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...args), wait);
		};
	}

	_now() {
		return Date.now();
	}

	async _load() {
		try {

			const { doc, getDoc } = await import('firebase/firestore');

			for (const keyState of this.state.keys) {
				const keyDoc = doc(this.firestore, 'gemini-metrics', keyState.id);
				const keySnapshot = await getDoc(keyDoc);

				if (keySnapshot.exists()) {
					const data = keySnapshot.data();
					Object.assign(keyState, {
						cooldownUntil: data.cooldownTime?.toMillis() || 0,
						minuteWindowStart: data.lastUsed?.toMillis() || 0,
						dayWindowStart: data.lastUsed?.toMillis() || 0,
						rpmUsed: data.RPM || 0,
						rpdUsed: data.RPD || 0,
						tpmUsed: data.TPM || 0,
						lastUsedAt: data.lastUsed?.toMillis() || 0,
						totalRequests: data.totalRequest || 0,
						totalTokens: data.totalTokens || 0,
					});
				} else {
					await this._initializeKeyInFirebase(keyState);
				}
			}

		} catch (error) {
			console.error('❌ Error loading Gemini data from Firebase:', error);
		}
	}

	async _initializeKeyInFirebase(keyState) {
		try {
			const { doc, setDoc } = await import('firebase/firestore');
			const keyDoc = doc(this.firestore, 'gemini-metrics', keyState.id);
			await setDoc(keyDoc, {
				RPD: 0,
				RPM: 0,
				TPM: 0,
				cooldownTime: new Date(0),
				lastUsed: new Date(),
				totalRequest: 0,
				totalTokens: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} catch (error) {
			console.error(`❌ Error initializing key ${keyState.id.substring(0, 12)} in Firebase:`, error);
		}
	}

	async _save() {
		try {
			const now = new Date();
			this.state.lastPersistAt = this._now();

			const { doc, setDoc } = await import('firebase/firestore');

			const savePromises = this.state.keys.map(async (k) => {
				try {
					const keyDoc = doc(this.firestore, 'gemini-metrics', k.id);
					const dataToSave = {
						RPD: k.rpdUsed,
						RPM: k.rpmUsed,
						TPM: k.tpmUsed,
						cooldownTime: new Date(k.cooldownUntil),
						lastUsed: new Date(k.lastUsedAt || Date.now()),
						totalRequest: k.totalRequests,
						totalTokens: k.totalTokens,
						updatedAt: now,
					};


					await setDoc(keyDoc, dataToSave, { merge: true });

				} catch (error) {
					console.error(`❌ Error saving key ${k.id.substring(0, 12)} to Firebase:`, error);
				}
			});

			await Promise.all(savePromises);
		} catch (error) {
			console.error('❌ GeminiBalancer persist error:', error);
		}
	}

	_resetWindowsIfNeeded(k) {
		const now = this._now();
		const minuteStart = Math.floor(now / 60000) * 60000;
		const dayStart = new Date();
		dayStart.setHours(0, 0, 0, 0);
		const dayStartMs = dayStart.getTime();
		if (k.minuteWindowStart !== minuteStart) {
			k.minuteWindowStart = minuteStart;
			k.rpmUsed = 0;
			k.tpmUsed = 0;
		}
		if (k.dayWindowStart !== dayStartMs) {
			k.dayWindowStart = dayStartMs;
			k.rpdUsed = 0;
		}
	}

	_keyStatus(k) {
		this._resetWindowsIfNeeded(k);
		const now = this._now();
		if (k.cooldownUntil && now < k.cooldownUntil) return 'cooldown';
		if (k.rpmUsed >= this.limits.RPM) return 'rpm-exhausted';
		if (k.rpdUsed >= this.limits.RPD) return 'rpd-exhausted';
		if (k.tpmUsed >= this.limits.TPM) return 'tpm-exhausted';
		return 'ok';
	}

	_pickKey(estimatedTokens) {
		const n = this.state.keys.length;
		for (let i = 0; i < n; i++) {
			const idx = (this.state.rrIndex + i) % n;
			const k = this.state.keys[idx];
			this._resetWindowsIfNeeded(k);
			const status = this._keyStatus(k);
			if (status !== 'ok') continue;
			if (k.rpmUsed + 1 > this.limits.RPM) continue;
			if (k.rpdUsed + 1 > this.limits.RPD) continue;
			if (k.tpmUsed + estimatedTokens > this.limits.TPM) continue;
			this.state.rrIndex = (idx + 1) % n;
			return { idx, key: k };
		}
		return null;
	}

	_markUsage(k, usedTokens) {
		this._resetWindowsIfNeeded(k);
		k.rpmUsed += 1;
		k.rpdUsed += 1;
		k.tpmUsed += usedTokens;
		k.totalRequests += 1;
		k.totalTokens += usedTokens;
		k.lastUsedAt = this._now();
		this._debouncedSave();
	}

	getUsage() {
		return {
			rrIndex: this.state.rrIndex,
			keys: this.state.keys.map((k) => ({
				id: k.id,
				idShort: k.id.slice(0, 12),
				cooldownUntil: k.cooldownUntil,
				minuteWindowStart: k.minuteWindowStart,
				dayWindowStart: k.dayWindowStart,
				rpmUsed: k.rpmUsed,
				rpdUsed: k.rpdUsed,
				tpmUsed: k.tpmUsed,
				lastUsedAt: k.lastUsedAt,
				totalRequests: k.totalRequests,
				totalTokens: k.totalTokens,
				status: this._keyStatus(k),
			})),
			limits: this.limits,
			lastPersistAt: this.state.lastPersistAt,
		};
	}

	// Read usage directly from Firebase (for dashboard)
	async getUsageFromFirebase() {
		try {
			const { collection, getDocs } = await import('firebase/firestore');
			const collectionRef = collection(this.firestore, 'gemini-metrics');
			const snapshot = await getDocs(collectionRef);


			const keys = [];
			snapshot.forEach((doc) => {
				const data = doc.data();

				// Calculate status based on current usage vs limits
				const rpmUsed = data.RPM || 0;
				const rpdUsed = data.RPD || 0;
				const tpmUsed = data.TPM || 0;

				let status = 'available';
				if (rpmUsed >= this.limits.RPM) {
					status = 'rpm-limit-reached';
				} else if (rpdUsed >= this.limits.RPD) {
					status = 'rpd-limit-reached';
				} else if (tpmUsed >= this.limits.TPM) {
					status = 'tpm-limit-reached';
				}

				keys.push({
					id: doc.id,
					idShort: doc.id.slice(0, 12),
					RPD: rpdUsed,
					RPM: rpmUsed,
					TPM: tpmUsed,
					status: status,
					totalRequest: data.totalRequest || 0,
					totalTokens: data.totalTokens || 0,
					updatedAt: data.updatedAt || null,
				});
			});


			return {
				keys,
				limits: this.limits,
				lastSyncedAt: new Date().toISOString(),
			};
		} catch (error) {
			console.error('❌ Error reading from Firebase:', error);
			throw error;
		}
	}

	getConfig() {
		return { limits: this.limits, keyCount: this.state.keys.length };
	}

	async generate({ model, contents, tools, systemInstruction, generationConfig, safetySettings, toolConfig, dryRun }) {
		await this._loadPromise;

		const estimatedTokens = estimateTokensFromContents(contents);
		const maxAttempts = this.state.keys.length;
		let lastError;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const picked = this._pickKey(estimatedTokens);
			if (!picked) {
				const err = new Error('All API keys are rate-limited or exhausted.');
				err.status = 429;
				throw err;
			}
			const { key: keyState } = picked;
			try {
				if (dryRun) {
					this._markUsage(keyState, estimatedTokens);
					return {
						text: null,
						raw: { dryRun: true },
						usage: {
							promptTokens: null,
							candidatesTokens: null,
							totalTokens: null,
							estimatedTokens,
						},
						keyId: keyState.id,
						keyIdShort: keyState.id.slice(0, 12),
					};
				}
				const client = new GoogleGenAI({ apiKey: keyState.key });

				


				// Resolve tool config if not provided
				const resolvedToolConfig = toolConfig ?? (tools && tools.length > 0 ? {
					functionCallingConfig: {
						mode: FunctionCallingConfigMode.ANY,
						allowedFunctionNames: tools[0]?.functionDeclarations?.map((fd) => fd.name) || [],
					}
				} : undefined);

				// Non-streaming generate; newer SDKs expose response on resp.response
				const resp = await client.models.generateContent({
					model,
					contents,
					systemInstruction,
					generationConfig,
					tools,
					toolConfig: resolvedToolConfig,
					safetySettings,
				});

				const metaSrc = resp?.response?.usageMetadata || resp?.usageMetadata || {};
				const usedTokens = Number(metaSrc.totalTokenCount || metaSrc.candidatesTokenCount || 0) + Number(metaSrc.promptTokenCount || 0);
				const effectiveTokens = usedTokens > 0 ? usedTokens : estimatedTokens;
				this._markUsage(keyState, effectiveTokens);

				// Extract text from response (handle multiple SDK shapes)
				const responseObj = resp?.response ?? resp;
				let text = null;
				try {
					if (typeof responseObj?.text === 'function') {
						text = responseObj.text();
					}
				} catch { }
				if (!text) {
					const cands = responseObj?.candidates || [];
					const parts = cands?.[0]?.content?.parts || [];
					text = parts.map((p) => p?.text).filter(Boolean).join(' ') || null;
				}

				// Extract function calls if any
				const functionCalls = (responseObj?.candidates?.[0]?.functionCalls) || resp?.functionCalls || [];

				return {
					text,
					functionCalls,
					raw: resp?.response ?? resp,
					usage: {
						promptTokens: metaSrc.promptTokenCount ?? null,
						candidatesTokens: metaSrc.candidatesTokenCount ?? null,
						totalTokens: usedTokens || null,
						estimatedTokens,
					},
					keyId: keyState.id,
					keyIdShort: keyState.id.slice(0, 12),
				};
			} catch (e) {
				lastError = e;
				const msg = (e && (e.message || String(e))) || '';
				const isRateLimit = e?.status === 429 || e?.status === 403 || /rate/i.test(msg);
				const isOverloaded = e?.status === 503 || /overloaded|model is overloaded/i.test(msg);

				if (isRateLimit) {
					const now = this._now();
					const minuteEnd = Math.floor(now / 60000) * 60000 + 60000;
					keyState.cooldownUntil = minuteEnd;
					this._debouncedSave();
				} else if (isOverloaded) {
					// Put this key in cooldown for 30 seconds
					keyState.cooldownUntil = this._now() + 30000;
					this._debouncedSave();
				} else {
					console.error(`❌ Error with key ${keyState.id.substring(0, 12)}:`, msg);
				}

				await sleep(100);
				continue;
			}
		}
		const err = new Error(lastError?.message || 'Gemini request failed for all keys');
		err.status = lastError?.status || 500;
		throw err;
	}

	async generateStream({ model, contents, tools, systemInstruction, generationConfig, safetySettings, toolConfig, dryRun, onStream }) {
		await this._loadPromise;

		const estimatedTokens = estimateTokensFromContents(contents);
		const maxAttempts = this.state.keys.length;
		let lastError;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const picked = this._pickKey(estimatedTokens);
			if (!picked) {
				const err = new Error('All API keys are rate-limited or exhausted.');
				err.status = 429;
				throw err;
			}

			const { key: keyState } = picked;

			try {
				// Dry-run support
				if (dryRun) {
					this._markUsage(keyState, estimatedTokens);
					return {
						text: null,
						raw: { dryRun: true },
						usage: {
							promptTokens: null,
							candidatesTokens: null,
							totalTokens: null,
							estimatedTokens,
						},
						keyId: keyState.id,
						keyIdShort: keyState.id.slice(0, 12),
					};
				}

				const client = new GoogleGenAI({ apiKey: keyState.key });

				

				// --- Core streaming logic ---
				const stream = await client.models.generateContentStream({
					model,
					contents,
					systemInstruction,
					config: {
						...generationConfig,
						tools,
						toolConfig: !toolConfig ? {
							functionCallingConfig: {
								mode: FunctionCallingConfigMode.ANY,
								allowedFunctionNames: tools[0]?.functionDeclarations?.map((fd) => fd.name) || [],
							}
						} : toolConfig
						,
						safetySettings,
					},
				});

				// Prepare accumulators
				let finalText = '';
				let allChunks = [];
				let usageMeta = {};
				let functionCalls = [];

				// Stream iteration
				for await (const chunk of stream) {
					const delta = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || '';
					if (delta) {
						finalText += delta;
						allChunks.push(delta);

						// Call the onStream callback if provided
						if (onStream && typeof onStream === 'function') {
							onStream(delta);
						}
					}

					// Collect function calls if emitted
					const fnCalls = chunk?.candidates?.[0]?.functionCalls;
					if (fnCalls?.length) functionCalls.push(...fnCalls);

					// Keep last metadata
					if (chunk?.usageMetadata) usageMeta = chunk.usageMetadata;
				}

				const finalResponse = await stream.response;
				const metadata = finalResponse?.usageMetadata || usageMeta || {};

				// --- Token tracking ---
				const usedTokens = Number(metadata.totalTokenCount || metadata.candidatesTokenCount || 0)
					+ Number(metadata.promptTokenCount || 0);
				const effectiveTokens = usedTokens > 0 ? usedTokens : estimatedTokens;
				this._markUsage(keyState, effectiveTokens);

				// --- Return final structure ---
				return {
					text: finalText.trim(),
					functionCalls,
					raw: finalResponse,
					usage: {
						promptTokens: metadata.promptTokenCount ?? null,
						candidatesTokens: metadata.candidatesTokenCount ?? null,
						totalTokens: usedTokens || null,
						estimatedTokens,
					},
					keyId: keyState.id,
					keyIdShort: keyState.id.slice(0, 12),
				};
			} catch (e) {
				lastError = e;
				const msg = (e && (e.message || String(e))) || '';
				const isRateLimit = e?.status === 429 || e?.status === 403 || /rate/i.test(msg);
				const isOverloaded = e?.status === 503 || /overloaded|model is overloaded/i.test(msg);

				if (isRateLimit) {
					const now = this._now();
					const minuteEnd = Math.floor(now / 60000) * 60000 + 60000;
					keyState.cooldownUntil = minuteEnd;
					this._debouncedSave();
				} else if (isOverloaded) {
					// Put this key in cooldown for 30 seconds
					keyState.cooldownUntil = this._now() + 30000;
					this._debouncedSave();
				} else {
					console.error(`❌ Error with key ${keyState.id.substring(0, 12)}:`, msg);
				}

				console.error(`❌ Gemini attempt ${attempt + 1} failed with key ${keyState.id}:`, msg);
				await sleep(100);
				continue;
			}
		}

		const err = new Error(lastError?.message || 'Gemini request failed for all keys');
		err.status = lastError?.status || 500;
		throw err;
	}
}

export function createBalancerFromEnv(firestore) {
	const raw = (process.env.GEMINI_API_KEYS || '').trim();
	let keys = [];
	if (raw) {
		if (raw.startsWith('[')) {
			try {
				const arr = JSON.parse(raw);
				keys = Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
			} catch {
				keys = raw.replace(/[\[\]\s"\']/g, '').split(',').map((s) => s.trim()).filter(Boolean);
			}
		} else {
			const cleaned = raw.replace(/[\[\]\s"\']/g, '');
			keys = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
		}
	}

	const limits = {
		RPM: Number(process.env.GEMINI_LIMIT_RPM || DEFAULT_LIMITS.RPM),
		RPD: Number(process.env.GEMINI_LIMIT_RPD || DEFAULT_LIMITS.RPD),
		TPM: Number(process.env.GEMINI_LIMIT_TPM || DEFAULT_LIMITS.TPM),
	};

	return new GeminiBalancer({ apiKeys: keys, firestore, limits });
}
