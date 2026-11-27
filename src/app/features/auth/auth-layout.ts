import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { EMPTY, fromEvent, map } from 'rxjs';
import { Brand } from '../../shared/ui/brand';
import { ThemeToggle } from '../../core/layout/theme';
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Brand, ThemeToggle, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="auth-layout">
    <header class="auth-top">
      <app-brand /><span class="portal-label">Operator portal</span><app-theme-toggle />
    </header>
    <main id="main-content" class="auth-main">
      <div class="auth-frame">
        <div class="auth-content"><router-outlet /></div>
        @if (showTerminalPhoto()) {
          <div class="terminal-photo">
            <img ngSrc="/terminal.75fc85232a.webp" alt="" fill priority />
          </div>
        }
      </div>
    </main>
  </div>`,
})
export class AuthLayout {
  private readonly photoViewport = inject(DOCUMENT).defaultView?.matchMedia?.('(width > 899px)');
  protected readonly showTerminalPhoto = toSignal(
    this.photoViewport
      ? fromEvent<MediaQueryListEvent>(this.photoViewport, 'change').pipe(
          map((event) => event.matches),
        )
      : EMPTY,
    { initialValue: this.photoViewport?.matches ?? false },
  );
}
