import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ToastItem {
  id: number;
  error: boolean;
  messages: string[];
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private router = inject(Router);
  private toastCounter = 0;

  readonly toast$ = new Subject<ToastItem>();

  showToastMessage(error: boolean = true, msg: string[] = []): void {
    this.toast$.next({ id: ++this.toastCounter, error, messages: msg });
  }

  showToastAndRedirect(
    error: boolean = true,
    msg: string[] = [],
    redirectUrl: string | null = null,
    delay: number = environment.toastDuration,
  ): void {
    this.showToastMessage(error, msg);
    if (redirectUrl) {
      setTimeout(() => {
        this.router.navigateByUrl(redirectUrl);
      }, delay);
    }
  }

  extractErrorMessages(errorObject: unknown): string[] {
    let errorMessages: string[] = [];
    if (typeof errorObject !== 'object' || errorObject === null) {
      return errorMessages;
    }
    for (const key of Object.keys(errorObject as object)) {
      const value = (errorObject as Record<string, unknown>)[key];
      if (typeof value === 'object' && value !== null) {
        errorMessages = errorMessages.concat(this.extractErrorMessages(value));
      } else if (Array.isArray(value)) {
        errorMessages = errorMessages.concat(value as string[]);
      } else {
        errorMessages.push(value as string);
      }
    }
    return errorMessages;
  }
}
