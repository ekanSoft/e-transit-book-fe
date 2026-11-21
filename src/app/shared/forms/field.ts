import { DOCUMENT } from '@angular/common';
import { Combobox, ComboboxInput } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '../ui/icon';
@Component({
  selector: 'app-field',
  imports: [ReactiveFormsModule, Combobox, ComboboxInput, Listbox, Option, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [for]="id()"
      >{{ label() }}
      @if (optional()) {
        <span class="optional">(optional)</span>
      }
    </label>
    <div class="input-wrap">
      @if (options().length && overlayOptions() && !useOverlay()) {
        <select
          [id]="id()"
          [formControl]="control()"
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
      } @else if (options().length) {
        <div
          ngCombobox
          readonly
          #picker="ngCombobox"
          class="picker"
          [disabled]="control().disabled"
          [style.--picker-anchor]="useOverlay() ? '--' + id() : null"
        >
          <input
            ngComboboxInput
            readonly
            class="picker-trigger"
            [class.picker-anchor]="useOverlay()"
            [id]="id()"
            [value]="optionLabel()"
            [placeholder]="placeholder()"
            [disabled]="control().disabled"
            [attr.aria-required]="!optional()"
            [attr.aria-invalid]="invalid()"
            [attr.aria-describedby]="id() + '-hint'"
            [class.ng-invalid]="control().invalid"
            (blur)="control().markAsTouched()"
          />
          <app-icon class="picker-chevron picker-input-chevron" name="down" />
          <div
            #dropdown
            ngListbox
            class="picker-dropdown picker-options"
            [attr.popover]="useOverlay() ? 'manual' : null"
            [hidden]="!useOverlay() && !picker.expanded()"
            [values]="control().value ? [control().value] : []"
            (valuesChange)="selectOption($event)"
            [attr.aria-label]="label()"
          >
            @for (option of options(); track option.value) {
              <div ngOption class="picker-option" [value]="option.value" [label]="option.label">
                {{ option.label }}
              </div>
            }
          </div>
        </div>
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
    <div
      [id]="id() + '-hint'"
      class="field-hint"
      [class.field-error]="invalid()"
      [class.field-hint-empty]="!invalid() && !hint()"
    >
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
  private readonly document = inject(DOCUMENT);
  private readonly picker = viewChild(Combobox);
  private readonly optionsList = viewChild(Listbox);
  private readonly dropdown = viewChild<ElementRef<HTMLDivElement>>('dropdown');
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
  readonly overlayOptions = input(false);
  protected readonly useOverlay = computed(() => {
    const view = this.document.defaultView;
    return (
      this.overlayOptions() &&
      typeof view?.HTMLElement.prototype.showPopover === 'function' &&
      !!view.CSS?.supports('position-area', 'block-end')
    );
  });
  readonly visible = signal(false);
  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() =>
        this.changeDetector.markForCheck(),
      );
      onCleanup(() => subscription.unsubscribe());
    });
    afterRenderEffect({
      write: () => {
        const expanded = this.picker()?.expanded();
        const dropdown = this.dropdown()?.nativeElement;
        if (this.useOverlay() && dropdown) {
          const showing = dropdown.matches(':popover-open');
          if (expanded && !showing) dropdown.showPopover();
          if (!expanded && showing) dropdown.hidePopover();
        }
        if (expanded && typeof HTMLElement.prototype.scrollIntoView === 'function') {
          this.optionsList()?.scrollActiveItemIntoView();
        }
      },
    });
  }
  protected optionLabel() {
    return this.options().find(({ value }) => value === this.control().value)?.label ?? '';
  }
  protected selectOption([value]: string[]) {
    const control = this.control();
    if (value !== undefined && value !== control.value) {
      control.markAsDirty();
      control.setValue(value);
    }
  }
  invalid() {
    return this.control().invalid && (this.control().touched || this.control().dirty);
  }
  validationMessage() {
    const c = this.control();
    if (c.hasError('server')) return c.getError('server');
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
