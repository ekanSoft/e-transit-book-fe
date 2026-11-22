import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { FormControl } from '@angular/forms';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import { watInput, watInstant } from './trip-fields';
import { isCalendarDate, shiftDays, showWat, watDate } from './trip-format';

const dayFormat = new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeZone: 'UTC' });
const shortDateFormat = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'UTC' });
const dateHeading = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const monthFormat = new Intl.DateTimeFormat('en-NG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const arrows: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};
const monthName = new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: 'UTC' });
const months = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: monthName.format(new Date(Date.UTC(2024, index, 1))),
}));

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-trip-date-time',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-date-time.html',
  styleUrl: './trip-date-time.css',
})
export class TripDateTime {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly optional = input(false);
  readonly dateOnly = input(false);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly injector = inject(Injector);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected readonly open = signal(false);
  protected readonly selected = signal('');
  protected readonly currentDate = signal('');
  protected readonly time = signal('');
  protected readonly focused = signal('');
  protected readonly month = computed(() => this.focused().slice(0, 7));
  protected readonly year = computed(() => Number(this.month().slice(0, 4)));
  protected readonly monthNumber = computed(() => Number(this.month().slice(5)));
  protected readonly months = months;
  protected readonly years = computed(() => {
    const year = this.year();
    if (!year) return [];
    const first = Math.max(1, year - 15);
    const last = Math.min(9999, year + 15);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  });
  protected readonly selectedHeading = computed(() =>
    this.selected() ? dateHeading.format(new Date(this.selected())) : 'Choose a date',
  );
  protected readonly monthLabel = computed(() =>
    this.month() ? monthFormat.format(new Date(this.month() + '-01')) : '',
  );
  protected readonly weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  protected readonly weeks = computed(() => {
    const month = this.month();
    if (!month) return [];
    const first = month + '-01';
    const offset = new Date(first).getUTCDay();
    const last = new Date(first);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    return Array.from({ length: Math.ceil((offset + last.getUTCDate()) / 7) }, (_, week) =>
      Array.from({ length: 7 }, (_, weekday) => {
        const date = shiftDays(first, week * 7 + weekday - offset);
        return { value: dateOnly(date), number: date.getUTCDate(), label: dayFormat.format(date) };
      }),
    );
  });
  protected readonly draft = computed(() =>
    this.dateOnly() || !this.selected() ? this.selected() : this.selected() + 'T' + this.time(),
  );
  protected readonly canConfirm = computed(() => !this.draft() || this.validValue(this.draft()));

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() => this.changeDetector.markForCheck());
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected displayValue() {
    const value = this.control().value;
    if (this.dateOnly()) return isCalendarDate(value) ? shortDateFormat.format(new Date(value)) : '';
    const instant = watInstant(value);
    return instant ? showWat(instant) : '';
  }

  protected error() {
    const control = this.control();
    if (!control.invalid || (!control.touched && !control.dirty)) return '';
    const message: unknown = control.getError('server');
    if (typeof message === 'string') return message;
    return this.dateOnly() ? 'Choose a date.' : 'Choose a date and time.';
  }

  protected beforeToggle(event: ToggleEvent) {
    const open = event.newState === 'open';
    this.open.set(open);
    if (!open) return;
    const now = this.currentValue();
    this.currentDate.set(now.slice(0, 10));
    const value = this.control().value;
    this.setDraft(this.validValue(value) ? value : now);
    this.focusCalendarDay();
  }

  protected choose(date: string) {
    this.selected.set(date);
    this.focused.set(date);
    this.focusCalendarDay();
  }

  protected today() {
    const now = this.currentValue();
    this.currentDate.set(now.slice(0, 10));
    this.setDraft(now);
  }

  protected moveMonth(by: number) {
    const next = new Date(this.month() + '-01');
    next.setUTCMonth(next.getUTCMonth() + by);
    this.focusMonth(next);
  }

  protected jumpToMonth(year: number, month: number) {
    const next = new Date(this.month() + '-01');
    next.setUTCFullYear(year, month - 1, 1);
    this.focusMonth(next);
  }

  private focusMonth(month: Date) {
    const year = month.getUTCFullYear();
    if (year < 1 || year > 9999) return;
    const first = dateOnly(month);
    const selection = this.selected();
    this.focused.set(selection.startsWith(first.slice(0, 7)) ? selection : first);
  }

  protected moveFocus(event: KeyboardEvent) {
    const by = arrows[event.key];
    if (by === undefined) return;
    event.preventDefault();
    this.focused.set(dateOnly(shiftDays(this.focused(), by)));
    this.focusCalendarDay();
  }

  protected confirm() {
    if (!this.canConfirm()) return;
    const control = this.control();
    if (control.value !== this.draft()) {
      control.markAsDirty();
      control.setValue(this.draft());
    }
    control.markAsTouched();
    this.close();
  }

  protected escape(event: Event) {
    if (!this.open()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  private close() {
    this.panel().nativeElement.hidePopover();
    this.trigger().nativeElement.focus();
  }

  private setDraft(value: string) {
    this.selected.set(value.slice(0, 10));
    this.focused.set(this.selected());
    this.time.set(value.slice(11));
  }

  private currentValue() {
    const now = new Date();
    return this.dateOnly() ? watDate(now) : watInput(now.toISOString());
  }

  private validValue(value: string) {
    return this.dateOnly() ? isCalendarDate(value) : !!watInstant(value);
  }

  private focusCalendarDay() {
    afterNextRender(
      { write: () => this.panel().nativeElement.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus() },
      { injector: this.injector },
    );
  }
}
