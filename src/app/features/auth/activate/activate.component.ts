import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [],
  templateUrl: './activate.component.html',
  styleUrl: './activate.component.scss',
})
export class ActivateComponent implements OnInit {
  @HostBinding('class') hostClass = 'img_bg signup_bg';

  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  status: 'processing' | 'success' | 'error' = 'processing';
  message = '';

  ngOnInit(): void {
    const uid = this.route.snapshot.queryParamMap.get('uid');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!uid || !token) {
      this.handleError('Invalid activation link');
      return;
    }

    this.authService.activate(uid, token).subscribe({
      next: (response) => {
        if (response.ok) {
          const data = response.data as { message?: string };
          const msg = data?.message || 'Account successfully activated!';
          this.handleSuccess(msg);
        } else {
          const data = response.data as { message?: string };
          throw new Error(data?.message || 'Activation failed');
        }
      },
      error: (err: Error) => {
        this.handleError(err.message || 'Network error occurred');
      },
    });
  }

  private handleSuccess(msg: string): void {
    this.status = 'success';
    this.message = msg;
    this.toast.showToastAndRedirect(
      false,
      [msg],
      '/auth/login',
      environment.activation.successDelay,
    );
  }

  private handleError(msg: string): void {
    this.status = 'error';
    this.message = msg;
    this.toast.showToastAndRedirect(
      true,
      [msg],
      '/auth/login',
      environment.activation.errorDelay,
    );
  }
}
