import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateExpenseRequest, ExpenseDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ExpensesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/expenses`;

  list(opts: { branchId?: string; from?: string; to?: string; take?: number } = {})
    : Observable<ExpenseDto[]> {
    const params: Record<string, string | number> = {};
    if (opts.branchId) params['branchId'] = opts.branchId;
    if (opts.from) params['from'] = opts.from;
    if (opts.to) params['to'] = opts.to;
    if (opts.take) params['take'] = opts.take;
    return this.http.get<ExpenseDto[]>(this.base, { params });
  }

  create(body: CreateExpenseRequest): Observable<ExpenseDto> {
    return this.http.post<ExpenseDto>(this.base, body);
  }
}
