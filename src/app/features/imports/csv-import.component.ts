import { Component, inject, signal } from '@angular/core';
import { ImportResultDto, ImportsApi } from '../../core/api/imports.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { NotificationService } from '../../core/notifications/notification.service';

type ImportType = 'products' | 'customers' | 'suppliers';

interface ImportSpec {
  key: ImportType;
  label: string;
  requiredColumns: string[];
  optionalColumns: string[];
  example: string;
}

@Component({
  selector: 'app-csv-import',
  standalone: true,
  template: `
    <div class="page-header">
      <div>
        <h1>CSV Import</h1>
        <p class="muted">Bulk-import products, customers, or suppliers. Errors are reported per row — fix and re-upload.</p>
      </div>
    </div>

    <div class="panel">
      <div class="form-row" style="align-items:flex-end;">
        <div class="field" style="flex:1;">
          <label>What are you importing?</label>
          <select [value]="active().key" (change)="select($any($event.target).value)">
            @for (s of specs; track s.key) {
              <option [value]="s.key">{{ s.label }}</option>
            }
          </select>
        </div>
        <div class="field" style="flex:2;">
          <label>CSV File</label>
          <input type="file" accept=".csv,text/csv,text/plain"
                 (change)="onFile($event)" [disabled]="busy()" />
        </div>
        <button class="btn btn-primary" (click)="upload()" [disabled]="!file() || busy()">
          {{ busy() ? 'Uploading…' : 'Import' }}
        </button>
      </div>

      <div class="muted small" style="margin-top:0.4rem;">
        <strong>Required columns:</strong> {{ active().requiredColumns.join(', ') }}<br />
        <strong>Optional columns:</strong> {{ active().optionalColumns.join(', ') }}
      </div>

      <details style="margin-top:0.8rem;">
        <summary class="muted small">Show example CSV</summary>
        <pre class="csv-example">{{ active().example }}</pre>
      </details>
    </div>

    @if (result(); as r) {
      <div class="panel" style="margin-top:1.5rem;">
        <h2>Result</h2>
        <div class="result-summary">
          <div class="stat">
            <div class="stat-num">{{ r.totalRows }}</div>
            <div class="stat-label">total</div>
          </div>
          <div class="stat ok">
            <div class="stat-num">{{ r.importedRows }}</div>
            <div class="stat-label">imported</div>
          </div>
          <div class="stat err" [class.zero]="r.skippedRows === 0">
            <div class="stat-num">{{ r.skippedRows }}</div>
            <div class="stat-label">skipped</div>
          </div>
        </div>

        @if (r.errors.length > 0) {
          <h3 style="margin-top:1rem;">Errors</h3>
          <table class="data-table">
            <thead>
              <tr><th>Row</th><th>Field</th><th>Message</th></tr>
            </thead>
            <tbody>
              @for (e of r.errors; track e.row + e.field) {
                <tr>
                  <td class="mono">{{ e.row }}</td>
                  <td class="mono">{{ e.field }}</td>
                  <td>{{ e.message }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `,
  styles: [`
    select, input[type=file] { padding:0.4rem 0.6rem; border:1px solid #d1d5db; border-radius:6px; font-size:0.9rem; background:#fff; }
    .csv-example { background:#f3f4f6; padding:0.6rem; font-size:0.8rem; border-radius:6px; overflow:auto; }
    .result-summary { display:flex; gap:2rem; padding:0.6rem 0; }
    .stat { text-align:center; }
    .stat-num { font-size:2rem; font-weight:700; }
    .stat-label { font-size:0.8rem; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; }
    .stat.ok .stat-num { color:#059669; }
    .stat.err .stat-num { color:#dc2626; }
    .stat.err.zero .stat-num { color:#6b7280; }
    .mono { font-family: ui-monospace, monospace; font-size:0.85rem; }
    .small { font-size:0.85rem; }
  `]
})
export class CsvImportComponent {
  private readonly api = inject(ImportsApi);
  private readonly notify = inject(NotificationService);

  protected readonly specs: ImportSpec[] = [
    {
      key: 'products',
      label: 'Products',
      requiredColumns: ['SKU', 'Name', 'Category', 'Unit', 'SalePrice'],
      optionalColumns: ['Brand', 'CostPrice', 'Barcode', 'Description'],
      example:
        'SKU,Name,Category,Unit,Brand,SalePrice,CostPrice,Barcode,Description\n' +
        'BUR-002,Cheese Burger,Burgers,PCS,House,850,420,BARCODE-001,Quarter pound with cheddar\n' +
        'PIZ-001,Margherita,Pizza,PCS,,1200,650,,Classic tomato and mozzarella'
    },
    {
      key: 'customers',
      label: 'Customers',
      requiredColumns: ['FullName'],
      optionalColumns: ['Phone', 'Email', 'CustomerGroup', 'OpeningBalance', 'Notes'],
      example:
        'FullName,Phone,Email,CustomerGroup,OpeningBalance,Notes\n' +
        'Ahmed Khan,+923001234567,ahmed@example.com,Regular,0,Walk-in regular\n' +
        'Sara Iqbal,+923331122334,sara@example.com,VIP,500,'
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      requiredColumns: ['FullName', 'SupplierBusinessName'],
      optionalColumns: ['Phone', 'Email', 'TaxNumber', 'OpeningBalance', 'Notes'],
      example:
        'FullName,SupplierBusinessName,Phone,Email,TaxNumber,OpeningBalance,Notes\n' +
        'Imran Sheikh,Sheikh Foods Pvt Ltd,+92-21-3456789,supply@sheikh.com,NTN-1234,0,Primary meat supplier\n' +
        'Asma Trading,Asma Trading Co,,,NTN-5678,1500,'
    }
  ];

  protected readonly active = signal<ImportSpec>(this.specs[0]);
  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly result = signal<ImportResultDto | null>(null);

  select(key: string): void {
    const spec = this.specs.find(s => s.key === key);
    if (spec) {
      this.active.set(spec);
      this.result.set(null);
    }
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.result.set(null);
  }

  upload(): void {
    const f = this.file();
    if (!f) return;
    this.busy.set(true);
    const obs =
      this.active().key === 'products' ? this.api.importProducts(f) :
      this.active().key === 'customers' ? this.api.importCustomers(f) :
      this.api.importSuppliers(f);

    obs.subscribe({
      next: r => {
        this.busy.set(false);
        this.result.set(r);
        if (r.skippedRows === 0)
          this.notify.success(`Imported ${r.importedRows} rows.`);
        else
          this.notify.error(`${r.importedRows} imported, ${r.skippedRows} skipped — see errors below.`);
      },
      error: err => {
        this.busy.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }
}
