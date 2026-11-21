import { Combobox, ComboboxInput } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { Session } from '../../core/auth/session';
import { errorMessages } from '../../core/http/errors';
import { SettlementBankApi } from '../../core/http/settlement-bank-api';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';

const accountNumberPattern = /^[0-9]{10}$/;

@Component({
  selector: 'app-settlement-bank-fields',
  imports: [Combobox, ComboboxInput, Listbox, Option, Errors, Icon, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settlement-bank-fields.html',
  styleUrl: './settlement-bank-fields.css',
  host: { class: 'block', '(document:pointerdown)': 'dismissBankPicker($event.target)' },
})
export class SettlementBankFields {
  private readonly api = inject(SettlementBankApi);
  private readonly session = inject(Session);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly bankPickerElement = viewChild<ElementRef<HTMLElement>>('bankPickerElement');
  private readonly bankTrigger = viewChild<ElementRef<HTMLButtonElement>>('bankTrigger');
  private readonly bankSearch = viewChild<ElementRef<HTMLInputElement>>('bankSearch');
  private readonly accountInput = viewChild<ElementRef<HTMLInputElement>>('accountInput');
  private readonly bankPicker = viewChild(Combobox);
  private readonly bankList = viewChild(Listbox);

  protected readonly form = this.fb.group({ bankCode: '', accountNumber: '' });
  private readonly draft = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  readonly saving = input(false);
  protected readonly bankPickerOpen = signal(false);
  protected readonly bankQuery = signal('');
  protected readonly attempted = signal(false);
  protected readonly errors = errorMessages;

  protected readonly details = resource({
    params: () => this.session.business()?._id,
    loader: () => this.api.savedDetails(),
  });
  protected readonly banks = resource({
    params: () =>
      this.details.status() === 'resolved' && this.details.value() === null ? true : undefined,
    loader: () => this.api.banks(),
  });
  protected readonly bankOptions = computed(() => {
    if (!this.banks.hasValue()) return [];
    const search = this.bankQuery().trim().toLowerCase();
    return this.banks.value().filter(({ name }) => name.toLowerCase().includes(search));
  });
  protected readonly selectedBankName = computed(() =>
    this.banks.hasValue()
      ? this.banks.value().find(({ code }) => code === this.draft().bankCode)?.name
      : undefined,
  );
  protected readonly bankMissing = computed(() => !this.draft().bankCode);
  protected readonly accountNumberValid = computed(() =>
    accountNumberPattern.test(this.draft().accountNumber),
  );
  private readonly request = computed(() => {
    const draft = this.draft();
    if (this.banks.hasValue() && draft.bankCode && this.accountNumberValid()) return draft;
    return undefined;
  });
  protected readonly verification = resource({
    params: this.request,
    loader: ({ params }) => this.api.resolve(params),
  });
  protected readonly accountName = computed(() =>
    this.verification.hasValue() ? this.verification.value().accountName : '',
  );
  protected readonly statusCode = computed(() => {
    const error = this.verification.error();
    return error instanceof HttpErrorResponse ? error.status : undefined;
  });
  protected readonly canRetry = computed(() =>
    [0, 502, 503].some((code) => code === this.statusCode()),
  );

  constructor() {
    afterRenderEffect({
      write: () => {
        const search = this.bankSearch();
        if (search) {
          this.bankPicker()?.open();
          search.nativeElement.focus();
        }
      },
    });
    afterRenderEffect({
      write: () => {
        if (
          this.bankPicker()?.expanded() &&
          typeof HTMLElement.prototype.scrollIntoView === 'function'
        ) {
          this.bankList()?.scrollActiveItemIntoView();
        }
      },
    });
  }

  detailsForSubmission() {
    if (this.details.hasValue() && this.details.value()) return undefined;
    const request = this.request();
    if (request && this.accountName()) return request;

    this.attempted.set(true);
    const invalidField = this.bankMissing() ? this.bankTrigger() : this.accountInput();
    (invalidField ?? this.heading())?.nativeElement.focus();
    return null;
  }

  reloadSavedDetails() {
    this.bankPickerOpen.set(false);
    this.form.reset();
    this.bankQuery.set('');
    this.attempted.set(false);
    this.details.reload();
  }

  protected openBankPicker() {
    this.bankQuery.set('');
    this.bankPickerOpen.set(true);
  }

  protected closeBankPicker() {
    this.bankPickerOpen.set(false);
    afterNextRender(
      { write: () => this.bankTrigger()?.nativeElement.focus() },
      {
        injector: this.injector,
      },
    );
  }

  protected dismissBankPicker(target: EventTarget | null) {
    if (
      this.bankPickerOpen() &&
      target instanceof Node &&
      !this.bankPickerElement()?.nativeElement.contains(target)
    ) {
      this.bankPickerOpen.set(false);
    }
  }

  protected selectBank([code]: string[]) {
    if (!this.bankPickerOpen() || !code) return;
    const control = this.form.controls.bankCode;
    if (control.value !== code) control.setValue(code);
    this.closeBankPicker();
  }

  protected normalizeAccountNumber(input: HTMLInputElement) {
    const digits = input.value.replace(/\D/g, '').slice(0, input.maxLength);
    if (digits !== input.value) this.form.controls.accountNumber.setValue(digits);
  }

  protected retryVerification() {
    this.accountInput()?.nativeElement.focus();
    this.verification.reload();
  }
}
