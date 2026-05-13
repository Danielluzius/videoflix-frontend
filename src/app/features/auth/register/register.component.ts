import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  @HostBinding('class') hostClass = 'img_bg signup_bg';

  private authService = inject(AuthService);
  private toast = inject(ToastService);

  emailError = false;
  passwordError = false;
  confirmedPasswordError = false;
  privacyError = false;

  private signUpValues = { email: '', password: '', confirmed_password: '' };
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  ngOnInit(): void {
    const email = localStorage.getItem('email');
    if (email && email.length > 0) {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      if (emailInput) emailInput.value = email;
    }
  }

  validateRegistrationEmail(value: string): boolean {
    const valid = this.emailRegex.test(value.trim());
    this.emailError = !valid;
    if (valid) this.signUpValues.email = value.trim();
    return valid;
  }

  validatePW(value: string): boolean {
    const valid = value.trim().length > 7;
    this.passwordError = !valid;
    if (valid) this.signUpValues.password = value.trim();
    const confirmedInput = document.getElementById('confirmed_password') as HTMLInputElement;
    if (confirmedInput?.value.trim().length > 0) {
      this.validateConfirmPW(confirmedInput.value);
    }
    return valid;
  }

  validateConfirmPW(value: string): boolean {
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const valid = passwordInput?.value.trim() === value.trim();
    this.confirmedPasswordError = !valid;
    if (valid) this.signUpValues.confirmed_password = value.trim();
    return valid;
  }

  togglePassword(input: HTMLInputElement): void {
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  private validateSignUp(): boolean {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const confirmedInput = document.getElementById('confirmed_password') as HTMLInputElement;
    const privacyCheckbox = document.getElementById('privacy_policy') as HTMLInputElement;

    this.validateRegistrationEmail(emailInput.value);
    this.validatePW(passwordInput.value);
    this.validateConfirmPW(confirmedInput.value);

    if (privacyCheckbox && !privacyCheckbox.checked) {
      this.privacyError = true;
    } else if (privacyCheckbox) {
      this.privacyError = false;
    }

    return !this.emailError && !this.passwordError && !this.confirmedPasswordError && !this.privacyError;
  }

  onSubmit(): void {
    const privacyCheckbox = document.getElementById('privacy_policy') as HTMLInputElement;
    if (privacyCheckbox && !privacyCheckbox.checked) {
      this.privacyError = true;
      this.toast.showToastMessage(true, ['Please accept the privacy policy to continue']);
      return;
    }

    if (!this.validateSignUp()) {
      this.toast.showToastMessage(true, ['Please correct the errors in the form']);
      return;
    }

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const confirmedInput = document.getElementById('confirmed_password') as HTMLInputElement;

    const data = {
      email: emailInput.value,
      password: passwordInput.value,
      confirmed_password: confirmedInput.value,
    };

    this.authService.register(data).subscribe((response) => {
      if (!response.ok) {
        const errorArr = this.toast.extractErrorMessages(response.data);
        this.toast.showToastMessage(true, errorArr);
      } else {
        localStorage.removeItem('email');
        this.toast.showToastAndRedirect(
          false,
          ['Registration successful! Please check your email.'],
          '/auth/login',
          environment.toastDuration,
        );
      }
    });
  }
}
