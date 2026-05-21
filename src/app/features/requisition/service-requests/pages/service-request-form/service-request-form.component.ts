import { Component, OnInit, signal, inject } from '@angular/core';
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
  
  // Forms
  requestForm!: FormGroup;
  
  // Data
  availableItems = signal<any[]>([]);
  selectedItems = signal<ServiceRequestItem[]>([]);

  departments = [
    'Information Technology (IT)',
    'Human Resources (HR)',
    'Finance',
    'Operations',
    'Warehouse',
    'Sales',
    'Marketing',
    'Procurement'
  ];

  urgencyLevels = [
    { value: 'low', label: 'Low', class: 'badge-secondary' },
    { value: 'normal', label: 'Normal', class: 'badge-success' },
    { value: 'high', label: 'High', class: 'badge-warning' },
    { value: 'urgent', label: 'Urgent', class: 'badge-warning' },
    { value: 'critical', label: 'Critical', class: 'badge-danger' }
  ];

  ngOnInit(): void {
    this.initializeForms();
    this.loadAvailableItems();
    this.loadDraftData();
  }

  private initializeForms(): void {
    this.requestForm = this.fb.group({
      department: ['', Validators.required],
      purpose: ['', Validators.required],
      urgency: ['normal', Validators.required],
      notes: ['']
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
        if (rows.length === 0) {
          this.error.set(
            'No catalog items with valid IDs were returned. Ensure ItemMasters exist in the database and try again.',
          );
        }
        this.loading.set(false);
      },
      error: () => {
        this.availableItems.set([]);
        this.error.set('Failed to load items from ItemMasters. Check your connection and API configuration.');
        this.loading.set(false);
      },
    });
  }

  // Step Navigation
  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep.update(step => step + 1);
        this.saveDraftData();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep()) {
      case 1:
        if (!this.requestForm.valid) {
          alert('Please fill in all required fields (Department, Purpose)');
          return false;
        }
        return true;
      case 2:
        if (this.selectedItems().length === 0) {
          alert('Please add at least one item to the request');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  // Item Management
  addItem(item: any): void {
    const existingItem = this.selectedItems().find(si => si.itemId === item.id);
    
    if (existingItem) {
      alert('Item already added to the request');
      return;
    }

    const newItem: ServiceRequestItem = {
      id: this.generateTempId(),
      itemId: item.id,
      itemName: item.itemName,
      sku: item.sku,
      unitOfMeasure: item.unitOfMeasure,
      requestedQty: 1,
      availableStock: item.stockQuantity,
      shelfId: undefined,
      shelfLocation: undefined
    };

    this.selectedItems.update(items => [...items, newItem]);
    console.log('Item added:', newItem);
  }

  removeItem(itemId: string): void {
    this.selectedItems.update(items => items.filter(item => item.id !== itemId));
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    this.selectedItems.update(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, requestedQty: quantity }
          : item
      )
    );
  }

  private generateTempId(): string {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
  }

  // Draft Management
  saveDraft(): void {
    const draftData = {
      formData: this.requestForm.value,
      selectedItems: this.selectedItems(),
      currentStep: this.currentStep()
    };
    
    localStorage.setItem('serviceRequestDraft', JSON.stringify(draftData));
    alert('Draft saved successfully!');
  }

  loadDraft(): void {
    const draft = localStorage.getItem('serviceRequestDraft');
    if (draft) {
      const draftData = JSON.parse(draft);
      this.requestForm.patchValue(draftData.formData);
      this.selectedItems.set(draftData.selectedItems || []);
      this.currentStep.set(draftData.currentStep || 1);
      alert('Draft loaded successfully!');
    } else {
      alert('No draft found');
    }
  }

  private loadDraftData(): void {
    const draft = localStorage.getItem('serviceRequestDraft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        this.requestForm.patchValue(draftData.formData);
        this.selectedItems.set(draftData.selectedItems || []);
        this.currentStep.set(draftData.currentStep || 1);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }

  private saveDraftData(): void {
    const draftData = {
      formData: this.requestForm.value,
      selectedItems: this.selectedItems(),
      currentStep: this.currentStep()
    };
    
    localStorage.setItem('serviceRequestDraft', JSON.stringify(draftData));
  }

  clearDraft(): void {
    if (confirm('Are you sure you want to clear the draft? All unsaved data will be lost.')) {
      localStorage.removeItem('serviceRequestDraft');
      this.requestForm.reset();
      this.selectedItems.set([]);
      this.currentStep.set(1);
      this.requestForm.patchValue({ urgency: 'normal' });
      alert('Draft cleared successfully!');
    }
  }

  // Form Submission
  submitRequest(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.selectedItems().length === 0) {
      alert('Please add at least one item to the request.');
      return;
    }

    if (!this.requestForm.valid) {
      alert('Please fill in all required fields.');
      return;
    }

    const invalid = this.selectedItems().filter((i) => !this.isGuid(i.itemId));
    if (invalid.length > 0) {
      alert(
        'One or more lines use invalid item IDs (not from the catalog). Remove those lines and re-add items from the list.',
      );
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
          alert('Service Request created successfully!');
          
          // Clear draft
          localStorage.removeItem('serviceRequestDraft');
          
          // Navigate back to list
          this.router.navigate(['/admin/requisitions']);
        } else {
          this.error.set(response.message || 'Failed to create service request');
          alert(this.error());
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);

        // Handle validation errors with detailed parsing
        let errorMessage = 'Failed to create service request. Please try again.';
        const httpErr = err as {
          status?: number;
          statusText?: string;
          error?: {
            errors?: Record<string, string | string[]>;
            message?: string;
            title?: string;
          };
        };

        if (httpErr.error) {
          // .NET Core validation errors format
          if (httpErr.error.errors && typeof httpErr.error.errors === 'object') {
            const validationErrors = httpErr.error.errors;
            const errorDetails = Object.keys(validationErrors).map((key) => {
              const messages = Array.isArray(validationErrors[key])
                ? validationErrors[key].join(', ')
                : validationErrors[key];
              return `• ${key}: ${messages}`;
            });
            errorMessage = 'Validation errors:\n' + errorDetails.join('\n');
          }
          // Single error message
          else if (httpErr.error.message) {
            errorMessage = httpErr.error.message;
          }
          // Title field (common in .NET validation responses)
          else if (httpErr.error.title) {
            errorMessage = httpErr.error.title;
            if (httpErr.error.errors) {
              errorMessage += '\n\nDetails:\n' + JSON.stringify(httpErr.error.errors, null, 2);
            }
          }
          // Generic error object
          else if (typeof httpErr.error === 'string') {
            errorMessage = httpErr.error;
          }
        }

        // Add HTTP status info
        if (httpErr.status) {
          errorMessage = `[${httpErr.status} ${httpErr.statusText}]\n${errorMessage}`;
        }

        console.error('Service request creation failed', err);

        this.error.set(errorMessage);
        alert(this.error());
      },
    });
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
      this.router.navigate(['/admin/requisitions']);
    }
  }

  // Computed Properties
  get totalQuantity(): number {
    return this.selectedItems().reduce((sum, item) => sum + item.requestedQty, 0);
  }

  get totalItems(): number {
    return this.selectedItems().length;
  }

  getUrgencyClass(urgency: string): string {
    const level = this.urgencyLevels.find(u => u.value === urgency);
    return level?.class || 'badge-secondary';
  }

  getUrgencyLabel(urgency: string): string {
    const level = this.urgencyLevels.find(u => u.value === urgency);
    return level?.label || urgency;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
