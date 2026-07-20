import { Injectable, inject } from '@angular/core';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService, ApiResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private refreshSubscription: Subscription | null = null;
  private static readonly AUTH_KEY = 'vfx_auth';

  /** Stores the authenticated flag in localStorage. */
  setAuthenticated(value: boolean): void {
    if (value) {
      localStorage.setItem(AuthService.AUTH_KEY, '1');
    } else {
      localStorage.removeItem(AuthService.AUTH_KEY);
    }
  }

  /** Returns true if the local auth flag is set (no server verification). */
  isLocallyAuthenticated(): boolean {
    return localStorage.getItem(AuthService.AUTH_KEY) === '1';
  }

  /** Sends login credentials to the API. */
  login(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('login/', data);
  }

  /** Sends a guest-login request. */
  guestLogin(): Observable<ApiResponse> {
    return this.api.post('guest-login/', {});
  }

  /** Sends a registration request. */
  register(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('register/', data);
  }

  /** Clears the local auth flag, stops token refresh, and calls the logout endpoint. */
  logout(): Observable<ApiResponse> {
    this.stopTokenRefreshInterval();
    this.setAuthenticated(false); // Clear local state immediately
    return this.api.post('logout/', {});
  }

  /** Sends a password-reset email request. */
  forgotPassword(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('password_reset/', data);
  }

  /** Submits a new password using the uid/token from the reset email. */
  confirmPassword(
    uid: string,
    token: string,
    data: { new_password: string; confirm_password: string },
  ): Observable<ApiResponse> {
    return this.api.post(`password_confirm/${uid}/${token}/`, data);
  }

  /** Activates the user account using the uid/token from the confirmation email. */
  activate(uid: string, token: string): Observable<ApiResponse> {
    return this.api.get(`activate/${uid}/${token}/`);
  }

  /** Starts a 20-minute interval that silently refreshes the access token. */
  startTokenRefreshInterval(): void {
    this.refreshSubscription = interval(20 * 60 * 1000)
      .pipe(switchMap(() => this.api.post('token/refresh/', {})))
      .subscribe();
  }

  /** Cancels the access-token refresh interval. */
  stopTokenRefreshInterval(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = null;
  }
}
