import { Injectable, inject } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private refreshSubscription: Subscription | null = null;

  login(data: Record<string, string>): void {
    this.api.post('login/', data).subscribe((response) => {
      if (!response.ok) {
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        this.toast.showToastAndRedirect(
          false,
          ['Login successful!'],
          '/videos',
          environment.toastDuration
        );
      }
    });
  }

  register(data: Record<string, string>): void {
    this.api.post('register/', data).subscribe((response) => {
      if (!response.ok) {
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        localStorage.removeItem('email');
        this.toast.showToastAndRedirect(
          false,
          ['Registration successful! Please check your email.'],
          '/auth/login',
          environment.toastDuration
        );
      }
    });
  }

  logout(): void {
    this.stopTokenRefreshInterval();
    this.api.post('logout/', {}).subscribe((response) => {
      if (response.status === 'error') {
        this.toast.showToastAndRedirect(
          true,
          ['Logout error, redirecting...'],
          '/auth/login',
          environment.toastDuration
        );
      } else {
        this.toast.showToastAndRedirect(
          false,
          ['Successfully logged out!'],
          '/auth/login',
          environment.toastDuration
        );
      }
    });
  }

  forgotPassword(data: Record<string, string>): void {
    this.api.post('password_reset/', data).subscribe((response) => {
      if (!response.ok) {
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        this.toast.showToastAndRedirect(
          false,
          ['Password reset email sent! Please check your inbox.'],
          '/auth/login',
          environment.toastDuration
        );
      }
    });
  }

  confirmPassword(
    uid: string,
    token: string,
    data: { new_password: string; confirm_password: string }
  ): void {
    this.api.post(`password_confirm/${uid}/${token}/`, data).subscribe((response) => {
      if (response.ok) {
        this.toast.showToastAndRedirect(
          false,
          ['Password successfully reset!'],
          '/auth/login',
          environment.toastDuration
        );
      } else {
        const errorMessages = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorMessages);
      }
    });
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
