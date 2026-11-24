import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Field } from '../../shared/forms/field';
import { requiredText } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { ticketCode } from './booking-api';

@Component({
  selector: 'app-find-ticket',
  imports: [Button, Field, RouterLink],
  styleUrl: '../trips/trip-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="text-button trip-back" routerLink="/app/bookings">← All bookings</a>
    <div class="page-heading">
      <div><h1 tabindex="-1">Find ticket</h1></div>
    </div>
    <form
      class="panel trip-panel"
      style="max-width: 450px"
      (submit)="$event.preventDefault(); find()"
      novalidate
    >
      <app-field [id]="'ticket-search'" label="Ticket code" [control]="code" [maxLength]="64" />
      <button appButton type="submit">Find ticket</button>
    </form>
  `,
})
export class FindTicket {
  private readonly router = inject(Router);
  readonly code = new FormControl(inject(ActivatedRoute).snapshot.queryParamMap.get('code') ?? '', {
    nonNullable: true,
    validators: requiredText(64),
  });

  find() {
    this.code.markAsTouched();
    if (this.code.valid)
      void this.router.navigate(['/app/bookings/tickets', ticketCode(this.code.value)]);
  }
}
