import { HttpInterceptorFn } from '@angular/common/http';

function getCsrfToken(): string {
  const cookieString = document.cookie;
  if (cookieString && cookieString.includes('csrftoken=')) {
    const csrfCookie = cookieString.split('csrftoken=')[1];
    if (csrfCookie) {
      return csrfCookie.split(';')[0];
    }
  }
  return '';
}

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  let modifiedReq = req.clone({ withCredentials: true });

  if (req.method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      modifiedReq = modifiedReq.clone({
        headers: modifiedReq.headers.set('X-CSRFToken', csrfToken),
      });
    }
  }

  return next(modifiedReq);
};
