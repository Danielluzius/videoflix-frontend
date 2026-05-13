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

  showLoginBtn(): boolean {
    const url = this.currentUrl();
    return (
      url === '/auth/register' ||
      url === '/auth/forgot-password' ||
      url === '/auth/confirm-password' ||
      url === '/'
    );
  }

  showSignUpBtn(): boolean {
    const url = this.currentUrl();
    return url === '/auth/login';
  }

  showLogoutBtn(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/videos');
  }

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
