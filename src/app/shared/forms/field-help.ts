import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-field-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointerenter)': 'pointerChanged($event, true)',
    '(pointerleave)': 'pointerChanged($event, false)',
    '(document:pointerdown)': 'dismissOnOutsidePress($event)',
    '(document:keydown.escape)': 'dismissOnEscape($event)',
  },
  template: `
    <button
      type="button"
      [attr.aria-label]="label() + ' help'"
      [attr.aria-describedby]="id()"
      (focus)="open.set(true)"
      (blur)="open.set(false)"
      (click)="open.set(true)"
    >
      <span aria-hidden="true">?</span>
    </button>
    <span [id]="id()" role="tooltip" class="field-tooltip" [hidden]="!open()">{{ text() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      margin-block: -3px;
    }

    button {
      display: grid;
      width: 24px;
      height: 24px;
      place-items: center;
      border-radius: 50%;
      color: var(--color-muted);
    }

    button:hover,
    button:focus-visible {
      color: var(--color-brand);
    }

    button span {
      display: grid;
      width: 16px;
      height: 16px;
      place-items: center;
      border: 1px solid currentColor;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 650;
      line-height: 1;
    }

    .field-tooltip {
      position: absolute;
      z-index: 2;
      inset-block-start: 100%;
      inset-inline-start: 0;
      width: min(100%, 17rem);
      padding: 8px 10px;
      border: 1px solid var(--control-line);
      border-radius: 7px;
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: 12px;
      box-shadow: 0 4px 12px rgb(0 0 0 / 16%);
    }
  `,
})
export class FieldHelp {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  protected readonly open = signal(false);

  protected pointerChanged(event: PointerEvent, inside: boolean) {
    if (event.pointerType !== 'touch' && (inside || !this.element.matches(':focus-within'))) {
      this.open.set(inside);
    }
  }

  protected dismissOnOutsidePress(event: PointerEvent) {
    if (this.open() && !event.composedPath().includes(this.element)) this.open.set(false);
  }

  protected dismissOnEscape(event: Event) {
    if (!this.open()) return;
    event.preventDefault();
    this.open.set(false);
  }
}
