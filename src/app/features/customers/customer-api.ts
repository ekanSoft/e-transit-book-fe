import { inject, Injectable } from '@angular/core';
import { Api } from '../../core/http/api';
import { normalizeNigerianPhone } from '../../shared/utilities/phone';
import type { Page } from '../workspace/workspace-data';

export interface Contact {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
}

export interface Customer extends Contact {
  _id: string;
  business: string;
  createdAt: string;
  updatedAt: string;
}

export type RecordPage<T> = Page<T> & {
  pageSize: number;
  nextPage?: number;
  previousPage?: number;
};

export function contactName(contact: Pick<Contact, 'firstName' | 'lastName'>) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
}

export function customerChanges(customer: Customer, draft: Contact): Partial<Contact> {
  const changes: Partial<Contact> = {};
  if (draft.firstName !== customer.firstName) changes.firstName = draft.firstName;
  if (draft.lastName !== customer.lastName) changes.lastName = draft.lastName;
  if (draft.phoneNumber !== normalizeNigerianPhone(customer.phoneNumber)) {
    changes.phoneNumber = draft.phoneNumber;
  }
  if (draft.email && draft.email !== customer.email) changes.email = draft.email;
  return changes;
}

@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private readonly api = inject(Api);

  async list(query: { page: number; limit: number; search?: string; phoneNumber?: string }) {
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
    if (query.search) params.set('search', query.search);
    if (query.phoneNumber) params.set('phoneNumber', normalizeNigerianPhone(query.phoneNumber));
    return (await this.api.get<RecordPage<Customer>>('/customers?' + params)).data;
  }

  async byPhone(phoneNumber: string) {
    return (await this.list({ page: 1, limit: 1, phoneNumber })).content[0] ?? null;
  }

  async detail(id: string) {
    return (await this.api.get<Customer>('/customers/' + encodeURIComponent(id))).data;
  }

  async create(body: Contact) {
    return (await this.api.post<Customer>('/customers', body)).data;
  }

  async update(id: string, body: Partial<Contact>) {
    return (await this.api.patch<Customer>('/customers/' + encodeURIComponent(id), body)).data;
  }
}
