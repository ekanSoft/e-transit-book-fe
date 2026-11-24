import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { amount, type Fees } from './attempts';
@Component({
  selector: 'app-fee-lines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dl class="amounts">
    <div>
      <dt>Seat fare</dt>
      <dd>{{ money(fees().fareKobo) }}</dd>
    </div>
    <div>
      <dt>Processing fee</dt>
      <dd>{{ money(fees().platformFeeKobo + fees().processingFeeKobo) }}</dd>
    </div>
    <div>
      <dt>
        <strong>{{ totalLabel() }}</strong>
      </dt>
      <dd>{{ money(fees().totalKobo) }}</dd>
    </div>
  </dl>`,
})
export class FeeLines {
  readonly fees = input.required<Fees>();
  readonly totalLabel = input('Total to pay');
  readonly money = amount;
}
