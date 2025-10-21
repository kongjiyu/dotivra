# Gemini Dashboard Updates

## Summary of Changes

### 1. Dashboard Authentication ✅
- Added passkey authentication using `GEMINI_DASHBOARD_PASS` from .env
- Session management with 10-minute timeout
- Session storage in localStorage on client
- Server-side session validation with Map storage

### 2. Firebase Integration ✅
- Dashboard now reads directly from Firebase Firestore
- New method `getUsageFromFirebase()` in balancer.js
- Collection: `gemini-metrics`
- Real-time metrics from Firebase instead of in-memory state

### 3. Enhanced Logging ✅
- Added detailed logging to `_markUsage()` method
- Enhanced `_save()` method with step-by-step logging
- Tracks when usage is marked and when saves occur

## Files Modified

### Backend Files

#### `server.js`
- Added `dashboardSessions` Map for session storage
- New endpoints:
  - `POST /api/gemini/auth` - Authenticate with passkey
  - `POST /api/gemini/verify-session` - Check if session is valid
  - `POST /api/gemini/logout` - End session
- Updated `GET /api/gemini/dashboard` to:
  - Require authentication via `x-session-id` header
  - Read from Firebase using `getUsageFromFirebase()`

#### `server/gemini/balancer.js`
- New method: `getUsageFromFirebase()` - Reads metrics from Firebase collection
- Enhanced `_save()` with detailed logging:
  - Logs start of save operation
  - Logs each key being saved with data
  - Logs success for each key
  - Logs completion of all saves
- Enhanced `_markUsage()` with usage tracking logs:
  - Logs which key is being marked
  - Logs new totals after marking

### Frontend Files

#### `src/services/geminiBalance.ts`
- Added session management functions:
  - `authenticate(passkey)` - Login with passkey
  - `verifySession()` - Check if session is still valid
  - `logout()` - End session
  - `getSessionId()` - Get current session ID
- Updated `getDashboard()` to include `x-session-id` header
- Added localStorage helpers for session persistence
- Updated types to support both in-memory and Firebase field names

#### `src/pages/gemini/GeminiDashboard.tsx`
- Complete authentication UI:
  - Passkey entry form
  - Session expiry countdown
  - Auto-session check on mount
  - Logout button
- Session management:
  - Checks for existing session on load
  - Auto-refreshes when authenticated
  - Shows remaining session time
  - Handles session expiration gracefully
- Error handling for 401 (unauthorized) responses

## Environment Variables Required

```env
GEMINI_DASHBOARD_PASS=gCP&*mHcKp8YPX!b*UbC
```

## How to Test

### 1. Start the Server
```bash
npm run server
```

### 2. Watch Console Logs
Look for these indicators:
- `✅ Firebase initialized successfully`
- `📦 Loading Gemini usage data from Firebase...`
- `✅ Gemini usage data loaded from Firebase`

### 3. Test Authentication Flow

#### A. Open Dashboard
Navigate to the Gemini dashboard page

#### B. Enter Passkey
Enter: `gCP&*mHcKp8YPX!b*UbC`

#### C. Verify Session Created
Check browser console for successful login
Check localStorage for `gemini_dashboard_session`

#### D. Verify Data Loads from Firebase
Dashboard should display metrics from Firebase collection

### 4. Test AI Generation & Metrics Update

#### A. Send AI Chat Message
Use the AI chat feature to generate content

#### B. Watch Server Console
Look for these logs:
```
🔵 Gemini API Request received
📊 Marking usage for key f93a5a0c91f1: 1234 tokens
  📊 New totals: RPM=1, RPD=1, TPM=1234, Total=1 req, 1234 tokens
💾 Starting save to Firebase...
  💾 Saving key f93a5a0c91f1: {...}
  ✅ Successfully saved key f93a5a0c91f1
✅ All keys saved to Firebase successfully
```

#### C. Check Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Find `gemini-metrics` collection
4. Verify documents are being updated with:
   - RPD, RPM, TPM
   - totalRequest, totalTokens
   - updatedAt timestamp

### 5. Test Session Expiry

#### A. Wait or Manually Expire
- Wait 10 minutes OR
- Clear the session from server manually

#### B. Verify Auto-Logout
- Dashboard should detect expired session
- Should show "Session expired" message
- Should redirect to login form

### 6. Test Logout
Click the "Logout" button
Verify session is cleared and returns to login form

## Debugging Firebase Saves

If metrics still don't update to Firebase, check:

1. **Firestore Instance Valid?**
   ```javascript
   console.log('Firestore instance:', this.firestore);
   ```

2. **Save Method Called?**
   Watch for `💾 Starting save to Firebase...` log

3. **Debounced Save Executing?**
   The save is debounced by 500ms, so it may not be immediate

4. **Firebase Rules Allow Writes?**
   Check `firestore.rules` for `gemini-metrics` collection

5. **Check Firebase Console**
   Look for write errors in Firebase Console logs

6. **Network Tab**
   Check browser network tab for Firebase API calls

## Expected Behavior

### Before Changes
- ❌ Dashboard showed in-memory state only
- ❌ No authentication required
- ❌ No session management
- ❌ Unclear if metrics were saving to Firebase

### After Changes
- ✅ Dashboard reads directly from Firebase
- ✅ Passkey required to access dashboard
- ✅ 10-minute session timeout
- ✅ Detailed logging shows save operations
- ✅ Session expiry countdown visible
- ✅ Logout functionality
- ✅ Graceful session expiration handling

## Collection Structure

### Firebase Collection: `gemini-metrics`

Document ID: SHA-256 hash of API key

Fields:
```javascript
{
  RPD: number,           // Requests per day used
  RPM: number,           // Requests per minute used
  TPM: number,           // Tokens per minute used
  cooldownTime: Date,    // Cooldown timestamp
  lastUsed: Date,        // Last usage timestamp
  totalRequest: number,  // Total requests lifetime
  totalTokens: number,   // Total tokens lifetime
  createdAt: Date,       // Document creation
  updatedAt: Date        // Last update
}
```

## Security Notes

1. **Passkey**: Stored in .env, never exposed to client
2. **Sessions**: Server-side validation prevents tampering
3. **Timeout**: 10-minute sessions prevent unauthorized access
4. **Firebase Rules**: Allow all for server operations (server has admin SDK)
5. **API Keys**: Never exposed in dashboard, only hashed IDs shown
