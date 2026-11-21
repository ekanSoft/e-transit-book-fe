import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = Array.from({ length: 60 }, (_, index) => twoDigits(index));

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

function timeParts(value: string) {
  const [hours = '00', minute = '00'] = value.split(':');
  const hour = Number(hours);
  return { hour: hour % 12 || 12, minute, period: hour < 12 ? 'AM' : 'PM' };
}

@Component({
  selector: 'app-time-picker',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.css',
  host: {
    '(document:pointerdown)': 'dismissOutside($event)',
    '(focusout)': 'dismissOnBlur($event)',
    '(keydown.escape)': 'escape($event)',
  },
})
export class TimePicker {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  /** The confirmed wall-clock time in HH:mm, or an empty string. */
  readonly value = model.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly hourInput = viewChild<ElementRef<HTMLSelectElement>>('hourInput');

  protected readonly expanded = signal(false);
  protected readonly hours = hours;
  protected readonly minutes = minutes;
  protected readonly hour = signal(12);
  protected readonly minute = signal('00');
  protected readonly period = signal('AM');
  protected readonly displayTime = computed(() => {
    if (!this.value()) return 'Choose time';
    const { hour, minute, period } = timeParts(this.value());
    return `${hour}:${minute} ${period}`;
  });

  protected toggle() {
    if (this.expanded()) {
      this.expanded.set(false);
      return;
    }
    const { hour, minute, period } = timeParts(this.value());
    this.hour.set(hour);
    this.minute.set(minute);
    this.period.set(period);
    this.expanded.set(true);
    afterNextRender(() => this.hourInput()?.nativeElement.focus(), { injector: this.injector });
  }

  protected confirm() {
    const hour = (this.hour() % 12) + (this.period() === 'PM' ? 12 : 0);
    this.value.set(`${twoDigits(hour)}:${this.minute()}`);
    this.close();
  }

  protected dismissOutside(event: PointerEvent) {
    if (this.expanded() && !event.composedPath().includes(this.host)) this.expanded.set(false);
  }

  protected dismissOnBlur(event: FocusEvent) {
    if (event.relatedTarget instanceof Node && !this.host.contains(event.relatedTarget)) {
      this.expanded.set(false);
    }
  }

  protected escape(event: Event) {
    if (!this.expanded()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  private close() {
    this.expanded.set(false);
    this.trigger().nativeElement.focus();
  }
}
