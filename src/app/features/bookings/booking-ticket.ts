import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import type { Contact } from '../customers/customer-api';
import { contactName } from '../customers/customer-api';
import { fareLabel, showWat } from '../trips/trip-format';
import { normalizeNigerianPhone } from '../../shared/utilities/phone';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import {
  bookingStatus,
  type Booking,
  type BookingReceipt,
  type RecordedPayment,
} from './booking-api';

export const paymentLabels = { CASH: 'Cash', TRANSFER: 'Transfer', POS: 'POS' } as const;

@Component({
  selector: 'app-booking-ticket',
  imports: [Button, Icon],
  templateUrl: './booking-ticket.html',
  styleUrls: ['./booking-ticket.css', '../trips/trip-workspace.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingTicket {
  private readonly document = inject(DOCUMENT);
  readonly booking = input.required<Booking | BookingReceipt['booking']>();
  readonly journey = input('');
  readonly departure = input<string>();
  readonly payment = input<RecordedPayment | null>();
  readonly copyStatus = signal('');
  readonly status = bookingStatus;
  readonly showWat = showWat;
  readonly name = contactName;
  readonly fare = fareLabel;
  readonly paymentLabels = paymentLabels;

  contact(contact: Contact) {
    return contactName(contact) + ' · ' + normalizeNigerianPhone(contact.phoneNumber);
  }

  async copy() {
    const ticket = this.booking().ticket;
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard unavailable');
      await clipboard.writeText(ticket);
      this.copyStatus.set('Ticket code copied.');
    } catch {
      this.copyStatus.set('Copy is unavailable. Select the ticket code to copy it manually.');
    }
  }
}
