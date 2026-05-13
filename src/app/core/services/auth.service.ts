import { Injectable, inject } from '@angular/core';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService, ApiResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private refreshSubscription: Subscription | null = null;

  login(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('login/', data);
  }

  register(data: Record<string, string>): Observable<ApiResponse> {
    return this.api.post('register/', data);
  }

  logout(): Observable<ApiResponse> {
    this.stopTokenRefreshInterval();
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

