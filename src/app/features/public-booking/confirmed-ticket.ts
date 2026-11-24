import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FeeLines } from './fee-lines';
import type { Receipt } from './receipt';
import { showWat } from '../trips/trip-format';
@Component({
  selector: 'app-confirmed-ticket',
  imports: [FeeLines],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section class="stack">
    <h2>Your ticket from {{ receipt().businessName }}</h2>
    <p>Show this ticket number when you check in.</p>
    <div class="ticket-code">
      <strong>{{ receipt().ticket }}</strong
      ><button class="secondary" (click)="copy()">Copy ticket number</button>
    </div>
    <p>{{ receipt().passengerName }} · Seat {{ receipt().seatNumber }}</p>
    <p>{{ receipt().origin }} → {{ receipt().destination }}</p>
    <p>{{ wat(receipt().departureTime) }}</p>
    <p>
      {{ receipt().paidAt ? 'Paid' : 'Payment confirmed' }} ·
      {{ wat(receipt().paidAt ?? receipt().confirmedAt) }}
    </p>
    <app-fee-lines [fees]="receipt().fees" totalLabel="Total paid" />
    <div class="row">
      <button class="action" [disabled]="busy()" (click)="download()">Download PDF receipt</button
      ><button class="secondary" (click)="another.emit()">Book another trip</button>
    </div>
    <p role="status">{{ message() }}</p>
  </section>`,
  styles: `
    .ticket-code {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      border-block: 1px dashed #97a69e;
      padding-block: 18px;
    }
    .ticket-code strong {
      font-family: monospace;
      font-size: clamp(24px, 4vw, 38px);
      letter-spacing: 0.1em;
    }
  `,
})
export class ConfirmedTicket {
  readonly receipt = input.required<Receipt>();
  readonly another = output<void>();
  readonly message = signal('');
  readonly busy = signal(false);
  readonly wat = showWat;
  private readonly life = inject(DestroyRef);
  constructor() {
    effect(() => {
      const r = this.receipt();
      const key = 'etb.pdf.' + r.reference;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
      } catch {
        return;
      }
      void this.download(r);
    });
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.receipt().ticket);
      this.message.set('Ticket number copied.');
    } catch {
      this.message.set('Select the ticket number to copy it.');
    }
  }
  async download(r = this.receipt()) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { buildReceipt } = await import('./receipt-pdf');
      const pdf = await buildReceipt(r);
      if (!this.life.destroyed && this.receipt().reference === r.reference)
        pdf.save('ticket-' + r.ticket + '.pdf');
    } catch {
      this.message.set('The receipt could not be downloaded. Try Download PDF receipt again.');
    } finally {
      this.busy.set(false);
    }
  }
}
