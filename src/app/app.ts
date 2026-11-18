import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Toasts } from './shared/ui/feedback';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toasts],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a class="skip-link" href="#main-content">Skip to content</a>
    @if (navigating()) {
      <div class="route-progress" role="status">Loading workspace…</div>
    }
    <router-outlet /><app-toasts />`,
})
export class App {
  readonly navigating = signal(false);
  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationStart) this.navigating.set(true);
        if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        )
          this.navigating.set(false);
        if (event instanceof NavigationEnd)
          setTimeout(() => {
            const heading = document.querySelector<HTMLElement>('main h1');
            heading?.setAttribute('tabindex', '-1');
            heading?.focus({ preventScroll: true });
            window.scrollTo(0, 0);
          });
      });
  }
}
