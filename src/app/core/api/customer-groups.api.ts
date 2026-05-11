import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateCustomerGroupRequest,
  CustomerGroupDto,
  UpdateCustomerGroupRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class CustomerGroupsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/customer-groups`;

  list(includeInactive = false): Observable<CustomerGroupDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<CustomerGroupDto[]>(this.base, { params });
  }

  get(id: string): Observable<CustomerGroupDto> {
    return this.http.get<CustomerGroupDto>(`${this.base}/${id}`);
  }

  create(body: CreateCustomerGroupRequest): Observable<CustomerGroupDto> {
    return this.http.post<CustomerGroupDto>(this.base, body);
  }

  update(body: UpdateCustomerGroupRequest): Observable<CustomerGroupDto> {
    return this.http.put<CustomerGroupDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
