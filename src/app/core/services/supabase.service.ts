import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUser.asObservable();

  constructor() {
    // Create Supabase client with explicit auth configuration
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        autoRefreshToken: true, // Automatically refresh the token before expiry
        persistSession: true, // Persist session in localStorage
        detectSessionInUrl: true, // Detect OAuth session in URL (for password reset)
        storage: window.localStorage, // Use localStorage for session persistence
        storageKey: 'igas-auth-token', // Custom storage key for better organization
        flowType: 'pkce' // Use PKCE flow for better security
      }
    });
    this.loadUser();
    this.authChanges();
  }

  /**
   * Get the Supabase client instance
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get the current user
   */
  get user(): User | null {
    return this.currentUser.value;
  }

  /**
   * Load the current user from session
   */
  private async loadUser() {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        // If there's an error getting the session (e.g., invalid refresh token),
        // clear the session to avoid repeated errors
        console.error('Error loading session:', error);
        await this.supabase.auth.signOut();
        this.currentUser.next(null);
        return;
      }

      this.currentUser.next(data.session?.user ?? null);
    } catch (error) {
      console.error('Unexpected error loading user:', error);
      this.currentUser.next(null);
    }
  }

  /**
   * Listen to auth state changes
   * Handles automatic token refresh and session management
   */
  private authChanges() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      // Log authentication events for debugging
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in successfully');
          break;
        case 'SIGNED_OUT':
          console.log('👋 User signed out');
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed automatically');
          // Token was successfully refreshed before expiry
          break;
        case 'USER_UPDATED':
          console.log('👤 User profile updated');
          break;
        case 'PASSWORD_RECOVERY':
          console.log('🔑 Password recovery initiated');
          break;
        default:
          console.log(`🔔 Auth event: ${event}`);
      }

      // Update current user observable
      this.currentUser.next(session?.user ?? null);

      // Handle session expiry or refresh errors
      if (!session && event !== 'SIGNED_OUT') {
        console.warn('⚠️ Session lost - user may need to re-authenticate');
      }
    });
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    return { data, error };
  }

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  /**
   * Reset password - Send recovery email
   */
  async resetPassword(email: string) {
    // Use hash routing format for GitHub Pages
    const redirectUrl = `${window.location.origin}/#/reset-password`;
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { data, error };
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser.value !== null;
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    return { data, error };
  }

  /**
   * Manually refresh the session token
   * This is useful if you need to force a token refresh
   * Note: Supabase automatically refreshes tokens, so this is rarely needed
   */
  async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        console.error('❌ Error refreshing session:', error);
        // If refresh fails, sign out to clear bad tokens
        await this.signOut();
        return { data: null, error };
      }

      console.log('✅ Session refreshed manually');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Unexpected error refreshing session:', error);
      return { data: null, error };
    }
  }

  /**
   * Get session information including token expiry
   * Useful for debugging and monitoring session status
   */
  async getSessionInfo() {
    const { data, error } = await this.getSession();

    if (error || !data.session) {
      return null;
    }

    const session = data.session;
    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
    const now = new Date();
    const timeUntilExpiry = expiresAt ? expiresAt.getTime() - now.getTime() : null;
    const minutesUntilExpiry = timeUntilExpiry ? Math.floor(timeUntilExpiry / 1000 / 60) : null;

    return {
      user: session.user,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt,
      minutesUntilExpiry,
      isExpired: expiresAt ? now > expiresAt : true
    };
  }
}
