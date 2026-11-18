import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Api } from '../../core/http/api';
import { BusinessChoice, EmailResult } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { emailValidators } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
@Component({
  selector: 'app-email-request',
  imports: [ReactiveFormsModule, Field, Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-errors [messages]="errors()" />
    @if (sent()) {
      <div class="alert alert-success" role="status">
        <strong>Check your inbox</strong>
        <p>
          {{
            mode() === 'reset'
              ? 'If this email exists, a password reset link will be sent.'
              : 'Your verification email has been sent. Check your spam folder too.'
          }}
        </p>
      </div>
    }
    @if (choices().length) {
      <h2 class="section-title">Choose a business</h2>
      <p class="muted">Which business should receive this request?</p>
      <div class="business-choices">
        @for (choice of choices(); track choice.slug) {
          <button
            type="button"
            class="business-choice"
            [disabled]="busy()"
            (click)="send(choice.slug)"
          >
            <span class="choice-icon"><app-icon name="building" /></span
            ><span
              ><strong>{{ choice.businessName }}</strong
              ><small>{{ choice.slug }}</small></span
            ><app-icon name="arrow" />
          </button>
        }
      </div>
      <button type="button" class="text-button" [disabled]="busy()" (click)="choices.set([])">
        Use a different email
      </button>
    } @else {
      <form (submit)="$event.preventDefault(); send()" novalidate [attr.aria-busy]="busy()">
        <fieldset [disabled]="busy()">
          <app-field
            id="request-email"
            label="Email"
            [control]="email"
            type="email"
            autocomplete="email"
            placeholder="name@example.com"
            [maxLength]="150"
          />
          <button appButton class="w-full" [disabled]="busy()" type="submit">
            {{
              busy()
                ? 'Sending…'
                : mode() === 'reset'
                  ? 'Send reset link'
                  : 'Resend verification email'
            }}
          </button>
        </fieldset>
      </form>
    }
  `,
})
export class EmailRequest {
  readonly mode = input<'reset' | 'verify'>('verify');
  private readonly api = inject(Api);
  readonly email = new FormControl('', { nonNullable: true, validators: emailValidators });
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly errors = signal<string[]>([]);
  readonly choices = signal<BusinessChoice[]>([]);
  private requestEmail = '';
  async send(slug?: string) {
    if (this.busy()) return;
    this.email.markAsTouched();
    if (this.email.invalid && !slug) return;
    this.busy.set(true);
    this.errors.set([]);
    this.sent.set(false);
    if (!slug) this.requestEmail = this.email.value.trim().toLowerCase();
    try {
      const { data } = await this.api.post<EmailResult | undefined>(
        this.mode() === 'reset' ? '/auth/initiate-password-reset' : '/auth/resend-token',
        { email: this.requestEmail },
        slug,
      );
      if (data?.requiresAccountSelection && data.businesses?.length)
        this.choices.set(data.businesses);
      else if (data?.verificationEmailSent === false)
        this.errors.set(['The email could not be sent. Please try again.']);
      else {
        this.choices.set([]);
        this.sent.set(true);
      }
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
