import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServiceRequestService, CreateServiceRequestRequest, CreateServiceRequestItemRequest } from '../../services/service-request.service';
import { ApiService } from '../../../../../core/services/api.service';
import { normalizePasListResponse } from '../../../../../core/utils/pas-api-json.util';

interface ServiceRequestItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitOfMeasure: string;
  requestedQty: number;
  availableStock: number;
  shelfId?: string;
  shelfLocation?: string;
}

interface DraftData {
  formData: Record<string, unknown>;
  selectedItems: ServiceRequestItem[];
  currentStep: number;
}

const MOCK_CATALOG_ITEMS = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', itemName: 'Teff (White)', sku: 'TEFF-WHT-001', unitOfMeasure: 'kg', stockQuantity: 500, description: 'Premium quality white teff grain' },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', itemName: 'Coffee Arabica', sku: 'COF-ARB-002', unitOfMeasure: 'kg', stockQuantity: 200, description: 'Ethiopian Arabica coffee beans' },
  { id: 'a1b2c3d4-0003-4000-8000-000000000003', itemName: 'Maize (Yellow)', sku: 'MAZ-YEL-003', unitOfMeasure: 'kg', stockQuantity: 800, description: 'Yellow maize grain for processing' },
  { id: 'a1b2c3d4-0004-4000-8000-000000000004', itemName: 'Sesame Seeds', sku: 'SES-SED-004', unitOfMeasure: 'kg', stockQuantity: 350, description: 'Ethiopian white sesame seeds' },
  { id: 'a1b2c3d4-0005-4000-8000-000000000005', itemName: 'Wheat (Hard Red)', sku: 'WHT-HRD-005', unitOfMeasure: 'kg', stockQuantity: 600, description: 'Hard red winter wheat' },
  { id: 'a1b2c3d4-0006-4000-8000-000000000006', itemName: 'Barley (Food Grade)', sku: 'BAR-FOD-006', unitOfMeasure: 'kg', stockQuantity: 400, description: 'Food grade barley for human consumption' },
  { id: 'a1b2c3d4-0007-4000-8000-000000000007', itemName: 'Honey (White)', sku: 'HON-WHT-007', unitOfMeasure: 'kg', stockQuantity: 120, description: 'Pure Ethiopian white honey' },
  { id: 'a1b2c3d4-0008-4000-8000-000000000008', itemName: 'Cotton (Raw)', sku: 'COT-RAW-008', unitOfMeasure: 'kg', stockQuantity: 900, description: 'Raw cotton fiber for textile industry' },
  { id: 'a1b2c3d4-0009-4000-8000-000000000009', itemName: 'Sugar Cane', sku: 'SGR-CAN-009', unitOfMeasure: 'ton', stockQuantity: 50, description: 'Fresh sugar cane for processing' },
  { id: 'a1b2c3d4-0010-4000-8000-000000000010', itemName: 'Haricot Beans', sku: 'HRC-BNS-010', unitOfMeasure: 'kg', stockQuantity: 280, description: 'Dried haricot beans for export' },
  { id: 'a1b2c3d4-0011-4000-8000-000000000011', itemName: 'Sunflower Oil', sku: 'SUN-OIL-011', unitOfMeasure: 'liter', stockQuantity: 150, description: 'Refined sunflower cooking oil' },
  { id: 'a1b2c3d4-0012-4000-8000-000000000012', itemName: 'Salt (Iodized)', sku: 'SLT-IOD-012', unitOfMeasure: 'kg', stockQuantity: 1000, description: 'Iodized table salt' },
  { id: 'a1b2c3d4-0013-4000-8000-000000000013', itemName: 'Black Pepper', sku: 'BLK-PPR-013', unitOfMeasure: 'kg', stockQuantity: 75, description: 'Ground black pepper spice' },
  { id: 'a1b2c3d4-0014-4000-8000-000000000014', itemName: 'Sorghum (Red)', sku: 'SRG-RED-014', unitOfMeasure: 'kg', stockQuantity: 450, description: 'Red sorghum grain' },
  { id: 'a1b2c3d4-0015-4000-8000-000000000015', itemName: 'Fertilizer (UREA 46%)', sku: 'FRT-URE-015', unitOfMeasure: 'bag', stockQuantity: 200, description: 'UREA nitrogen fertilizer 46%' },
];

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './service-request-form.component.html',
  styleUrls: ['./service-request-form.component.scss']
})
export class ServiceRequestFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  currentStep = signal(1);
  totalSteps = 3;
  loading = signal(false);
  error = signal<string | null>(null);
  isUsingMock = signal(false);

  requestForm!: FormGroup;

  availableItems = signal<any[]>([]);
  availableItemsCount = signal(0);
  selectedItems = signal<ServiceRequestItem[]>([]);

  notification = signal<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  showClearConfirm = signal(false);
  showCancelConfirm = signal(false);
  showSuccessModal = signal(false);

  itemSearch = signal('');

  departments = [
    'Information Technology (IT)',
    'Human Resources (HR)',
    'Finance',
    'Operations',
    'Warehouse',
    'Sales',
    'Marketing',
    'Procurement',
  ];

  urgencyLevels = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'critical', label: 'Critical' },
  ];

  filteredItems = computed(() => {
    const q = this.itemSearch().toLowerCase();
    if (!q) return this.availableItems();
    return this.availableItems().filter((item: any) =>
      item.itemName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  });

  totalQuantity = computed(() =>
    this.selectedItems().reduce((sum, item) => sum + item.requestedQty, 0)
  );

  totalItemsCount = computed(() => this.selectedItems().length);

  draftExists = computed(() => localStorage.getItem('serviceRequestDraft') !== null);

  getUrgencyClass(urgency: string): string {
    const map: Record<string, string> = {
      low: 'urgency-low', normal: 'urgency-normal', high: 'urgency-high',
      urgent: 'urgency-urgent', critical: 'urgency-critical',
    };
    return map[urgency] || 'urgency-normal';
  }

  getUrgencyLabel(urgency: string): string {
    const level = this.urgencyLevels.find(u => u.value === urgency);
    return level?.label || urgency;
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadAvailableItems();
    this.loadDraft();
  }

  private initializeForms(): void {
    this.requestForm = this.fb.group({
      department: ['', Validators.required],
      purpose: ['', Validators.required],
      urgency: ['normal', Validators.required],
      notes: [''],
    });
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value?.trim() ?? '');
  }

  private loadAvailableItems(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.get<unknown>('ItemMasters', { pageNumber: 1, pageSize: 500 }).subscribe({
      next: (raw) => {
        const normalized = normalizePasListResponse<Record<string, unknown>>(raw);
        const rows = (normalized.data ?? [])
          .map((r) => ({
            id: String(r['id'] ?? '').trim(),
            itemName: String(r['itemName'] ?? r['name'] ?? r['description'] ?? '').trim() || 'Item',
            sku: String(r['sku'] ?? '').trim(),
            description: r['description'] != null ? String(r['description']) : '',
            unitOfMeasure: String(r['unitOfMeasure'] ?? r['unit'] ?? r['uom'] ?? 'ea').trim(),
            stockQuantity: Number(r['stockQuantity'] ?? r['stockOnHand'] ?? r['quantityOnHand'] ?? 0),
            categoryId: r['categoryId'] != null ? String(r['categoryId']) : '',
            categoryName: r['categoryName'] != null ? String(r['categoryName']) : '',
          }))
          .filter((row) => this.isGuid(row.id));
        this.availableItems.set(rows);
        this.availableItemsCount.set(rows.length);
        if (rows.length === 0) {
          this.useMockFallback();
        }
        this.loading.set(false);
      },
      error: () => {
        this.useMockFallback();
        this.loading.set(false);
      },
    });
  }

  private useMockFallback(): void {
    this.availableItems.set(MOCK_CATALOG_ITEMS);
    this.availableItemsCount.set(MOCK_CATALOG_ITEMS.length);
    this.isUsingMock.set(true);
    this.showNotification('info', 'Using sample catalog data — API items unavailable');
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep.update(s => s + 1);
        this.saveDraftData();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number): void {
    if (step < this.currentStep()) {
      this.currentStep.set(step);
      return;
    }
    for (let s = this.currentStep(); s < step; s++) {
      if (!this.validateStep(s)) return;
    }
    this.currentStep.set(step);
    this.saveDraftData();
  }

  private validateStep(step: number): boolean {
    switch (step) {
      case 1:
        if (!this.requestForm.valid) {
          this.showNotification('error', 'Please fill in all required fields (Department, Purpose)');
          this.requestForm.markAllAsTouched();
          return false;
        }
        return true;
      case 2:
        if (this.selectedItems().length === 0) {
          this.showNotification('error', 'Please add at least one item to the request');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  private validateCurrentStep(): boolean {
    return this.validateStep(this.currentStep());
  }

  addItem(item: any): void {
    const existing = this.selectedItems().find(si => si.itemId === item.id);
    if (existing) {
      this.showNotification('info', 'Item already added to the request');
      return;
    }
    const newItem: ServiceRequestItem = {
      id: 'temp_' + Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      itemName: item.itemName,
      sku: item.sku,
      unitOfMeasure: item.unitOfMeasure,
      requestedQty: 1,
      availableStock: item.stockQuantity,
    };
    this.selectedItems.update(items => [...items, newItem]);
    this.showNotification('success', `${item.itemName} added to request`);
  }

  removeItem(itemId: string): void {
    this.selectedItems.update(items => items.filter(item => item.id !== itemId));
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    const q = Math.max(1, Math.floor(quantity));
    this.selectedItems.update(items =>
      items.map(item =>
        item.id === itemId ? { ...item, requestedQty: q } : item
      )
    );
  }

  onItemSearch(e: Event): void {
    this.itemSearch.set((e.target as HTMLInputElement).value);
  }

  saveDraft(): void {
    const draft: DraftData = {
      formData: this.requestForm.value,
      selectedItems: this.selectedItems(),
      currentStep: this.currentStep(),
    };
    localStorage.setItem('serviceRequestDraft', JSON.stringify(draft));
    this.showNotification('success', 'Draft saved successfully!');
  }

  loadDraft(): void {
    const raw = localStorage.getItem('serviceRequestDraft');
    if (!raw) {
      this.showNotification('info', 'No draft found');
      return;
    }
    try {
      const draft: DraftData = JSON.parse(raw);
      this.requestForm.patchValue(draft.formData);
      this.selectedItems.set(draft.selectedItems || []);
      this.currentStep.set(draft.currentStep || 1);
      this.showNotification('success', 'Draft loaded successfully!');
    } catch {
      this.showNotification('error', 'Failed to load draft data');
    }
  }

  private saveDraftData(): void {
    const draft: DraftData = {
      formData: this.requestForm.value,
      selectedItems: this.selectedItems(),
      currentStep: this.currentStep(),
    };
    localStorage.setItem('serviceRequestDraft', JSON.stringify(draft));
  }

  clearDraft(): void {
    localStorage.removeItem('serviceRequestDraft');
    this.requestForm.reset();
    this.selectedItems.set([]);
    this.currentStep.set(1);
    this.requestForm.patchValue({ urgency: 'normal' });
    this.showClearConfirm.set(false);
    this.showNotification('success', 'Draft cleared successfully!');
  }

  submitRequest(): void {
    if (!this.validateCurrentStep()) return;
    if (this.selectedItems().length === 0) {
      this.showNotification('error', 'Please add at least one item to the request');
      return;
    }
    if (!this.requestForm.valid) {
      this.showNotification('error', 'Please fill in all required fields');
      this.requestForm.markAllAsTouched();
      return;
    }
    const invalid = this.selectedItems().filter(i => !this.isGuid(i.itemId));
    if (invalid.length > 0) {
      this.showNotification('error', 'Some items have invalid IDs. Remove and re-add them from the catalog.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.requestForm.value;
    const createRequest: CreateServiceRequestRequest = {
      department: formValue.department,
      purpose: formValue.purpose,
      urgency: formValue.urgency,
      notes: formValue.notes || '',
      items: this.selectedItems().map((item) => {
        const line: CreateServiceRequestItemRequest = {
          itemId: item.itemId,
          requestedQty: item.requestedQty,
        };
        if (item.shelfId && this.isGuid(item.shelfId)) {
          line.shelfId = item.shelfId;
        }
        return line;
      }),
    };

    this.serviceRequestService.create(createRequest).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          localStorage.removeItem('serviceRequestDraft');
          this.showSuccessModal.set(true);
        } else {
          this.error.set(response.message || 'Failed to create service request');
          this.showNotification('error', this.error()!);
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        let msg = 'Failed to create service request. Please try again.';
        const httpErr = err as { status?: number; statusText?: string; error?: { errors?: Record<string, string | string[]>; message?: string; title?: string } };
        if (httpErr.error?.errors && typeof httpErr.error.errors === 'object') {
          const details = Object.keys(httpErr.error.errors).map(key => {
            const msgs = Array.isArray(httpErr.error!.errors![key]) ? (httpErr.error!.errors![key] as string[]).join(', ') : httpErr.error!.errors![key];
            return `• ${key}: ${msgs}`;
          });
          msg = 'Validation errors:\n' + details.join('\n');
        } else if (httpErr.error?.message) {
          msg = httpErr.error.message;
        } else if (httpErr.error?.title) {
          msg = httpErr.error.title;
        } else if (typeof httpErr.error === 'string') {
          msg = httpErr.error;
        }
        if (httpErr.status) msg = `[${httpErr.status}] ${msg}`;
        this.error.set(msg);
        this.showNotification('error', msg);
      },
    });
  }

  navigateToList(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/admin/requisitions']);
  }

  cancel(): void {
    this.showCancelConfirm.set(true);
  }

  confirmCancel(): void {
    this.showCancelConfirm.set(false);
    this.router.navigate(['/admin/requisitions']);
  }

  private showNotification(type: 'success' | 'error' | 'info', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  formatDate(iso: string): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
