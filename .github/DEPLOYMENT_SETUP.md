# GitHub Actions Deployment Setup Guide

## Overview
This repository uses GitHub Actions for automated deployments to production.

## Environment Structure

### 🚀 Production Environment
- **Branch**: `main`
- **Firebase Project**: `dotivra`
- **Trigger**: Push to `main` branch
- **Workflow**: `.github/workflows/deploy-production.yml`

### 🔍 Preview Environments
- **Trigger**: Pull requests to `main`
- **Workflow**: `.github/workflows/preview-pr.yml`
- **Duration**: 7 days (auto-expires)

## Setup Instructions

### 1. Get Firebase CI Token

```bash
# Login to Firebase
firebase login

# Get CI token for production
firebase login:ci

# Save this token - you'll need it in the next step
```

### **Step 2: Add GitHub Secrets**
1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add the following secrets:
   - `FIREBASE_TOKEN` - Token from step 1
   - All `VITE_*` environment variables (see ENV_SETUP_GUIDE.md)

**📖 Full list of required secrets**: See `.github/ENV_SETUP_GUIDE.md`

### 3. Update Preview URL Template

In `.github/workflows/preview-pr.yml`, replace `<YOUR_PROJECT_ID>` with `dotivra` on line 49.

## Development Workflow

### Feature Development
1. Create feature branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. Make your changes and commit

3. Create PR to `main` branch
   - This triggers preview deployment
   - Review changes in preview URL
   - CI tests run automatically

4. After approval, merge to `main`
   - Automatically deploys to production

## Testing Before Production

### Preview Deployments
- Every PR gets a temporary preview URL
- Test your changes in the preview environment
- Preview expires after 7 days

### Local Testing
- Test locally before creating PR:
  ```bash
  npm run dev        # Test frontend
  npm run server     # Test backend
  npm run build      # Ensure build works
  ```

### Automated Testing (Future Enhancement)
Consider adding:
- Unit tests with Jest/Vitest
- E2E tests with Playwright/Cypress
- API tests for Cloud Functions

## Monitoring Deployments

### View Deployment Status
- Go to **Actions** tab in GitHub repository
- Check workflow runs
- View logs for any failures

### Firebase Console
- Production: https://console.firebase.google.com/project/dotivra

## Rollback Strategy

### Quick Rollback
```bash
# Revert to previous deployment
firebase hosting:rollback

# Or deploy a specific version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID SITE_ID
```

### Git Revert
```bash
# Revert problematic commit
git revert <commit-hash>
git push origin main

# This triggers automatic deployment of the reverted version
```

## Environment Variables

Environment variables are set in:
- `vite.config.ts` (build-time variables)
- Firebase Functions configuration
- Cloud Run environment variables

To update Firebase Functions config:
```bash
firebase functions:config:set api.key="your-key"
```

## Cost Optimization

### Preview Channels
- Auto-expire after 7 days
- Limited to active PRs
- Clean up old channels manually if needed:
  ```bash
  firebase hosting:channel:list
  firebase hosting:channel:delete <channel-id>
  ```

### Monitor Usage
- Check Firebase Console regularly
- Set up billing alerts
- Review Cloud Functions usage

## Troubleshooting

### Build Fails
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check environment variables

### Deployment Fails
- Verify Firebase token is valid
- Check Firebase project permissions
- Review deployment logs in GitHub Actions

### Functions Deployment Issues
- Check `functions/package.json` dependencies
- Verify Node.js runtime version in Firebase
- Review function logs in Firebase Console

## Security Best Practices

1. **Never commit secrets** to the repository
2. Use GitHub Secrets for sensitive data
3. Rotate Firebase tokens periodically
4. Review Firestore security rules before deployment
5. Test thoroughly in preview environments before merging

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review Firebase deployment logs
3. Consult Firebase documentation
4. Check this guide for common solutions
