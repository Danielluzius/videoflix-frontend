import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number | string;
  data: T | null;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  post<T = unknown>(
    endpoint: string,
    data: unknown,
  ): Observable<ApiResponse<T>> {
    return this.http
      .post<T>(`${environment.apiBaseUrl}${endpoint}`, data, {
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<T>) => ({
          ok: response.ok,
          status: response.status,
          data: response.body,
        })),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 0) {
            return of<ApiResponse<T>>({
              ok: false,
              status: 'error',
              data: null,
              message: this.getErrorMessage(error),
            });
          }
          return of<ApiResponse<T>>({
            ok: false,
            status: error.status,
            data: error.error as T,
          });
        }),
      );
  }

  get<T = unknown>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http
      .get<T>(`${environment.apiBaseUrl}${endpoint}`, { observe: 'response' })
      .pipe(
        map((response: HttpResponse<T>) => ({
          ok: response.ok,
          status: response.status,
          data: response.body,
        })),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 0) {
            return of<ApiResponse<T>>({
              ok: false,
              status: 'error',
              data: null,
              message: this.getErrorMessage(error),
            });
          }
          return of<ApiResponse<T>>({
            ok: false,
            status: error.status,
            data: error.error as T,
          });
        }),
      );
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'There was an issue with the request or network connection.';
    }
    if (error.statusText === 'Unknown Error') {
      return 'Failed to connect to the server.';
    }
    return 'Network error';
  }
}
