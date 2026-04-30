import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PasApiService, PasModuleKind } from '../../../shared/services/pas-api.service';

@Component({
  selector: 'app-pas-module-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl font-semibold text-slate-800">{{ title }}</h2>
        <div class="flex items-center gap-2">
          <input
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilter()"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            placeholder="Search..."
          />
          <button class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white" (click)="openCreate()">
            Add New
          </button>
        </div>
      </div>
      <p class="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{{ dtoHint }}</p>
      <div class="overflow-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th class="px-3 py-2">Name</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Updated</th><th class="px-3 py-2">Actions</th></tr>
          </thead>
          <tbody>
            @for (row of filteredRows(); track row.id) {
              <tr class="border-t border-slate-100">
                <td class="px-3 py-2">{{ row.name }}</td>
                <td class="px-3 py-2"><span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{{ row.status }}</span></td>
                <td class="px-3 py-2">{{ row.updatedAt }}</td>
                <td class="px-3 py-2">
                  <div class="flex gap-2">
                    <button class="rounded border border-slate-300 px-2 py-1 text-xs" (click)="openEdit(row)">Edit</button>
                    @if (kind !== 'payments') {
                      <button class="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700" (click)="remove(row.id)">Delete</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (editorOpen()) {
      <section class="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
        <article class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
          <h3 class="text-lg font-semibold text-slate-800">{{ editingId() ? 'Edit' : 'Create' }} {{ title }}</h3>
          <div class="mt-3 grid gap-2">
            <input [(ngModel)]="draftName" class="rounded-lg border border-slate-300 px-3 py-2" placeholder="Name" />
            <select [(ngModel)]="draftStatus" class="rounded-lg border border-slate-300 px-3 py-2">
              <option>Active</option>
              <option>Pending</option>
              <option>Closed</option>
            </select>
            <textarea [(ngModel)]="draftRemarks" class="min-h-20 rounded-lg border border-slate-300 px-3 py-2" placeholder="Remarks / notes"></textarea>
            <input [(ngModel)]="draftGuidA" class="rounded-lg border border-slate-300 px-3 py-2" [placeholder]="guidAPlaceholder" />
            <input [(ngModel)]="draftGuidB" class="rounded-lg border border-slate-300 px-3 py-2" [placeholder]="guidBPlaceholder" />
            <input [(ngModel)]="draftNumberA" type="number" class="rounded-lg border border-slate-300 px-3 py-2" [placeholder]="numberAPlaceholder" />
            <input [(ngModel)]="draftNumberB" type="number" class="rounded-lg border border-slate-300 px-3 py-2" [placeholder]="numberBPlaceholder" />
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded border border-slate-300 px-3 py-1.5 text-sm" (click)="closeEditor()">Cancel</button>
            <button class="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white" (click)="save()">Save</button>
          </div>
        </article>
      </section>
    }
  `,
})
export class PasModulePageComponent implements OnInit {
  private readonly api = inject(PasApiService);
  private readonly route = inject(ActivatedRoute);
  protected title = 'Module';
  protected kind: PasModuleKind = 'properties';
  protected searchTerm = '';

  protected readonly rows = signal<{ id: string; name: string; status: string; updatedAt: string }[]>([]);
  protected readonly filteredRows = signal<{ id: string; name: string; status: string; updatedAt: string }[]>([]);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected draftName = '';
  protected draftStatus = 'Active';
  protected draftRemarks = '';
  protected draftGuidA = '';
  protected draftGuidB = '';
  protected draftNumberA = 1;
  protected draftNumberB = 0;
  protected dtoHint = '';
  protected guidAPlaceholder = 'GUID field A';
  protected guidBPlaceholder = 'GUID field B';
  protected numberAPlaceholder = 'Number field A';
  protected numberBPlaceholder = 'Number field B';

  ngOnInit(): void {
    this.title = this.route.snapshot.data['title'] ?? this.title;
    this.kind = this.route.snapshot.data['kind'] ?? this.kind;
    this.setupKindHints();
    this.api.list(this.kind).subscribe({
      next: (response) => {
        this.rows.set(this.toRows(response.items ?? []));
        this.applyFilter();
      },
      error: () => {
        this.rows.set([]);
        this.applyFilter();
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.draftName = '';
    this.draftStatus = 'Active';
    this.draftRemarks = '';
    this.editorOpen.set(true);
  }

  protected openEdit(row: { id: string; name: string; status: string }): void {
    this.editingId.set(row.id);
    this.draftName = row.name;
    this.draftStatus = row.status;
    this.draftRemarks = '';
    this.editorOpen.set(true);
  }

  protected closeEditor(): void {
    this.editorOpen.set(false);
  }

  protected save(): void {
    if (!this.draftName.trim()) return;

    const now = new Date().toLocaleDateString();
    const id = this.editingId();
    const payload = this.toPayload(id);
    if (id) {
      this.api
        .update(this.kind, id, payload)
        .subscribe({ error: () => undefined });
      this.rows.update((items) =>
        items.map((item) =>
          item.id === id ? { ...item, name: this.draftName.trim(), status: this.draftStatus, updatedAt: now } : item,
        ),
      );
    } else {
      const newId = crypto.randomUUID();
      this.api
        .create(this.kind, payload)
        .subscribe({ error: () => undefined });
      this.rows.update((items) => [
        { id: newId, name: this.draftName.trim(), status: this.draftStatus, updatedAt: now },
        ...items,
      ]);
    }
    this.closeEditor();
    this.applyFilter();
  }

  protected remove(id: string): void {
    this.api.remove(this.kind, id).subscribe({ error: () => undefined });
    this.rows.update((items) => items.filter((item) => item.id !== id));
    this.applyFilter();
  }

  protected applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredRows.set(this.rows());
      return;
    }

    this.filteredRows.set(this.rows().filter((row) => row.name.toLowerCase().includes(term)));
  }

  private toRows(items: Record<string, unknown>[]): { id: string; name: string; status: string; updatedAt: string }[] {
    return items.map((item, index) => {
      const id = String(item['id'] ?? item['Id'] ?? crypto.randomUUID());
      const name =
        String(
          item['name'] ??
            item['Name'] ??
            item['username'] ??
            item['Username'] ??
            item['fullName'] ??
            item['itemName'] ??
            `${this.title} ${index + 1}`,
        );
      const status = String(item['status'] ?? item['Status'] ?? item['isActive'] ?? 'Active');
      const updatedAt = String(
        item['updatedAt'] ??
          item['lastUpdated'] ??
          item['purchaseDate'] ??
          item['requestDate'] ??
          new Date().toLocaleDateString(),
      );
      return { id, name, status, updatedAt };
    });
  }

  private setupKindHints(): void {
    if (this.kind === 'properties') {
      this.dtoHint = 'CreatePropertyCommand: tagNumber, name, serialNumber, propertyTypeId, locationId, unitPrice, quantity, purchaseDate';
      this.guidAPlaceholder = 'PropertyTypeId (GUID)';
      this.guidBPlaceholder = 'LocationId (GUID)';
      this.numberAPlaceholder = 'Quantity';
      this.numberBPlaceholder = 'UnitPrice';
      return;
    }
    if (this.kind === 'users') {
      this.dtoHint = 'RegisterUserCommand: username, password, email, fullName, department, roleName';
      this.guidAPlaceholder = 'RoleId (GUID for update only)';
      this.guidBPlaceholder = 'Optional GUID';
      this.numberAPlaceholder = '1 = Active, 0 = Inactive';
      this.numberBPlaceholder = 'Optional number';
      return;
    }
    if (this.kind === 'leases' || this.kind === 'maintenance') {
      this.dtoHint = 'CreateServiceRequestCommand: items[{itemId,requestedQty,preferredShelfId,notes}], remarks';
      this.guidAPlaceholder = 'ItemId (GUID)';
      this.guidBPlaceholder = 'PreferredShelfId (GUID optional)';
      this.numberAPlaceholder = 'RequestedQty';
      this.numberBPlaceholder = 'Optional number';
      return;
    }
    this.dtoHint = 'AdjustStockCommand: inventoryId, newQuantity, reason, remarks';
    this.guidAPlaceholder = 'InventoryId (GUID)';
    this.guidBPlaceholder = 'Optional GUID';
    this.numberAPlaceholder = 'NewQuantity';
    this.numberBPlaceholder = 'Optional number';
  }

  private toPayload(id: string | null): Record<string, unknown> {
    if (this.kind === 'properties') {
      return {
        ...(id ? { id } : {}),
        tagNumber: this.draftName.trim().slice(0, 24),
        name: this.draftName.trim(),
        serialNumber: this.draftName.trim().slice(0, 24),
        propertyTypeId: this.draftGuidA,
        locationId: this.draftGuidB,
        unitPrice: this.draftNumberB,
        quantity: this.draftNumberA,
        purchaseDate: new Date().toISOString(),
      };
    }
    if (this.kind === 'users') {
      if (id) {
        return {
          id,
          username: this.draftName.trim(),
          email: `${this.draftName.trim().replace(/\s+/g, '.').toLowerCase()}@pas.local`,
          roleId: this.draftGuidA,
          isActive: this.draftNumberA > 0,
        };
      }
      return {
        username: this.draftName.trim().replace(/\s+/g, '.').toLowerCase(),
        password: 'Password@123',
        email: `${this.draftName.trim().replace(/\s+/g, '.').toLowerCase()}@pas.local`,
        fullName: this.draftName.trim(),
        department: this.draftRemarks || 'Operations',
        roleName: this.draftStatus,
      };
    }
    if (this.kind === 'leases' || this.kind === 'maintenance') {
      return {
        ...(id ? { id } : {}),
        remarks: this.draftRemarks || this.draftStatus,
        items: [
          {
            itemId: this.draftGuidA,
            requestedQty: this.draftNumberA,
            preferredShelfId: this.draftGuidB || null,
            notes: this.draftRemarks || this.draftName,
          },
        ],
      };
    }
    return {
      inventoryId: this.draftGuidA || id,
      newQuantity: this.draftNumberA,
      reason: this.draftStatus,
      remarks: this.draftRemarks || this.draftName,
    };
  }
}
