import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum AccountClass { Asset = 0, Liability = 1, Equity = 2, Revenue = 3, Expense = 4 }

export interface AccountDto {
  id: string;
  code: string;
  name: string;
  class: AccountClass;
  className: string;
  description: string | null;
  isSystem: boolean;
  isCashOrBank: boolean;
  isActive: boolean;
  balance: number;
}

@Injectable({ providedIn: 'root' })
export class AccountingApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/accounting`;

  accounts(includeInactive = false): Observable<AccountDto[]> {
    return this.http.get<AccountDto[]>(`${this.base}/accounts`, { params: { includeInactive } });
  }
}
