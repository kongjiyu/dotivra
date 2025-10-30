// src/services/authService.ts
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  linkWithCredential,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  type User,
  type AuthError
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const auth = getAuth();

// Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Add scopes for GitHub - Enhanced for repository access
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');
githubProvider.addScope('repo'); // Access to public and private repositories
githubProvider.addScope('read:org'); // Read organization membership

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: string;
  createdAt: any;
  lastLoginAt: any;
  // GitHub-specific fields
  githubUsername?: string;
  githubAccessToken?: string; // Encrypted
  githubTokenExpiry?: any;
  githubScopes?: string[];
}

class AuthService {
  // Email/Password Sign In
  async signInWithEmail(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        return {
          success: false,
          error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          needsVerification: true,
          user: userCredential.user
        };
      }
      
      await this.updateUserProfile(userCredential.user, 'email');
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Email sign in error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error as AuthError) 
      };
    }
  }

  // Email/Password Sign Up
  async signUpWithEmail(email: string, password: string, displayName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send email verification
      await sendEmailVerification(userCredential.user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false
      });
      
      // Create user profile in Firestore
      await this.createUserProfile(userCredential.user, 'email', displayName);
      
      return { 
        success: true, 
        user: userCredential.user,
        needsVerification: true,
        message: 'Account created! Please check your email to verify your account before signing in.'
      };
    } catch (error) {
      console.error('Email sign up error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error as AuthError) 
      };
    }
  }

  // Google Sign In
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await this.updateUserProfile(result.user, 'google');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error as AuthError) 
      };
    }
  }

  // GitHub Sign In - Enhanced with token capture and account linking
  async signInWithGitHub() {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      
      // Extract GitHub access token from credential
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubAccessToken = credential?.accessToken;
      
      if (githubAccessToken) {
        // Store GitHub-specific information
        await this.updateUserProfileWithGitHub(result.user, 'github', {
          accessToken: githubAccessToken,
          scopes: ['read:user', 'user:email', 'repo', 'read:org'],
          username: result.user.displayName || 'unknown'
        });
      } else {
        // Fallback to regular profile update
        await this.updateUserProfile(result.user, 'github');
      }
      
      return { 
        success: true, 
        user: result.user,
        hasGitHubAccess: !!githubAccessToken
      };
    } catch (error: any) {
      console.error('GitHub sign in error:', error);
      
      // Handle account linking when email already exists with different provider
      if (error.code === 'auth/account-exists-with-different-credential') {
        try {
          // Get the pending GitHub credential
          const pendingCredential = GithubAuthProvider.credentialFromError(error);
          
          if (pendingCredential && error.customData?.email) {
            // The user needs to sign in with their existing method first
            // and then link the GitHub account
            return {
              success: false,
              error: 'An account already exists with this email using a different sign-in method.',
              needsLinking: true,
              pendingCredential,
              email: error.customData.email,
              existingProviders: error.customData.allProviders || []
            };
          }
        } catch (linkError) {
          console.error('Error handling account linking:', linkError);
        }
      }
      
      return { 
        success: false, 
        error: this.getErrorMessage(error as AuthError) 
      };
    }
  }

  // Link GitHub account to existing user
  async linkGitHubAccount(pendingCredential: any) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }

      // Link the GitHub credential to the current user
      const result = await linkWithCredential(currentUser, pendingCredential);
      
      // Extract GitHub access token from the linked credential
      const githubAccessToken = pendingCredential?.accessToken;
      
      if (githubAccessToken) {
        // Store GitHub-specific information
        await this.updateUserProfileWithGitHub(result.user, 'github', {
          accessToken: githubAccessToken,
          scopes: ['read:user', 'user:email', 'repo', 'read:org'],
          username: result.user.displayName || 'unknown'
        });
      }

      return {
        success: true,
        user: result.user,
        hasGitHubAccess: !!githubAccessToken
      };
    } catch (error) {
      console.error('GitHub account linking error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      };
    }
  }

  // Sign Out
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error as AuthError) 
      };
    }
  }

  // Create user profile in Firestore
  private async createUserProfile(user: User, provider: string, displayName?: string) {
    const userRef = doc(db, 'Users', user.uid);
    
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName || user.displayName || 'Anonymous User',
      photoURL: user.photoURL || undefined,
      provider,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };

    await setDoc(userRef, userProfile);
    return userProfile;
  }

  // Update user profile on sign in
  private async updateUserProfile(user: User, provider: string) {
    const userRef = doc(db, 'Users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Update existing user
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp()
      }, { merge: true });
    } else {
      // Create new user profile
      await this.createUserProfile(user, provider);
    }
  }

  // Update user profile with GitHub-specific data
  private async updateUserProfileWithGitHub(
    user: User, 
    provider: string,
    githubData: {
      accessToken: string;
      scopes: string[];
      username: string;
    }
  ) {
    const userRef = doc(db, 'Users', user.uid);
    const userDoc = await getDoc(userRef);

    // Create a simple encryption for the token (base64 + timestamp)
    const encryptedToken = this.encryptToken(githubData.accessToken);

    if (userDoc.exists()) {
      // Update existing user with GitHub data
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        githubUsername: githubData.username,
        githubAccessToken: encryptedToken,
        githubTokenExpiry: new Date(Date.now() + 8760 * 60 * 60 * 1000), // 1 year
        githubScopes: githubData.scopes
      }, { merge: true });
    } else {
      // Create new user profile with GitHub data
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        provider,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        githubUsername: githubData.username,
        githubAccessToken: encryptedToken,
        githubTokenExpiry: new Date(Date.now() + 8760 * 60 * 60 * 1000),
        githubScopes: githubData.scopes
      };

      await setDoc(userRef, userProfile);
    }
  }

  // Simple token encryption (you may want to use a more robust method in production)
  private encryptToken(token: string): string {
    const timestamp = Date.now().toString();
    const combined = token + '|' + timestamp;
    return btoa(combined); // Base64 encoding
  }

  // Decrypt token
  async decryptToken(encryptedToken: string): Promise<string | null> {
    try {
      const decoded = atob(encryptedToken);
      const [token, timestamp] = decoded.split('|');
      
      // Check if token is still valid (not older than 1 year)
      const tokenAge = Date.now() - parseInt(timestamp);
      const oneYear = 8760 * 60 * 60 * 1000;
      
      if (tokenAge > oneYear) {
        return null; // Token expired
      }
      
      return token;
    } catch (error) {
      console.error('Token decryption failed:', error);
      return null;
    }
  }

  // Get GitHub access token for authenticated user
  async getGitHubAccessToken(uid: string): Promise<string | null> {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (userProfile?.githubAccessToken) {
        return await this.decryptToken(userProfile.githubAccessToken);
      }
      return null;
    } catch (error) {
      console.error('Failed to get GitHub access token:', error);
      return null;
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'Users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Auth state observer
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }

  // ============================================================================
  // EMAIL VERIFICATION METHODS
  // ============================================================================

  /**
   * Send verification email to current user
   */
  async sendVerificationEmail(user?: User) {
    try {
      const currentUser = user || auth.currentUser;
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }

      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false
      });

      return {
        success: true,
        message: 'Verification email sent! Please check your inbox.'
      };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      };
    }
  }

  /**
   * Check if current user's email is verified
   */
  async isEmailVerified(): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    
    // Reload user to get fresh verification status
    await currentUser.reload();
    return currentUser.emailVerified;
  }

  /**
   * Verify email with action code (from verification link)
   */
  async verifyEmailWithCode(actionCode: string) {
    try {
      // Verify the action code is valid
      await checkActionCode(auth, actionCode);
      
      // Apply the action code to verify the email
      await applyActionCode(auth, actionCode);

      return {
        success: true,
        message: 'Email verified successfully! You can now sign in.'
      };
    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        success: false,
        error: 'Invalid or expired verification link. Please request a new one.'
      };
    }
  }

  // ============================================================================
  // PASSWORD RESET METHODS
  // ============================================================================

  /**
   * Send password reset email to user
   */
  async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login?reset=true`,
        handleCodeInApp: false
      });

      return {
        success: true,
        message: 'Password reset email sent! Please check your inbox.'
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      };
    }
  }

  /**
   * Verify password reset code
   */
  async verifyPasswordResetCode(actionCode: string) {
    try {
      const email = await verifyPasswordResetCode(auth, actionCode);
      return {
        success: true,
        email
      };
    } catch (error) {
      console.error('Error verifying password reset code:', error);
      return {
        success: false,
        error: 'Invalid or expired reset link. Please request a new one.'
      };
    }
  }

  /**
   * Confirm password reset with new password
   */
  async confirmPasswordReset(actionCode: string, newPassword: string) {
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      
      return {
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      };
    }
  }

  // Error message helper
  private getErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/cancelled-popup-request':
        return 'Another sign-in popup is already open.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method.';
      default:
        return error.message || 'An error occurred during authentication.';
    }
  }
}

export const authService = new AuthService();
export { auth };