import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirects authenticated users to /videos; grants access to unauthenticated users. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If locally authenticated, redirect to videos without API call
  if (auth.isLocallyAuthenticated()) {
    return router.createUrlTree(['/videos']);
  }

  return true;
};
