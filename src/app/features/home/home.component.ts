import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private router = inject(Router);
  private toast = inject(ToastService);

  emailError = false;

  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  goToRegister(event: Event): void {
    event.preventDefault();
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const email = emailInput?.value ?? '';
    if (this.emailRegex.test(email.trim())) {
      this.emailError = false;
      localStorage.setItem('email', email);
      this.router.navigate(['/auth/register']);
    } else {
      this.emailError = true;
      this.toast.showToastMessage(true, ['Please enter a valid email address']);
    }
  }
}
