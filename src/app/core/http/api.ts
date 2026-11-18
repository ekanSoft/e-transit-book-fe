import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from './api.models';
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  get<T>(path: string) {
    return firstValueFrom(this.http.get<ApiResponse<T>>(environment.apiBaseUrl + path));
  }
  post<T>(path: string, body: unknown, slug?: string) {
    return firstValueFrom(
      this.http.post<ApiResponse<T>>(environment.apiBaseUrl + path, body, {
        params: slug ? { slug } : {},
      }),
    );
  }
  patch<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.patch<ApiResponse<T>>(environment.apiBaseUrl + path, body));
  }
}
