import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/activate',
    loadComponent: () => import('./features/auth/activate/activate.component').then((m) => m.ActivateComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/confirm-password',
    loadComponent: () =>
      import('./features/auth/confirm-password/confirm-password.component').then(
        (m) => m.ConfirmPasswordComponent,
      ),
  },
  {
    path: 'videos',
    loadComponent: () =>
      import('./features/video-list/video-list.component').then((m) => m.VideoListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'imprint',
    loadComponent: () => import('./features/imprint/imprint.component').then((m) => m.ImprintComponent),
  },
  { path: '**', redirectTo: '' },
];

