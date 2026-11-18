import { Directive, input } from '@angular/core';
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: {
    class: 'button',
    '[class.button-secondary]': 'variant() === "secondary"',
    '[class.button-quiet]': 'variant() === "quiet"',
  },
})
export class Button {
  readonly variant = input<'primary' | 'secondary' | 'quiet'>('primary');
}
