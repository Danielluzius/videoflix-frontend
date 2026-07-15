import { Injectable, inject } from '@angular/core';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService, ApiResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private refreshSubscription: Subscription | null = null;
  private static readonly AUTH_KEY = 'vfx_auth';

  setAuthenticated(value: boolean): void {
    if (value) {
      localStorage.setItem(AuthService.AUTH_KEY, '1');
    } else {
      localStorage.removeItem(AuthService.AUTH_KEY);
    }
  }

  isLocallyAuthenticated(): boolean {
    return localStorage.getItem(AuthService.AUTH_KEY) === '1';
  }

  login(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('login/', data);
  }

  guestLogin(): Observable<ApiResponse> {
    return this.api.post('guest-login/', {});
  }

  register(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('register/', data);
  }

  logout(): Observable<ApiResponse> {
    this.stopTokenRefreshInterval();
    this.setAuthenticated(false); // Clear local state immediately
    return this.api.post('logout/', {});
  }

  forgotPassword(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('password_reset/', data);
  }

  confirmPassword(
    uid: string,
    token: string,
    data: { new_password: string; confirm_password: string },
  ): Observable<ApiResponse> {
    return this.api.post(`password_confirm/${uid}/${token}/`, data);
  }

  activate(uid: string, token: string): Observable<ApiResponse> {
    return this.api.get(`activate/${uid}/${token}/`);
  }

  startTokenRefreshInterval(): void {
    this.refreshSubscription = interval(20 * 60 * 1000)
      .pipe(switchMap(() => this.api.post('token/refresh/', {})))
      .subscribe();
  }

  stopTokenRefreshInterval(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = null;
  }
}
