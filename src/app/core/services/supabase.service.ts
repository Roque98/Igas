import { Injectable, OnDestroy } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TABLES } from '../constants/tables';

// Security configuration constants
const SECURITY_CONFIG = {
  STORAGE_KEY: 'igas-auth-token',
  HIDDEN_TIMESTAMP_KEY: 'igas-hidden-at',
  MAX_HIDDEN_DURATION_MS: 30 * 60 * 1000, // 30 minutes - revalidate session after this
  SESSION_CHECK_INTERVAL_MS: 5 * 60 * 1000 // 5 minutes - periodic session check
} as const;

@Injectable({
  providedIn: 'root'
})
export class SupabaseService implements OnDestroy {
  private supabase: SupabaseClient;
  private currentUser: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUser.asObservable();

  // Security: Store bound event handlers for proper cleanup
  private boundVisibilityHandler: () => void;
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Create Supabase client with enhanced security configuration
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // SECURITY: Use sessionStorage instead of localStorage
        // sessionStorage is cleared when browser/tab closes, reducing token exposure
        storage: window.sessionStorage,
        storageKey: SECURITY_CONFIG.STORAGE_KEY,
        flowType: 'pkce'
      }
    });

    // Bind handlers for proper cleanup
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);

    // Initialize security listeners
    this.setupSecurityListeners();

    this.loadUser();
    this.authChanges();
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.removeSecurityListeners();
  }

  /**
   * Setup security event listeners
   * - Monitors page visibility to detect prolonged inactivity
   * - Periodically validates session integrity
   */
  private setupSecurityListeners(): void {
    // Monitor page visibility changes
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    // Periodic session validation (defense in depth)
    this.sessionCheckInterval = setInterval(() => {
      this.validateSessionIntegrity();
    }, SECURITY_CONFIG.SESSION_CHECK_INTERVAL_MS);
  }

  /**
   * Remove security event listeners (prevents memory leaks)
   */
  private removeSecurityListeners(): void {
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler);

    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }

    // Cleanup hidden timestamp
    sessionStorage.removeItem(SECURITY_CONFIG.HIDDEN_TIMESTAMP_KEY);
  }

  /**
   * Handle page visibility changes
   * Tracks when page becomes hidden and validates session when it returns
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is now hidden - record timestamp
      sessionStorage.setItem(SECURITY_CONFIG.HIDDEN_TIMESTAMP_KEY, Date.now().toString());
    } else {
      // Page is visible again - check how long it was hidden
      this.checkHiddenDuration();
    }
  }

  /**
   * Check how long the page was hidden and revalidate session if needed
   */
  private async checkHiddenDuration(): Promise<void> {
    const hiddenAt = sessionStorage.getItem(SECURITY_CONFIG.HIDDEN_TIMESTAMP_KEY);

    if (hiddenAt) {
      const hiddenDuration = Date.now() - parseInt(hiddenAt, 10);
      sessionStorage.removeItem(SECURITY_CONFIG.HIDDEN_TIMESTAMP_KEY);

      // If hidden for too long, force session revalidation
      if (hiddenDuration > SECURITY_CONFIG.MAX_HIDDEN_DURATION_MS) {
        if (!environment.production) {
          console.log('🔒 Session revalidation triggered after prolonged inactivity');
        }
        await this.forceSessionRefresh();
      }
    }
  }

  /**
   * Force session refresh - used after prolonged inactivity
   */
  private async forceSessionRefresh(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.refreshSession();

      if (error) {
        // Session invalid - sign out user
        if (!environment.production) {
          console.warn('🔒 Session refresh failed, signing out user');
        }
        await this.signOut();
      }
    } catch {
      // On any error, sign out for security
      await this.signOut();
    }
  }

  /**
   * Periodic session integrity validation
   * Ensures session hasn't been tampered with
   */
  private async validateSessionIntegrity(): Promise<void> {
    if (!this.currentUser.value) return;

    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error || !data.session) {
        // Session is invalid but we think user is logged in - clear state
        if (!environment.production) {
          console.warn('🔒 Session integrity check failed');
        }
        this.currentUser.next(null);
      }
    } catch {
      // Silent fail - don't interrupt user experience
    }
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
  private async loadUser(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        // If there's an error getting the session (e.g., invalid refresh token),
        // clear the session to avoid repeated errors
        this.logDebug('Error loading session:', error);
        await this.supabase.auth.signOut();
        this.currentUser.next(null);
        return;
      }

      this.currentUser.next(data.session?.user ?? null);
    } catch (error) {
      this.logDebug('Unexpected error loading user:', error);
      this.currentUser.next(null);
    }
  }

  /**
   * Development-only logging utility
   * Prevents sensitive information from being logged in production
   */
  private logDebug(message: string, data?: unknown): void {
    if (!environment.production) {
      if (data) {
        if (!environment.production) { console.log(message, data); }
      } else {
        if (!environment.production) { console.log(message); }
      }
    }
  }

  /**
   * Listen to auth state changes
   * Handles automatic token refresh and session management
   */
  private authChanges(): void {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      // Log authentication events for debugging (only in development)
      switch (event) {
        case 'SIGNED_IN':
          this.logDebug('User signed in successfully');
          break;
        case 'SIGNED_OUT':
          this.logDebug('User signed out');
          // Security: Clear any residual data on sign out
          this.clearSecurityData();
          break;
        case 'TOKEN_REFRESHED':
          this.logDebug('Token refreshed automatically');
          break;
        case 'USER_UPDATED':
          this.logDebug('User profile updated');
          break;
        case 'PASSWORD_RECOVERY':
          this.logDebug('Password recovery initiated');
          break;
        default:
          this.logDebug(`Auth event: ${event}`);
      }

      // Update current user observable
      this.currentUser.next(session?.user ?? null);

      // Handle session expiry or refresh errors
      if (!session && event !== 'SIGNED_OUT') {
        this.logDebug('Session lost - user may need to re-authenticate');
      }
    });
  }

  /**
   * Clear all security-related data from storage
   */
  private clearSecurityData(): void {
    sessionStorage.removeItem(SECURITY_CONFIG.HIDDEN_TIMESTAMP_KEY);
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
        this.logDebug('Error refreshing session:', error);
        // If refresh fails, sign out to clear bad tokens
        await this.signOut();
        return { data: null, error };
      }

      this.logDebug('Session refreshed manually');
      return { data, error: null };
    } catch (error) {
      this.logDebug('Unexpected error refreshing session:', error);
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

  // ============================================================================
  // Security: Login Attempt Management
  // ============================================================================

  /**
   * Check if a user is blocked due to too many failed login attempts
   * @param email - The email to check
   * @returns Object with isBlocked status and remaining seconds until unblock
   */
  async isUserBlocked(email: string): Promise<{ isBlocked: boolean; secondsUntilUnblock: number }> {
    try {
      // Call the database function to check if user is blocked
      const { data, error } = await this.supabase.rpc('is_user_blocked', {
        user_email: email
      });

      if (error) {
        this.logDebug('Error checking user blocked status:', error);
        // On error, allow login attempt (fail open for better UX)
        return { isBlocked: false, secondsUntilUnblock: 0 };
      }

      if (data === true) {
        // User is blocked, get time until unblock from blocked_users view
        const { data: blockInfo } = await this.supabase
          .from(TABLES.BLOCKED_USERS)
          .select('seconds_until_unblock')
          .eq('email', email)
          .single();

        return {
          isBlocked: true,
          secondsUntilUnblock: blockInfo?.seconds_until_unblock || 900 // Default 15 min
        };
      }

      return { isBlocked: false, secondsUntilUnblock: 0 };
    } catch (error) {
      this.logDebug('Unexpected error checking blocked status:', error);
      return { isBlocked: false, secondsUntilUnblock: 0 };
    }
  }

  /**
   * Record a failed login attempt
   * @param email - The email that failed
   * @param errorCode - Error code from Supabase
   * @param errorMessage - Error message
   */
  async recordFailedAttempt(email: string, errorCode: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('record_failed_login_attempt', {
        attempt_email: email,
        attempt_error_code: errorCode,
        attempt_error_message: errorMessage
      });

      if (error) {
        this.logDebug('Error recording failed attempt:', error);
      }
    } catch (error) {
      this.logDebug('Unexpected error recording failed attempt:', error);
    }
  }

  /**
   * Get remaining login attempts before block
   * @param email - The email to check
   * @returns Number of remaining attempts (0 if blocked)
   */
  async getRemainingAttempts(email: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_remaining_login_attempts', {
        user_email: email
      });

      if (error) {
        this.logDebug('Error getting remaining attempts:', error);
        return 5; // Default to max attempts on error
      }

      return data ?? 5;
    } catch (error) {
      this.logDebug('Unexpected error getting remaining attempts:', error);
      return 5;
    }
  }
}
