import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResultDto {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: ImportRowError[];
}

@Injectable({ providedIn: 'root' })
export class ImportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/imports`;

  importProducts(file: File): Observable<ImportResultDto> {
    return this.http.post<ImportResultDto>(`${this.base}/products`, this.formData(file));
  }

  importCustomers(file: File): Observable<ImportResultDto> {
    return this.http.post<ImportResultDto>(`${this.base}/customers`, this.formData(file));
  }

  importSuppliers(file: File): Observable<ImportResultDto> {
    return this.http.post<ImportResultDto>(`${this.base}/suppliers`, this.formData(file));
  }

  private formData(file: File): FormData {
    const fd = new FormData();
    fd.append('file', file);
    return fd;
  }
}
