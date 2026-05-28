import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Videoflix',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'auth/login',
    title: 'Videoflix - Login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'auth/register',
    title: 'Videoflix - Register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'auth/activate',
    title: 'Videoflix - Activate Account',
    loadComponent: () =>
      import('./features/auth/activate/activate.component').then(
        (m) => m.ActivateComponent,
      ),
  },
  {
    path: 'auth/forgot-password',
    title: 'Videoflix - Forgot Password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/confirm-password',
    title: 'Videoflix - Reset Password',
    loadComponent: () =>
      import('./features/auth/confirm-password/confirm-password.component').then(
        (m) => m.ConfirmPasswordComponent,
      ),
  },
  {
    path: 'videos',
    title: 'Videoflix - Browse',
    loadComponent: () =>
      import('./features/video-list/video-list.component').then(
        (m) => m.VideoListComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'privacy',
    title: 'Videoflix - Privacy Policy',
    loadComponent: () =>
      import('./features/privacy/privacy.component').then(
        (m) => m.PrivacyComponent,
      ),
  },
  {
    path: 'imprint',
    title: 'Videoflix - Imprint',
    loadComponent: () =>
      import('./features/imprint/imprint.component').then(
        (m) => m.ImprintComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
