import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  return api.get('video/').pipe(
    map((response) => {
      if (response.ok) {
        return true;
      }
      return router.createUrlTree(['/auth/login']);
    }),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};
