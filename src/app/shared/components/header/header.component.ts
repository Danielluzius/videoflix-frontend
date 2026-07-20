import { Component, inject } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Returns the router link destination for the logo based on the current route. */
  logoLink(): string {
    const url = this.currentUrl();
    if (url === '/') return '/';
    if (url.startsWith('/videos')) return '/videos';
    return '/auth/login';
  }

  /** Returns true if the login button should be visible on the current route. */
  showLoginBtn(): boolean {
    const url = this.currentUrl();
    return (
      url === '/auth/register' ||
      url === '/auth/forgot-password' ||
      url === '/auth/confirm-password' ||
      url === '/'
    );
  }

  /** Returns true if the sign-up button should be visible on the current route. */
  showSignUpBtn(): boolean {
    const url = this.currentUrl();
    return url === '/auth/login';
  }

  /** Returns true if the logout button should be visible on the current route. */
  showLogoutBtn(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/videos');
  }

  /** Returns true if the back button should be shown (privacy and imprint pages). */
  showBackBtn(): boolean {
    const url = this.currentUrl();
    return url === '/privacy' || url === '/imprint';
  }

  /** Navigates back using browser history, or falls back to the login page. */
  goBack(): void {
    if (document.referrer && document.referrer !== window.location.href) {
      window.history.back();
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  /** Calls the logout endpoint and redirects to the login page. */
  logout(): void {
    this.authService.logout().subscribe((response) => {
      if (response.status === 'error') {
        this.toast.showToastAndRedirect(
          true,
          ['Logout error, redirecting...'],
          '/auth/login',
          environment.toastDuration,
        );
      } else {
        this.toast.showToastAndRedirect(
          false,
          ['Successfully logged out!'],
          '/auth/login',
          environment.toastDuration,
        );
      }
    });
  }
}
