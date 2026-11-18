import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-field',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [for]="id()"
      >{{ label() }}
      @if (optional()) {
        <span class="optional">(optional)</span>
      }
    </label>
    <div class="input-wrap">
      @if (options().length) {
        <select
          [id]="id()"
          [formControl]="control()"
          [attr.autocomplete]="autocomplete()"
          [attr.aria-required]="!optional()"
          [attr.aria-invalid]="invalid()"
          [attr.aria-describedby]="id() + '-hint'"
        >
          @if (placeholder()) {
            <option value="" disabled>{{ placeholder() }}</option>
          }
          @for (option of options(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      } @else {
        <input
          [id]="id()"
          [type]="type() === 'password' && visible() ? 'text' : type()"
          [formControl]="control()"
          [attr.autocomplete]="autocomplete()"
          [attr.inputmode]="type() === 'tel' ? 'tel' : null"
          [placeholder]="placeholder()"
          [attr.maxlength]="maxLength()"
          [attr.aria-required]="!optional()"
          [attr.aria-invalid]="invalid()"
          [attr.aria-describedby]="id() + '-hint'"
          [class.password-input]="type() === 'password'"
        />
        @if (type() === 'password') {
          <button
            class="password-toggle"
            type="button"
            (click)="visible.set(!visible())"
            [attr.aria-label]="(visible() ? 'Hide ' : 'Show ') + label()"
            [attr.aria-pressed]="visible()"
          >
            {{ visible() ? 'Hide' : 'Show' }}
          </button>
        }
      }
    </div>
    <div [id]="id() + '-hint'" class="field-hint" [class.field-error]="invalid()">
      @if (invalid()) {
        {{ validationMessage() }}
      } @else {
        {{ hint() }}
      }
    </div>
  `,
})
export class Field {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly type = input('text');
  readonly autocomplete = input('off');
  readonly placeholder = input('');
  readonly maxLength = input<number | null>(null);
  readonly optional = input(false);
  readonly hint = input('');
  readonly options = input<readonly { value: string; label: string }[]>([]);
  readonly visible = signal(false);
  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() =>
        this.changeDetector.markForCheck(),
      );
      onCleanup(() => subscription.unsubscribe());
    });
  }
  invalid() {
    return this.control().invalid && (this.control().touched || this.control().dirty);
  }
  validationMessage() {
    const c = this.control();
    if (c.hasError('required') || c.hasError('whitespace'))
      return this.options().length ? 'Select an option.' : `Enter ${this.label().toLowerCase()}.`;
    if (c.hasError('email')) return 'Enter a valid email address.';
    if (c.hasError('phone')) return 'Enter a valid Nigerian phone number, e.g. 08012345678.';
    if (c.hasError('minlength'))
      return `Use at least ${c.getError('minlength').requiredLength} characters.`;
    if (c.hasError('maxlength'))
      return `Use no more than ${c.getError('maxlength').requiredLength} characters.`;
    return 'Please check this value.';
  }
}
