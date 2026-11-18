import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Session } from '../../core/auth/session';
import { Business, DocumentKey } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { FileUpload } from '../../shared/forms/file-upload';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { OnboardingApi } from './data-access/onboarding-api';
@Component({
  selector: 'app-business-verification',
  imports: [ReactiveFormsModule, Field, FileUpload, Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-heading">
      <div>
        <span class="eyebrow">STEP 03</span>
        <h2>Business Verification</h2>
        <p>
          Enter your company registration number (RC number) or upload one registration document.
        </p>
      </div>
      <span class="panel-icon"><app-icon name="shield" /></span>
    </div>
    <form (submit)="$event.preventDefault(); submit()" novalidate [attr.aria-busy]="busy()">
      <div class="panel-body">
        <app-errors [messages]="errors()" />
        <fieldset [disabled]="busy()">
          <app-field
            [id]="'rc-number'"
            label="RC number"
            [control]="rcNumber"
            placeholder="e.g. RC1234567"
            [maxLength]="80"
            [optional]="true"
          />
          <div class="form-section">
            <h3>Registration documents</h3>
            <p class="muted small">
              If you entered your RC number, you can skip this section. Otherwise, upload a clear
              copy of any one document.
            </p>
            @for (document of documents; track document.key) {
              <app-file-upload
                [id]="document.key"
                [label]="document.label"
                [optional]="true"
                [existing]="!!session.business()?.documents?.[document.key]"
                [disabled]="busy()"
                (changed)="setFile(document.key, $event)"
                (validity)="setValidity(document.key, $event)"
              />
            }
          </div>
        </fieldset>
      </div>
      <div class="panel-footer">
        <span class="small muted">We’ll review your details before activating your account.</span
        ><button appButton type="submit" [disabled]="busy() || !filesValid()">
          {{ busy() ? 'Saving…' : 'Save and continue' }}<app-icon name="arrow" />
        </button>
      </div>
    </form>
  `,
})
export class BusinessVerification {
  readonly session = inject(Session);
  private readonly api = inject(OnboardingApi);
  readonly saved = output<Business>();
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly rcNumber = new FormControl(this.session.business()?.rcNumber ?? '', {
    nonNullable: true,
    validators: Validators.maxLength(80),
  });
  readonly documents: { key: DocumentKey; label: string }[] = [
    { key: 'certificateOfIncorporation', label: 'Certificate of incorporation' },
    { key: 'formCAC', label: 'CAC form' },
    { key: 'memorandumAndArticle', label: 'Memorandum and Articles of Association' },
  ];
  readonly files = signal<Partial<Record<DocumentKey, File>>>({});
  private readonly invalidFiles = signal<Partial<Record<DocumentKey, boolean>>>({});
  readonly filesValid = computed(() => !Object.values(this.invalidFiles()).some(Boolean));
  setFile(key: DocumentKey, file: File | null) {
    this.files.update((files) => {
      const next = { ...files };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }
  setValidity(key: DocumentKey, valid: boolean) {
    this.invalidFiles.update((value) => ({ ...value, [key]: !valid }));
  }
  async submit() {
    if (this.busy() || !this.filesValid()) return;
    this.rcNumber.markAsTouched();
    if (this.rcNumber.invalid) return;
    if (!this.rcNumber.value.trim() && !Object.keys(this.files()).length) {
      this.errors.set(['Enter your RC number or upload one document to continue.']);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    try {
      const response = await this.api.verification(this.rcNumber.value, this.files());
      this.saved.emit(response.data);
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
