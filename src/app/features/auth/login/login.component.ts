import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  emailError = false;
  passwordError = false;
  loginError = false;
  guestLoading = false;

  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  validateEmail(value: string): boolean {
    const valid = this.emailRegex.test(value.trim());
    this.emailError = !valid;
    return valid;
  }

  validateLoginPW(value: string): boolean {
    const valid = value.trim().length > 0;
    this.passwordError = !valid;
    return valid;
  }

  togglePassword(input: HTMLInputElement, event: MouseEvent): void {
    input.type = input.type === 'password' ? 'text' : 'password';
    const icon = event.target as HTMLImageElement;
    icon.src =
      input.type === 'text'
        ? '/assets/icons/visibility_off.svg'
        : '/assets/icons/visibility.svg';
  }

  onSubmit(): void {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById(
      'password',
    ) as HTMLInputElement;
    this.loginError = false;

    const emailValid = this.validateEmail(emailInput.value);
    const pwValid = this.validateLoginPW(passwordInput.value);

    if (!emailValid || !pwValid) return;

    const data = { email: emailInput.value, password: passwordInput.value };

    this.authService.login(data).subscribe((response) => {
      if (!response.ok) {
        this.loginError = true;
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        this.authService.setAuthenticated(true);
        this.toast.showToastAndRedirect(
          false,
          ['Login successful!'],
          '/videos',
          environment.toastDuration,
        );
      }
    });
  }

  onGuestLogin(): void {
    this.guestLoading = true;
    this.authService.guestLogin().subscribe((response) => {
      this.guestLoading = false;
      if (!response.ok) {
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        this.authService.setAuthenticated(true);
        this.toast.showToastAndRedirect(
          false,
          ['Welcome, Guest!'],
          '/videos',
          environment.toastDuration,
        );
      }
    });
  }
}
