import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injectable,
  input,
  signal,
} from '@angular/core';
@Component({
  selector: 'app-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (messages().length) {
    <div class="alert alert-error" role="alert">
      <strong>Please check the following</strong>
      <ul>
        @for (message of messages(); track $index) {
          <li>{{ message }}</li>
        }
      </ul>
    </div>
  }`,
})
export class Errors {
  readonly messages = input<string[]>([]);
}
@Injectable({ providedIn: 'root' })
export class Notifications {
  readonly messages = signal<{ id: number; text: string }[]>([]);
  private nextId = 0;
  show(text: string) {
    const id = ++this.nextId;
    this.messages.update((items) => [...items, { id, text }]);
    setTimeout(() => this.dismiss(id), 6000);
  }
  dismiss(id: number) {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }
}
@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="toast-region" aria-live="polite" aria-atomic="false">
    @for (message of notifications.messages(); track message.id) {
      <div class="toast">
        <span>{{ message.text }}</span
        ><button
          type="button"
          (click)="notifications.dismiss(message.id)"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    }
  </div>`,
})
export class Toasts {
  readonly notifications = inject(Notifications);
}
