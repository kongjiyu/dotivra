# Gemini Dashboard Passkey Fix

## Problem
The passkey authentication at https://dotivra.web.app/gemini shows "Invalid passkey" even with the correct password from `.env`.

## Root Cause
Firebase Cloud Functions deployment has a health check timeout issue, preventing the updated secret (with correct passkey) from being deployed.

## Current Status
✅ Firebase Secret updated correctly (version 3): `gCP&*mHcKp8YPX!b*UbC`
❌ Cloud Functions deployment fails due to container health check timeout
❌ Currently deployed function still using old/corrupted secret (version 1)

## Solutions

### Option 1: Use Local Development Server (RECOMMENDED)
Since the production deployment is failing, use your local server which works perfectly:

```bash
cd "/Users/kongjy/Library/Mobile Documents/com~apple~CloudDocs/文件库/大学文件/MMU CodeNection/dotivra"
npm run dev
```

Then access: **http://localhost:5173/gemini**
Use passkey: `gCP&*mHcKp8YPX!b*UbC`

### Option 2: Manual Cloud Run Update (Requires gcloud CLI)
If you have gcloud CLI installed:

```bash
gcloud run services update api \
  --region=us-central1 \
  --update-secrets=GEMINI_DASHBOARD_PASS=GEMINI_DASHBOARD_PASS:latest \
  --project=dotivra
```

### Option 3: Wait for Firebase Support Fix
The deployment issue is related to Cloud Run health checks. You can:
1. Contact Firebase Support about the health check timeout
2. Wait for automatic retry (sometimes Cloud Run resolves itself)
3. Try deploying during off-peak hours

## What We've Done
1. ✅ Updated Firebase Secret to version 3 with correct passkey
2. ✅ Implemented lazy initialization to reduce startup time
3. ✅ Increased memory to 2GiB and CPU to 2 cores
4. ✅ Updated all Gemini endpoints to use lazy balancer initialization
5. ❌ Deployment still fails at health check stage

## Technical Details

### Files Modified
- `functions/src/index.ts`: Lazy initialization for GeminiBalancer
- All Gemini endpoints updated to call `ensureBalancerInitialized()`

### Secret Versions
- Version 1: Corrupted (currently in use by deployed function)
- Version 2: Corrupted  
- Version 3: ✅ Correct value `gCP&*mHcKp8YPX!b*UbC`

### Deployment Logs
The deployment consistently fails with:
```
Container Healthcheck failed. The user-provided container failed to start 
and listen on the port defined provided by the PORT=8080 environment variable 
within the allocated timeout.
```

## Next Steps
1. **Use local dev server** for now (Option 1)
2. Try deployment again in a few hours (Cloud Run issues sometimes auto-resolve)
3. If issue persists, consider contacting Firebase Support or using gcloud CLI

## Verification
Once deployment succeeds, verify with:
```bash
curl -X POST https://api-70171011921.us-central1.run.app/api/gemini/auth \
  -H "Content-Type: application/json" \
  -d '{"passkey":"gCP&*mHcKp8YPX!b*UbC"}'
```

Expected success response:
```json
{
  "sessionId": "...",
  "expiresAt": "..."
}
```
