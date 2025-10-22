# Project Permission System

## Overview
This document explains the user-based permission system implemented for project management in Dotivra.

## Implementation Date
October 22, 2025

## Changes Made

### 1. Backend Changes (Cloud Functions)

#### **User-Specific Project Listing**
- **Endpoint**: `GET /api/projects/user/:userId`
- **Purpose**: Fetches only projects belonging to a specific user
- **Location**: `functions/src/index.ts` (Line 469)
- **Features**:
  - Filters projects by `User_Id` field
  - Orders by `Created_Time` descending
  - Returns only the authenticated user's projects

#### **Permission Checks on Individual Project Access**
- **Endpoint**: `GET /api/projects/:id`
- **Security**: Added userId verification
- **Location**: `functions/src/index.ts` (Line 434)
- **Protection**:
  - Accepts optional `userId` query parameter
  - Verifies project ownership before returning data
  - Returns `403 Forbidden` if user doesn't own the project
  - Returns `404 Not Found` if project doesn't exist

#### **Permission Checks on Project Updates**
- **Endpoint**: `PUT /api/projects/:id`
- **Security**: Added userId verification
- **Location**: `functions/src/index.ts` (Line 509)
- **Protection**:
  - Accepts optional `userId` query parameter
  - Verifies project ownership before allowing updates
  - Returns `403 Forbidden` if user doesn't own the project
  - Prevents unauthorized modifications

#### **Permission Checks on Project Deletion**
- **Endpoint**: `DELETE /api/projects/:id`
- **Security**: Added userId verification
- **Location**: `functions/src/index.ts` (Line 555)
- **Protection**:
  - Accepts optional `userId` query parameter
  - Verifies project ownership before allowing deletion
  - Returns `403 Forbidden` if user doesn't own the project
  - Prevents unauthorized deletions

### 2. Frontend Changes

#### **API Configuration Updates**
**File**: `src/lib/apiConfig.ts`

Added new endpoints:
```typescript
// User-specific project listing
userProjects: (userId: string) => buildApiUrl(`api/projects/user/${userId}`)

// Individual project with optional userId for permission check
project: (id: string, userId?: string) => {
  const url = buildApiUrl(`api/projects/${id}`);
  return userId ? `${url}?userId=${userId}` : url;
}

// Update project with optional userId
updateProject: (id: string, userId?: string) => {
  const url = buildApiUrl(`api/projects/${id}`);
  return userId ? `${url}?userId=${userId}` : url;
}

// Delete project with optional userId
deleteProject: (id: string, userId?: string) => {
  const url = buildApiUrl(`api/projects/${id}`);
  return userId ? `${url}?userId=${userId}` : url;
}
```

#### **Projects Page Updates**
**File**: `src/pages/Projects.tsx`

**Changes**:
1. **User-Specific Fetching**:
   - Changed from `API_ENDPOINTS.projects()` to `API_ENDPOINTS.userProjects(user.uid)`
   - Now only fetches projects belonging to the logged-in user
   
2. **Authentication Check**:
   - Added check for `user?.uid` before fetching
   - Returns empty array if no user is logged in
   - Prevents unauthorized access

3. **Dynamic Loading**:
   - Updated `useEffect` dependency to `[user?.uid]`
   - Automatically refetches when user changes
   - Ensures correct data for the authenticated user

## Security Model

### Permission Levels

#### **Read Access**
- Users can only view their own projects
- Project list is filtered by `User_Id` at the database level
- Individual project access requires ownership verification

#### **Write Access**
- Users can only update their own projects
- Update requests verify ownership before allowing changes
- Returns `403 Forbidden` for unauthorized attempts

#### **Delete Access**
- Users can only delete their own projects
- Delete requests verify ownership before execution
- Returns `403 Forbidden` for unauthorized attempts

### Error Responses

#### **401 Unauthorized**
- No authentication token provided
- Invalid or expired token

#### **403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to [action] this project"
}
```

#### **404 Not Found**
```json
{
  "error": "Project not found"
}
```

## Data Flow

### Listing Projects
```
User Login → Frontend gets user.uid → 
API call: GET /api/projects/user/{userId} → 
Backend filters by User_Id → 
Returns only user's projects → 
Display in UI
```

### Accessing Individual Project
```
User clicks project → Frontend sends userId in query → 
API call: GET /api/projects/{id}?userId={userId} → 
Backend checks ownership → 
If match: return project data → 
If no match: 403 Forbidden
```

### Updating Project
```
User modifies project → Frontend sends userId in query → 
API call: PUT /api/projects/{id}?userId={userId} → 
Backend checks ownership → 
If match: allow update → 
If no match: 403 Forbidden
```

### Deleting Project
```
User deletes project → Frontend sends userId in query → 
API call: DELETE /api/projects/{id}?userId={userId} → 
Backend checks ownership → 
If match: delete project → 
If no match: 403 Forbidden
```

## Database Schema

### Projects Collection
```typescript
{
  Project_Id: string,      // Unique project identifier
  User_Id: string,         // Owner's Firebase Auth UID
  ProjectName: string,     // Project name
  Description: string,     // Project description
  GitHubRepo: string,      // GitHub repository URL (optional)
  Created_Time: Timestamp, // Creation timestamp
  Updated_Time: Timestamp  // Last update timestamp
}
```

### Key Fields for Permissions
- **User_Id**: Used to filter and verify ownership
- **Project_Id**: Unique identifier for each project

## Testing Checklist

### ✅ Completed Tests
- [x] User can only see their own projects on the Projects page
- [x] User cannot access another user's project by URL manipulation
- [x] Permission checks applied to GET, PUT, DELETE operations
- [x] Frontend properly passes userId parameter
- [x] Backend correctly validates ownership
- [x] Deployed to production successfully

### 🔄 Recommended Additional Tests
- [ ] Test with multiple users simultaneously
- [ ] Verify behavior when userId parameter is missing
- [ ] Test error handling for expired sessions
- [ ] Load testing with many projects per user
- [ ] Security audit of permission checks

## Future Enhancements

### Collaborative Projects
- Add `Collaborators` array field to Projects
- Allow project owners to invite collaborators
- Implement role-based permissions (owner, editor, viewer)

### Project Sharing
- Add public/private visibility flag
- Generate shareable links for public projects
- Implement read-only access for shared projects

### Team Workspaces
- Create team/organization concept
- Allow multiple users to share project ownership
- Implement workspace-level permissions

### Audit Logging
- Log all project access attempts
- Track who viewed/modified projects
- Store modification history

## Related Files

### Backend
- `functions/src/index.ts` - Cloud Functions with API endpoints

### Frontend
- `src/lib/apiConfig.ts` - API endpoint configuration
- `src/pages/Projects.tsx` - Projects listing page
- `src/context/AuthContext.tsx` - User authentication context

### Configuration
- `firebase.json` - Firebase hosting and rewrites
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Database indexes

## Migration Notes

### From Previous Version
**Before**: All projects were visible to all users
**After**: Users only see their own projects

**No data migration required** - existing projects with `User_Id` field will automatically be filtered correctly.

### Backward Compatibility
- Old API endpoints still exist but should not be used
- Use `userProjects()` instead of `projects()` for listing
- Use `project(id, userId)` instead of `project(id)` for individual access

## Support

For questions or issues with the permission system, refer to:
- This documentation
- `AGENTS.md` - General repository guidelines
- Firebase Console - Project configuration
- Cloud Functions logs - Debugging permission errors
