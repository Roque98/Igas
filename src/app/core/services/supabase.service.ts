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
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
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
    const { data } = await this.supabase.auth.getSession();
    this.currentUser.next(data.session?.user ?? null);
  }

  /**
   * Listen to auth state changes
   */
  private authChanges() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.next(session?.user ?? null);
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
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
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
}
