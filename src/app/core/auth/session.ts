import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Api } from '../http/api';
import {
  Business,
  EmailRecipient,
  Employee,
  LoginResult,
  LoginSelection,
  LoginSuccess,
} from '../http/api.models';
import { errorMessages } from '../http/errors';
import { businessDestination, isSignInRoute } from './routing';

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly key = 'etransitbook.session';
  private readonly tokenState = signal<string | null>(this.readToken());
  readonly token = this.tokenState.asReadonly();
  readonly employee = signal<Employee | null>(null);
  readonly business = signal<Business | null>(null);
  readonly selection = signal<(LoginSelection & { email?: string }) | null>(null);
  readonly contextError = signal<string[]>([]);
  readonly contextStatus = signal(0);
  readonly loading = signal(false);
  readonly storageWarning = signal(false);
  readonly switchEmail = signal('');
  readonly authenticated = computed(() => !!this.token());
  readonly destination = computed(() => {
    const business = this.business();
    return business ? businessDestination(business) : '/pending-approval';
  });
  private pendingLoad?: Promise<void>;
  private generation = 0;
  private signInAttempt = 0;
  private expectedBusiness?: string;

  constructor() {
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (event) => {
        if (event.key === this.key || event.key === null) void this.restoreChangedSession();
      });
  }
  private async restoreChangedSession() {
    const token = this.readToken();
    if (token === this.token()) return;
    this.clear(false);
    this.tokenState.set(token);
    if (isSignInRoute(this.router.url)) return;
    if (token) await this.loadContext();
    if (this.token() === token && !isSignInRoute(this.router.url)) {
      await this.router.navigateByUrl(token ? this.destination() : '/login');
    }
  }
  private readToken(): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }
  async login(email: string, password: string, slug?: string) {
    const attempt = ++this.signInAttempt;
    this.selection.set(null);
    let data: LoginResult;
    try {
      ({ data } = await this.api.post<LoginResult>('/auth/login', { email, password }, slug));
    } catch (error) {
      if (attempt !== this.signInAttempt) return;
      throw error;
    }
    if (attempt !== this.signInAttempt) return;
    if (data.requiresAccountSelection) {
      this.selection.set({ ...data, email });
      await this.router.navigateByUrl('/auth/select-business');
    } else await this.acceptLogin(data);
  }
  async chooseBusiness(businessId: string) {
    const selection = this.selection();
    if (!selection || Date.parse(selection.expiresAt) <= Date.now()) {
      this.selection.set(null);
      throw new Error('Your sign-in request has expired. Please sign in again.');
    }
    const attempt = this.signInAttempt;
    let data: LoginSuccess;
    try {
      ({ data } = await this.api.post<LoginSuccess>('/auth/complete-login', {
        token: selection.token,
        businessId,
      }));
      if (attempt !== this.signInAttempt || this.selection() !== selection) return;
      if (data.business.id !== businessId)
        throw new Error('The selected business could not be confirmed. Sign in again.');
    } catch (error) {
      if (attempt !== this.signInAttempt || this.selection() !== selection) return;
      // Selection tokens are single-use, including an account eligibility failure.
      this.selection.set(null);
      throw error;
    }
    await this.acceptLogin(data);
  }
  private async acceptLogin(result: LoginSuccess) {
    this.establishSession(result);
    await this.loadContext();
    if (this.token() === result.token) await this.router.navigateByUrl(this.destination());
  }
  establishSession(result: LoginSuccess) {
    this.clear(false);
    this.expectedBusiness = result.business.id;
    this.tokenState.set(result.token);
    try {
      localStorage.setItem(this.key, result.token);
    } catch {
      this.storageWarning.set(true);
    }
  }
  async ensureContext() {
    if (this.authenticated() && !this.business()) await this.loadContext();
  }
  loadContext(): Promise<void> {
    if (this.pendingLoad) return this.pendingLoad;
    const generation = this.generation;
    this.loading.set(true);
    this.contextError.set([]);
    this.contextStatus.set(0);
    const request = Promise.all([
      this.api.get<Employee>('/employees/me'),
      this.api.get<Business>('/business'),
    ])
      .then(([employee, business]) => {
        if (generation !== this.generation) return;
        if (
          !business.data?._id ||
          employee.data?.business?._id !== business.data._id ||
          (this.expectedBusiness && this.expectedBusiness !== business.data._id)
        ) {
          throw new Error('The business for this session could not be confirmed. Sign in again.');
        }
        this.expectedBusiness = business.data._id;
        this.employee.set(employee.data);
        this.business.set(business.data);
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        this.contextError.set(errorMessages(error));
        this.contextStatus.set(error instanceof HttpErrorResponse ? error.status : 0);
        this.business.set(null);
        this.employee.set(null);
      })
      .finally(() => {
        if (generation === this.generation) {
          this.loading.set(false);
          this.pendingLoad = undefined;
        }
      });
    this.pendingLoad = request;
    return request;
  }
  clear(removeStored = true) {
    this.generation++;
    this.signInAttempt++;
    this.expectedBusiness = undefined;
    this.pendingLoad = undefined;
    this.tokenState.set(null);
    this.employee.set(null);
    this.business.set(null);
    this.selection.set(null);
    this.contextError.set([]);
    this.contextStatus.set(0);
    this.loading.set(false);
    this.storageWarning.set(false);
    this.switchEmail.set('');
    if (removeStored)
      try {
        localStorage.removeItem(this.key);
      } catch {
        /* Storage can be disabled. */
      }
  }
  async signInError(error: unknown, recipient?: EmailRecipient): Promise<string[]> {
    const messages = errorMessages(error);
    if (error instanceof HttpErrorResponse && error.status === 403) {
      const destination = this.router.createUrlTree(['/auth/access-status'], {
        queryParams: { slug: recipient?.slug },
      });
      await this.router.navigateByUrl(destination, {
        state: { reason: messages.join(' ') },
        info: recipient,
      });
      return [];
    }
    return messages;
  }
  switchBusiness() {
    const email = this.employee()?.email;
    this.clear();
    this.switchEmail.set(email ?? '');
    void this.router.navigateByUrl('/login');
  }
  logout() {
    this.clear();
    void this.router.navigateByUrl('/login');
  }
}
