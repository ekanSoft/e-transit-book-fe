import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-management-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="management-dialog"
      [class.management-drawer]="drawer()"
      [class.management-dialog-wide]="wide()"
      [attr.aria-labelledby]="dialogId() + '-title'"
      [attr.aria-describedby]="description() ? dialogId() + '-description' : null"
      (cancel)="cancel($event)"
    >
      <header>
        <div>
          <h2 [id]="dialogId() + '-title'" tabindex="-1" autofocus>{{ title() }}</h2>
          @if (description()) {
            <p [id]="dialogId() + '-description'">{{ description() }}</p>
          }
        </div>
        <button
          class="icon-button"
          type="button"
          aria-label="Close dialog"
          [disabled]="busy()"
          (click)="dismiss.emit()"
        >
          <app-icon name="close" />
        </button>
      </header>
      <ng-content />
    </dialog>
  `,
})
export class ManagementDialog {
  readonly title = input.required<string>();
  readonly dialogId = input('management');
  readonly description = input('');
  readonly drawer = input(false);
  readonly wide = input(false);
  readonly busy = input(false);
  readonly trigger = input<HTMLElement>();
  readonly dismiss = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    const document = inject(DOCUMENT);
    const listeners = new AbortController();
    let modal: HTMLDialogElement | undefined;
    let returnFocus: HTMLElement | null = null;
    afterNextRender(() => {
      modal = this.dialog().nativeElement;
      returnFocus = this.trigger() ?? (document.activeElement as HTMLElement | null);
      modal.addEventListener(
        'keydown',
        (event) => {
          // Let open field overlays handle Escape before it closes the drawer.
          if (
            event.key === 'Escape' &&
            !modal?.querySelector(
              '[role="combobox"][aria-expanded="true"], .picker-trigger[aria-expanded="true"], [role="tooltip"]:not([hidden])',
            )
          ) {
            this.cancel(event);
          }
        },
        { capture: true, signal: listeners.signal },
      );
      modal.showModal();
    });
    inject(DestroyRef).onDestroy(() => {
      listeners.abort();
      modal?.close();
      queueMicrotask(() => {
        if (returnFocus?.isConnected && !returnFocus.matches(':disabled')) {
          returnFocus.focus();
        } else if (!document.querySelector('dialog[open]')) {
          document.querySelector<HTMLElement>('main h1[tabindex]')?.focus();
        }
      });
    });
  }

  cancel(event: Event) {
    event.preventDefault();
    if (!this.busy()) this.dismiss.emit();
  }
}
