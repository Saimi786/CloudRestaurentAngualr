import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateModifierGroupRequest, ModifierGroupDto, ModifierGroupSummaryDto,
  SetProductModifierGroupsRequest, UpdateModifierGroupRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class ModifierGroupsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/modifier-groups`;
  private readonly productsBase = `${environment.apiBaseUrl}/products`;

  list(includeInactive = false): Observable<ModifierGroupSummaryDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<ModifierGroupSummaryDto[]>(this.base, { params });
  }

  get(id: string): Observable<ModifierGroupDto> {
    return this.http.get<ModifierGroupDto>(`${this.base}/${id}`);
  }

  create(body: CreateModifierGroupRequest): Observable<ModifierGroupDto> {
    return this.http.post<ModifierGroupDto>(this.base, body);
  }

  update(body: UpdateModifierGroupRequest): Observable<ModifierGroupDto> {
    return this.http.put<ModifierGroupDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Product link
  getForProduct(productId: string): Observable<ModifierGroupSummaryDto[]> {
    return this.http.get<ModifierGroupSummaryDto[]>(`${this.productsBase}/${productId}/modifier-groups`);
  }

  setForProduct(productId: string, body: SetProductModifierGroupsRequest): Observable<void> {
    return this.http.put<void>(`${this.productsBase}/${productId}/modifier-groups`, body);
  }
}
