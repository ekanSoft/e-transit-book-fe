import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'app-brand',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="brand-mark"><app-icon name="bus" /></span
    ><span class="brand-name">eTransit<span>Book</span></span>`,
})
export class Brand {}
