import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalesSummaryDto, StockValuationDto, TopProductRow } from '../models';

export interface PnlAccountRow { code: string; name: string; amount: number; }
export interface ProfitAndLossDto {
  from: string; to: string;
  revenueAccounts: PnlAccountRow[];
  totalRevenue: number;
  expenseAccounts: PnlAccountRow[];
  totalExpense: number;
  netIncome: number;
}

export interface TaxRateRow { ratePercentage: number; taxableSales: number; taxCollected: number; }
export interface TaxSummaryDto {
  from: string; to: string;
  orderCount: number;
  totalTaxableSales: number;
  totalTaxCollected: number;
  byRate: TaxRateRow[];
}

export interface ExpenseCategoryRow {
  accountId: string; accountCode: string; accountName: string;
  count: number; total: number;
}
export interface ExpenseByCategoryDto {
  from: string; to: string;
  totalCount: number; grand: number;
  byCategory: ExpenseCategoryRow[];
}

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/reports`;

  salesSummary(from: string, to: string, branchId?: string): Observable<SalesSummaryDto> {
    const params: Record<string, string> = { from, to };
    if (branchId) params['branchId'] = branchId;
    return this.http.get<SalesSummaryDto>(`${this.base}/sales-summary`, { params });
  }

  topProducts(from: string, to: string, branchId?: string, take = 20): Observable<TopProductRow[]> {
    const params: Record<string, string | number> = { from, to, take };
    if (branchId) params['branchId'] = branchId;
    return this.http.get<TopProductRow[]>(`${this.base}/top-products`, { params });
  }

  stockValuation(branchId?: string): Observable<StockValuationDto> {
    const params: Record<string, string> = {};
    if (branchId) params['branchId'] = branchId;
    return this.http.get<StockValuationDto>(`${this.base}/stock-valuation`, { params });
  }

  profitAndLoss(from: string, to: string): Observable<ProfitAndLossDto> {
    return this.http.get<ProfitAndLossDto>(`${this.base}/profit-and-loss`, { params: { from, to } });
  }

  taxSummary(from: string, to: string, branchId?: string): Observable<TaxSummaryDto> {
    const params: Record<string, string> = { from, to };
    if (branchId) params['branchId'] = branchId;
    return this.http.get<TaxSummaryDto>(`${this.base}/tax-summary`, { params });
  }

  expenseByCategory(from: string, to: string, branchId?: string): Observable<ExpenseByCategoryDto> {
    const params: Record<string, string> = { from, to };
    if (branchId) params['branchId'] = branchId;
    return this.http.get<ExpenseByCategoryDto>(`${this.base}/expense-by-category`, { params });
  }
}
