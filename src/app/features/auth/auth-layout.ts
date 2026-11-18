import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
        <div class="terminal-photo">
          <img ngSrc="/terminal.webp" alt="" fill priority sizes="(min-width: 900px) 40vw, 1vw" />
        </div>
      </div>
    </main>
  </div>`,
})
export class AuthLayout {}
