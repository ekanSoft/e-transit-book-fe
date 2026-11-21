import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { SearchableSelect } from '../../shared/forms/searchable-select';
import { applyServerValidation } from '../../shared/forms/server-validation';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import {
  type Branch,
  type CreateRoute,
  type Route,
  WorkspaceData,
} from '../workspace/workspace-data';
import { findDirectionalRoute, terminalLocation, terminalName } from './route-labels';

const sameTerminalMessage = 'Origin and destination terminals must be different.';

@Component({
  selector: 'app-route-form',
  imports: [
    Button,
    Errors,
    Icon,
    ManagementDialog,
    ReactiveFormsModule,
    RouterLink,
    SearchableSelect,
  ],
  templateUrl: './route-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteForm {
  readonly trigger = input.required<HTMLElement>();
  readonly terminals = input<Branch[]>();
  readonly terminalError = input<unknown>();
  readonly routes = input.required<readonly Route[]>();
  readonly routesLoading = input(false);
  readonly activeRouteAction = input('View existing route');
  readonly retryTerminals = output<void>();
  readonly retryRoutes = output<void>();
  readonly conflicted = output<CreateRoute>();
  readonly viewExisting = output<string>();
  readonly dismissed = output<void>();
  readonly saved = output<Route>();

  readonly access = inject(WorkspaceAccess);
  private readonly session = inject(Session);
  private readonly api = inject(WorkspaceData);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scope = this.access.scope();
  readonly busy = signal(false);
  readonly sameTerminalMessage = sameTerminalMessage;
  readonly form = new FormGroup({
    originBranch: new FormControl('', { nonNullable: true, validators: Validators.required }),
    destinationBranch: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  private readonly formEvents = toSignal(this.form.events);
  private readonly selection = toSignal(this.form.valueChanges);
  readonly errors = linkedSignal({ source: this.selection, computation: (): string[] => [] });
  readonly conflict = linkedSignal({
    source: this.selection,
    computation: (): CreateRoute | null => null,
  });
  readonly existing = computed(() => {
    const pair = this.conflict();
    return pair ? findDirectionalRoute(this.routes(), pair) : undefined;
  });
  readonly terminalOptions = computed(() =>
    (this.terminals() ?? []).map((terminal) => {
      const name = terminalName(terminal);
      const location = terminalLocation(terminal);
      return { value: terminal._id, label: location ? `${name} — ${location}` : name };
    }),
  );
  readonly sameTerminal = computed(() => {
    const { originBranch, destinationBranch } = this.selection() ?? {};
    return !!originBranch && originBranch === destinationBranch;
  });
  readonly canSubmit = computed(() => {
    this.formEvents();
    const options = this.terminalOptions();
    const { originBranch, destinationBranch } = this.form.getRawValue();
    return (
      this.access.canCreateRoute() &&
      !!this.scope &&
      this.scope === this.access.scope() &&
      this.form.valid &&
      !this.sameTerminal() &&
      !this.busy() &&
      !this.conflict() &&
      options.length >= 2 &&
      options.some(({ value }) => value === originBranch) &&
      options.some(({ value }) => value === destinationBranch)
    );
  });

  async submit() {
    if (this.destroyRef.destroyed || !this.canSubmit()) return;
    const pair = this.form.getRawValue();
    const terminals = this.terminals() ?? [];
    this.busy.set(true);
    this.errors.set([]);
    try {
      const { data } = await this.api.createRoute(pair);
      if (!this.destroyRef.destroyed && this.scope === this.access.scope()) {
        this.saved.emit({
          _id: data._id,
          status: data.status,
          originBranch: terminals.find(({ _id }) => _id === data.originBranch) ?? null,
          destinationBranch: terminals.find(({ _id }) => _id === data.destinationBranch) ?? null,
        });
      }
    } catch (error) {
      if (this.destroyRef.destroyed || this.scope !== this.access.scope()) return;
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (status === 409) {
        this.conflict.set(pair);
        this.conflicted.emit(pair);
      } else {
        this.errors.set(
          applyServerValidation(error, this.form.controls, {
            'Origin branch must be a valid ID': {
              field: 'originBranch',
              text: 'Select a valid origin terminal.',
            },
            'Destination branch must be a valid ID': {
              field: 'destinationBranch',
              text: 'Select a valid destination terminal.',
            },
            'Origin and destination branches must be different': {
              field: 'destinationBranch',
              text: sameTerminalMessage,
            },
          }),
        );
        if (status === 403) void this.session.loadContext();
        if (status === 404) this.retryTerminals.emit();
      }
    } finally {
      this.busy.set(false);
    }
  }
}
