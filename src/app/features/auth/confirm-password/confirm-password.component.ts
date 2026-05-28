import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-confirm-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './confirm-password.component.html',
  styleUrl: './confirm-password.component.scss',
})
export class ConfirmPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  passwordError = false;
  repeatedPasswordError = false;
  passwordValue = '';
  confirmedPasswordValue = '';

  private uid = '';
  private token = '';

  ngOnInit(): void {
    const uid = this.route.snapshot.queryParamMap.get('uid');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!uid || !token) {
      this.toast.showToastAndRedirect(
        true,
        ['Invalid reset link'],
        '/auth/login',
        environment.toastDuration,
      );
      return;
    }

    this.uid = uid;
    this.token = token;
  }

  validatePW(value: string): boolean {
    const valid = value.trim().length > 7;
    this.passwordError = !valid;
    const repeatedInput = document.getElementById(
      'repeated_password',
    ) as HTMLInputElement;
    if (repeatedInput?.value.trim().length > 0) {
      this.validateConfirmPW(repeatedInput.value);
    }
    return valid;
  }

  validateConfirmPW(value: string): boolean {
    const passwordInput = document.getElementById(
      'password',
    ) as HTMLInputElement;
    const valid = passwordInput?.value.trim() === value.trim();
    this.repeatedPasswordError = !valid;
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
    const passwordInput = document.getElementById(
      'password',
    ) as HTMLInputElement;
    const repeatedInput = document.getElementById(
      'repeated_password',
    ) as HTMLInputElement;

    const pwValid = this.validatePW(passwordInput.value);
    const confirmValid = this.validateConfirmPW(repeatedInput.value);
    if (!pwValid || !confirmValid) return;

    const data = {
      new_password: passwordInput.value,
      confirm_password: repeatedInput.value,
    };

    this.authService
      .confirmPassword(this.uid, this.token, data)
      .subscribe((response) => {
        if (response.ok) {
          this.toast.showToastAndRedirect(
            false,
            ['Password successfully reset!'],
            '/auth/login',
            environment.toastDuration,
          );
        } else {
          const errorMessages = this.toast.extractErrorMessages(response.data);
          this.toast.showToastMessage(true, errorMessages);
        }
      });
  }
}
