import { computed, Injectable, signal } from '@angular/core';
import { defer, finalize, Observable, ObservableInput } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RouteProgress {
  private readonly pending = signal(0);
  readonly loading = computed(() => this.pending() > 0);

  track<T>(request: () => ObservableInput<T>): Observable<T> {
    return defer(() => {
      this.pending.update((pending) => pending + 1);
      return defer(request).pipe(finalize(() => this.pending.update((pending) => pending - 1)));
    });
  }
}
