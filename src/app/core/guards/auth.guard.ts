import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const api = inject(ApiService);
  const router = inject(Router);

  // Fast path: no local auth state → redirect without API call (no 401 in console)
  if (!auth.isLocallyAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // Verify session is still valid (handles expired tokens)
  return api.get('video/').pipe(
    map((response) => {
      if (response.ok) {
        return true;
      }
      auth.setAuthenticated(false);
      return router.createUrlTree(['/auth/login']);
    }),
    catchError(() => {
      auth.setAuthenticated(false);
      return of(router.createUrlTree(['/auth/login']));
    }),
  );
};
