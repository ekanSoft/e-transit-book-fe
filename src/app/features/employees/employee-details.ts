import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../../shared/ui/button';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { addressLabel, type Branch } from '../workspace/workspace-data';
import { employeeName, type EmployeeRow } from './employees-api';

@Component({
  selector: 'app-employee-details',
  imports: [Button, ManagementDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-management-dialog [title]="name()" [trigger]="trigger()" (dismiss)="dismissed.emit()">
      <div class="management-body">
        <dl class="details-grid employee-details-grid">
          <div>
            <dt>Email address</dt>
            <dd>{{ employee().email || 'Not provided' }}</dd>
          </div>
          <div>
            <dt>Employee phone</dt>
            <dd>{{ employee().phoneNumber || 'Not provided' }}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{{ roleLabel() }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ statusLabel() }}</dd>
          </div>
          @if (gender(); as label) {
            <div>
              <dt>Gender</dt>
              <dd>{{ label }}</dd>
            </div>
          }
        </dl>

        @if (employee().branch) {
          <section class="management-section" aria-labelledby="employee-terminal-heading">
            <h3 id="employee-terminal-heading">Assigned terminal</h3>
            @if (terminal(); as assigned) {
              <dl class="details-grid employee-details-grid">
                <div>
                  <dt>Terminal name</dt>
                  <dd>{{ assigned.name }}</dd>
                </div>
                <div>
                  <dt>Terminal phone</dt>
                  <dd>{{ assigned.phoneNumber || 'Not provided' }}</dd>
                </div>
                <div class="full-width">
                  <dt>Terminal address</dt>
                  <dd>{{ address(assigned.address) || 'Not provided' }}</dd>
                </div>
              </dl>
            } @else if (terminalLoading()) {
              <p class="muted" role="status">Loading terminal details…</p>
            } @else if (terminalLoadFailed()) {
              <p class="muted" role="status">Terminal details could not be loaded.</p>
              <button class="text-button" type="button" (click)="retryTerminal.emit()">
                Retry loading terminal details
              </button>
            } @else {
              <p class="muted">The assigned terminal is unavailable.</p>
            }
          </section>
        }
      </div>

      <footer class="management-footer">
        <button appButton variant="secondary" type="button" (click)="dismissed.emit()">
          Close
        </button>
      </footer>
    </app-management-dialog>
  `,
  styles: `
    .employee-details-grid {
      gap: 12px 16px;
      padding: 0;
    }

    .employee-details-grid > div {
      min-width: 0;
      padding: 0;
      border: 0;
    }
  `,
})
export class EmployeeDetails {
  readonly employee = input.required<EmployeeRow>();
  readonly roleLabel = input.required<string>();
  readonly statusLabel = input.required<string>();
  readonly trigger = input.required<HTMLElement>();
  readonly terminal = input<Branch>();
  readonly terminalLoading = input(false);
  readonly terminalLoadFailed = input(false);
  readonly retryTerminal = output<void>();
  readonly dismissed = output<void>();

  protected readonly name = computed(() => employeeName(this.employee()));
  protected readonly gender = computed(() => {
    const gender = this.employee().gender;
    return gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : undefined;
  });
  protected readonly address = addressLabel;
}
