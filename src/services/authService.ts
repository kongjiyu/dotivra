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

// Add scopes for GitHub
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: string;
  createdAt: any;
  lastLoginAt: any;
}

class AuthService {
  // Email/Password Sign In
  async signInWithEmail(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
      
      // Create user profile in Firestore
      await this.createUserProfile(userCredential.user, 'email', displayName);
      
      return { success: true, user: userCredential.user };
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

  // GitHub Sign In
  async signInWithGitHub() {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      await this.updateUserProfile(result.user, 'github');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('GitHub sign in error:', error);
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