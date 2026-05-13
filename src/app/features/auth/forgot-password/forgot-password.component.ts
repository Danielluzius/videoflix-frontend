import { Component, HostBinding, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  @HostBinding('class') hostClass = 'img_bg login_bg';

  private authService = inject(AuthService);
  private toast = inject(ToastService);

  emailError = false;

  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  validateEmail(value: string): boolean {
    const valid = this.emailRegex.test(value.trim());
    this.emailError = !valid;
    return valid;
  }

  onSubmit(): void {
    const emailInput = document.getElementById('forgot_email') as HTMLInputElement;
    if (!this.validateEmail(emailInput.value)) return;

    const data = { email: emailInput.value };

    this.authService.forgotPassword(data).subscribe((response) => {
      if (!response.ok) {
        this.emailError = true;
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        this.toast.showToastAndRedirect(
          false,
          ['Password reset email sent! Please check your inbox.'],
          '/auth/login',
          environment.toastDuration,
        );
      }
    });
  }
}
