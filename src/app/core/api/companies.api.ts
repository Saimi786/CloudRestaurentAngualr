import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompanyDto, CreateCompanyRequest, UpdateCompanyRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CompaniesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/companies`;

  list(includeInactive = false): Observable<CompanyDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<CompanyDto[]>(this.base, { params });
  }

  get(id: string): Observable<CompanyDto> {
    return this.http.get<CompanyDto>(`${this.base}/${id}`);
  }

  create(body: CreateCompanyRequest): Observable<CompanyDto> {
    return this.http.post<CompanyDto>(this.base, body);
  }

  update(body: UpdateCompanyRequest): Observable<CompanyDto> {
    return this.http.put<CompanyDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
