import { Injectable, inject } from '@angular/core';
import { Api } from './api';

export interface SettlementBank {
  name: string;
  code: string;
}

export interface SettlementBankRequest {
  accountNumber: string;
  bankCode: string;
}

export interface SettlementBankDetails extends SettlementBankRequest {
  bankName: string;
  accountName: string;
  paystackSubaccountCode?: string;
}

@Injectable({ providedIn: 'root' })
export class SettlementBankApi {
  private readonly api = inject(Api);

  async banks() {
    return (await this.api.get<SettlementBank[]>('/business/banks')).data;
  }

  async resolve(request: SettlementBankRequest) {
    return (await this.api.post<SettlementBankDetails>('/business/banks/resolve', request)).data;
  }

  async savedDetails() {
    return (await this.api.get<SettlementBankDetails | null>('/business/bank-details')).data;
  }
}
