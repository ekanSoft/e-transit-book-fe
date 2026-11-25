import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { Icon } from '../../shared/ui/icon';

type ThemePreference = 'system' | 'light' | 'dark';

function preferenceFrom(value: string | null | undefined): ThemePreference {
  return value === 'system' || value === 'dark' ? value : 'light';
}

@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;
  private readonly window = this.document.defaultView;
  private readonly media = this.window?.matchMedia?.('(prefers-color-scheme: light)');
  private readonly deviceLight = signal(this.media?.matches ?? true);
  private readonly selected = signal(preferenceFrom(this.root.dataset['themePreference']));
  readonly preference = this.selected.asReadonly();
  readonly light = computed(() =>
    this.preference() === 'system' ? this.deviceLight() : this.preference() === 'light',
  );
  readonly nextLabel = computed(() =>
    this.light() ? 'Switch to dark mode' : 'Switch to light mode',
  );
  constructor() {
    const onDeviceChange = (event: MediaQueryListEvent) => this.deviceLight.set(event.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== this.window?.localStorage) return;
      if (event.key === 'etransitbook.theme' || event.key === null) {
        this.selected.set(preferenceFrom(event.newValue));
      }
    };
    this.media?.addEventListener('change', onDeviceChange);
    this.window?.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => {
      this.media?.removeEventListener('change', onDeviceChange);
      this.window?.removeEventListener('storage', onStorage);
    });
    effect(() => {
      this.root.dataset['theme'] = this.light() ? 'light' : 'dark';
      this.root.dataset['themePreference'] = this.preference();
    });
  }
  toggle() {
    this.setPreference(this.light() ? 'dark' : 'light');
  }
  setPreference(value: ThemePreference) {
    this.selected.set(value);
    try {
      this.window?.localStorage.setItem('etransitbook.theme', value);
    } catch {
      /* In-memory preference still applies. */
    }
  }
}
@Component({
  selector: 'app-theme-toggle',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    class="icon-button"
    type="button"
    [attr.aria-label]="theme.nextLabel()"
    [title]="theme.nextLabel()"
    (click)="theme.toggle()"
  >
    <app-icon [name]="theme.light() ? 'moon' : 'sun'" />
  </button>`,
})
export class ThemeToggle {
  readonly theme = inject(Theme);
}
