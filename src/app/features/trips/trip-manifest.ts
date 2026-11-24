import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { TripApi, tripStatuses, type TripManifest } from './trip-api';
import { routeLabel, showWat, tripReadErrors } from './trip-format';

@Component({
  selector: 'app-trip-manifest',
  imports: [Button, Errors, RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-manifest.html',
  styleUrls: ['./trip-workspace.css', './trip-manifest.css'],
})
export class TripManifestPage {
  readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))));
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(TripApi);
  readonly manifest = resource({
    params: computed(() => {
      const id = this.id();
      const scope = this.access.tripScope();
      return id && scope && this.access.canReadTripManifest() ? { id, scope } : undefined;
    }),
    loader: ({ params }) => this.api.manifest(params.id),
  });
  readonly summary: { key: keyof TripManifest['summary']; label: string }[] = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'checkedIn', label: 'Checked in' },
    { key: 'activePassengers', label: 'Active passengers' },
    { key: 'missed', label: 'Missed' },
    { key: 'seatsSold', label: 'Seats sold' },
  ];
  readonly errors = tripReadErrors;
  readonly showWat = showWat;
  readonly routeLabel = routeLabel;
  readonly statuses = tripStatuses;

  constructor() {
    effect(() => {
      if (this.id() && this.api.lastBookingChange()?.trip === this.id()) this.manifest.reload();
    });
  }
}
