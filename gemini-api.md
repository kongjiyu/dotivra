
# Gemini Token Limits Configuration Report

This document lists all places where Gemini API token limits are configured in the codebase.

## 🔍 Current Configuration Summary

### 1. **Rate Limits (RPM/RPD/TPM)** - Configured via Environment Variables

#### **functions/src/index.ts** (Cloud Functions)
```typescript
// Lines 109-113
this.limits = {
  RPM: Number(process.env.GEMINI_LIMIT_RPM || 5),      // ⚠️ Default: 5 requests/min (VERY LOW)
  RPD: Number(process.env.GEMINI_LIMIT_RPD || 100),    // ⚠️ Default: 100 requests/day (VERY LOW)
  TPM: Number(process.env.GEMINI_LIMIT_TPM || 125000),  // ⚠️ Default: 125k tokens/min
};
```

#### **server/gemini/balancer.js** (Local Server)
```javascript
// Lines 5-9
const DEFAULT_LIMITS = {
  RPM: Number(process.env.GEMINI_LIMIT_RPM || 15),       // Default: 15 requests/min
  RPD: Number(process.env.GEMINI_LIMIT_RPD || 1500),    // Default: 1500 requests/day
  TPM: Number(process.env.GEMINI_LIMIT_TPM || 20000),   // ⚠️ Default: 20k tokens/min (VERY LOW)
};
```

**Environment Variables Used:**
- `GEMINI_LIMIT_RPM` - Requests Per Minute
- `GEMINI_LIMIT_RPD` - Requests Per Day
- `GEMINI_LIMIT_TPM` - Tokens Per Minute

---

### 2. **Output Token Limits (maxOutputTokens)** - Hardcoded Values

#### **functions/src/index.ts**
- **Line 704**: `maxOutputTokens: 1024` (Recommendations endpoint)
- **Line 223** (server/aiAgent.js): `maxOutputTokens: 2048` (AI Agent)

#### **server.js**
- **Line 299**: `maxOutputTokens: 1024` (Gemini generate endpoint)

#### **server/routes/gemini.js**
- **Line 169**: `maxOutputTokens: 4096`

#### **src/services/aiService.ts**
- **Line 224**: `maxTokens = 2048` (Default for AI Agent)
- **Line 226**: `maxTokens = 8192` (Summary stage)
- **Line 228**: `maxTokens = 1024` (Planning stage)
- **Line 230**: `maxTokens = 2048` (Reasoning stage)
- **Line 232**: `maxTokens = 1024` (ToolUsed stage)
- **Line 1002**: `maxOutputTokens: 8192` (Template analysis)
- **Line 1127**: `maxOutputTokens: 512` (File selection prompt)
- **Line 1188**: `maxOutputTokens: 512` (Section planning)
- **Line 1286**: `maxOutputTokens: 8192` (Section generation)
- **Line 1454**: `maxOutputTokens: 4096` (Document generation)

---

## 📊 Recommended Values for Paid Tier

### Rate Limits (Environment Variables)
For **Gemini 2.5 Pro** paid tier, typical limits are:
```
GEMINI_LIMIT_RPM=60        # 60 requests per minute
GEMINI_LIMIT_RPD=15000     # 15,000 requests per day
GEMINI_LIMIT_TPM=1000000   # 1,000,000 tokens per minute
```

For **Gemini 2.0 Flash** paid tier:
```
GEMINI_LIMIT_RPM=150       # 150 requests per minute
GEMINI_LIMIT_RPD=15000    # 15,000 requests per day
GEMINI_LIMIT_TPM=2000000  # 2,000,000 tokens per minute
```

### Output Token Limits
For **paid tier models**, recommended `maxOutputTokens`:
- **Short responses**: 4096 - 8192
- **Medium responses**: 16384
- **Long responses (document generation)**: 32768
- **Maximum (if supported)**: 8192 - 32768 depending on model

**Note:** Gemini 2.5 Pro and 2.0 Flash support up to **32,768 output tokens** in paid tier.

---

## 🔧 Files That Need Updates

### Priority 1: Environment Variables (Set in Firebase/Deployment)
Update these in your deployment environment:
- `GEMINI_LIMIT_RPM`
- `GEMINI_LIMIT_RPD`
- `GEMINI_LIMIT_TPM`

### Priority 2: Hardcoded maxOutputTokens (Code Updates Needed)

1. **functions/src/index.ts**
   - Line 704: Increase from 1024 to 8192 or higher

2. **server/aiAgent.js**
   - Line 223: Increase from 2048 to 4096 or higher

3. **server.js**
   - Line 299: Increase from 1024 to 4096 or higher

4. **server/routes/gemini.js**
   - Line 169: Already 4096 (OK, but can increase to 8192+)

5. **src/services/aiService.ts** (Multiple locations)
   - Line 224-232: Increase defaults (2048 → 4096, 8192 → 16384, 1024 → 2048)
   - Line 1002: Already 8192 (OK, but can increase to 16384)
   - Line 1127, 1188: Increase from 512 to 2048
   - Line 1286: Already 8192 (OK, but can increase to 16384 for section generation)
   - Line 1454: Increase from 4096 to 8192 or 16384

---

## 🎯 Quick Action Items

1. **Set environment variables** in your deployment (Firebase Functions):
   ```bash
   firebase functions:config:set gemini.limit_rpm=60
   firebase functions:config:set gemini.limit_rpd=15000
   firebase functions:config:set gemini.limit_tpm=1000000
   ```

2. **Update code** to increase `maxOutputTokens` in all locations listed above

3. **Test** with paid tier API key to ensure limits are respected

---

## 📝 Notes

- The balancer in `functions/src/index.ts` has **very low defaults** (5 RPM, 100 RPD) which will severely limit usage
- The local server balancer in `server/gemini/balancer.js` has slightly better defaults but still limited
- Most `maxOutputTokens` values are conservative and can be increased for paid tier
- Consider making `maxOutputTokens` configurable via environment variable for easier management
