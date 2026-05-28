import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';

export const guestGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  return api.get('video/').pipe(
    map((response) => {
      if (response.ok) {
        return router.createUrlTree(['/videos']);
      }
      return true;
    }),
    catchError(() => of(true)),
  );
};
