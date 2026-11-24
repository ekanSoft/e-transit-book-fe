import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicStore } from './public-store';
import { publicUrl } from '../../shared/utilities/public-url';
@Component({
  imports: [RouterLink, RouterOutlet, NgOptimizedImage],
  providers: [PublicStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-shell.html',
  styleUrl: './public-shell.css',
  host: { class: 'public-site' },
})
export class PublicShell {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  readonly store = inject(PublicStore);
  paymentPage() {
    return (
      this.route.snapshot.firstChild?.data['paymentReturn'] === true &&
      /^[a-z0-9][a-z0-9-]{0,119}$/i.test(this.store.slug())
    );
  }
  focusPage() {
    this.document.defaultView?.requestAnimationFrame(() => {
      const heading = this.document.querySelector<HTMLElement>('main h1');
      if (heading && !this.document.querySelector('main')?.contains(this.document.activeElement)) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
  }
  readonly broken = signal(false);
  readonly logo = computed(
    () => !this.broken() && publicUrl(this.store.profile()?.organization.logo),
  );
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.broken.set(false);
      void this.store.open(p.get('slug')!);
    });
  }
}
