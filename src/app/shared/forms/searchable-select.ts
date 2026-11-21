import { DOCUMENT } from '@angular/common';
import { Combobox, ComboboxInput } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormControl } from '@angular/forms';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-searchable-select',
  imports: [Combobox, ComboboxInput, Listbox, Option, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './searchable-select.html',
  host: { class: 'block min-w-0' },
})
export class SearchableSelect {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly combobox = viewChild(Combobox);
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly list = viewChild(Listbox);

  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly options = input.required<readonly { value: string; label: string }[]>();
  readonly placeholder = input.required<string>();
  readonly searchLabel = input.required<string>();
  readonly hint = input('');
  readonly actionLabel = input('');
  readonly action = output<HTMLElement>();

  protected readonly expanded = signal(false);
  protected readonly query = signal('');
  protected readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.options().filter(({ label }) => label.toLowerCase().includes(query));
  });
  protected readonly useOverlay = (() => {
    const view = this.document.defaultView;
    return (
      typeof view?.HTMLElement.prototype.showPopover === 'function' &&
      !!view.CSS?.supports('position-area', 'block-end')
    );
  })();

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() =>
        this.changeDetector.markForCheck(),
      );
      onCleanup(() => subscription.unsubscribe());
    });
    afterRenderEffect({
      write: () => {
        const panel = this.panel()?.nativeElement;
        if (!panel) return;
        if (this.useOverlay && !panel.matches(':popover-open')) panel.showPopover();
        this.combobox()?.open();
        this.search()?.nativeElement.focus();
      },
    });
    afterRenderEffect({
      write: () => {
        if (this.expanded() && typeof HTMLElement.prototype.scrollIntoView === 'function') {
          this.list()?.scrollActiveItemIntoView();
        }
      },
    });
  }

  protected selectedLabel() {
    return this.options().find(({ value }) => value === this.control().value)?.label;
  }

  protected invalid() {
    const control = this.control();
    return control.invalid && (control.touched || control.dirty);
  }

  protected validationMessage() {
    const error: unknown = this.control().getError('server');
    return typeof error === 'string' ? error : 'Select an option.';
  }

  protected open() {
    if (this.control().disabled) return;
    if (this.expanded()) {
      this.combobox()?.open();
      this.search()?.nativeElement.focus();
      return;
    }
    this.query.set('');
    this.expanded.set(true);
  }

  protected close() {
    this.expanded.set(false);
    afterNextRender(
      { write: () => this.trigger().nativeElement.focus() },
      { injector: this.injector },
    );
  }

  protected escape(event: Event) {
    if (!this.expanded()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  protected enter(event: Event, search: HTMLInputElement) {
    event.preventDefault();
    if (!search.getAttribute('aria-activedescendant')) event.stopPropagation();
  }

  protected leave(container: HTMLElement, target: EventTarget | null) {
    if (!this.expanded() || (target instanceof Node && container.contains(target))) return;
    this.control().markAsTouched();
    this.expanded.set(false);
  }

  protected select([value]: string[]) {
    if (!value || !this.expanded()) return;
    const control = this.control();
    if (control.value !== value) {
      control.markAsDirty();
      control.setValue(value);
    }
    this.close();
  }

  protected activateAction() {
    this.close();
    this.action.emit(this.trigger().nativeElement);
  }
}
