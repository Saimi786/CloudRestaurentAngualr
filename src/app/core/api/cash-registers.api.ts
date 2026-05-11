import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AddShiftMovementRequest,
  CashRegisterDto,
  CashRegisterShiftDto,
  CashRegisterShiftSummaryDto,
  CloseShiftRequest,
  CreateCashRegisterRequest,
  OpenShiftRequest,
  ShiftStatus,
  UpdateCashRegisterRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class CashRegistersApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cash-registers`;
  private shiftsBase = `${environment.apiBaseUrl}/cash-register-shifts`;

  list(branchId?: string, includeInactive = false): Observable<CashRegisterDto[]> {
    const params: Record<string, string | boolean> = { includeInactive };
    if (branchId) params['branchId'] = branchId;
    return this.http.get<CashRegisterDto[]>(this.base, { params });
  }

  create(body: CreateCashRegisterRequest): Observable<CashRegisterDto> {
    return this.http.post<CashRegisterDto>(this.base, body);
  }

  update(id: string, body: UpdateCashRegisterRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Shifts ----------------------------------------------------------
  listShifts(opts: { cashRegisterId?: string; status?: ShiftStatus; take?: number } = {})
    : Observable<CashRegisterShiftSummaryDto[]> {
    const params: Record<string, string | number> = {};
    if (opts.cashRegisterId) params['cashRegisterId'] = opts.cashRegisterId;
    if (opts.status !== undefined) params['status'] = opts.status;
    if (opts.take) params['take'] = opts.take;
    return this.http.get<CashRegisterShiftSummaryDto[]>(this.shiftsBase, { params });
  }

  getShift(id: string): Observable<CashRegisterShiftDto> {
    return this.http.get<CashRegisterShiftDto>(`${this.shiftsBase}/${id}`);
  }

  openShift(body: OpenShiftRequest): Observable<CashRegisterShiftDto> {
    return this.http.post<CashRegisterShiftDto>(`${this.shiftsBase}/open`, body);
  }

  closeShift(id: string, body: CloseShiftRequest): Observable<CashRegisterShiftDto> {
    return this.http.post<CashRegisterShiftDto>(`${this.shiftsBase}/${id}/close`, body);
  }

  addMovement(id: string, body: AddShiftMovementRequest): Observable<void> {
    return this.http.post<void>(`${this.shiftsBase}/${id}/movements`, body);
  }
}
