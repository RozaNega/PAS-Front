import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { ApiService } from '../../../../core/services/api.service';
import { InventoryService, ShelfLocationDto } from '../../../../core/services/inventory.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

type WizardStep = 1 | 2 | 3;

interface NewRequestForm {
  srNumber: string;
  requester: string;
  department: string;
  requiredBy: string;
  remarks: string;
  justification: string;
  priority: string;
  items: any[];
}

interface RequestItem {
  name: string;
  sku: string;
  quantity: number;
  itemId: string;
  srDetailId: string;
  requestedQty: number;
  preferredShelfId: string;
  notes: string;
}

interface AvailableItem {
  id: string;
  name: string;
  sku: string;
  available?: number;
  uom?: string;
}

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class CreateRequestComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly pasApi = inject(PasApiService);
  private readonly apiService = inject(ApiService);
  private readonly inventoryService = inject(InventoryService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly cdr = inject(ChangeDetectorRef);
  private autoSaveInterval: any;

  currentStep: WizardStep = 1;
  
  form: NewRequestForm = {
    srNumber: '',
    requester: '',
    department: 'IT Department',
    requiredBy: '',
    remarks: '',
    justification: '',
    priority: 'Medium',
    items: [],
  };

  availableItems: AvailableItem[] = [];
  availableShelves: ShelfLocationDto[] = [];
  isLoadingItems = false;
  isLoadingShelves = false;

  searchQuery = '';
  selectedItems: RequestItem[] = [];
  draftSaved = false;

  get filteredItems() {
    if (!this.searchQuery) return this.availableItems;
    return this.availableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  get totalItems(): number {
    return this.selectedItems.length;
  }

  get totalQuantity(): number {
    return this.selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  ngOnInit(): void {
    console.log('CreateRequestComponent initialized');
    
    // Fetch available items and shelves from API
    this.loadAvailableItems();
    this.loadAvailableShelves();
    
    // Only access localStorage in browser environment
    if (typeof localStorage !== 'undefined') {
      // Restore draft from localStorage if it exists
      const savedDraft = localStorage.getItem('serviceRequestDraft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          this.form = draft.form;
          this.selectedItems = draft.selectedItems;
          this.currentStep = draft.currentStep;
          console.log('Draft restored from localStorage:', draft);
        } catch (error) {
          console.error('Error restoring draft:', error);
        }
      }
      
      // Auto-save draft every 30 seconds
      this.autoSaveInterval = setInterval(() => {
        this.autoSaveDraft();
      }, 30000);
    }
    
    this.cdr.markForCheck();
  }

  private loadAvailableItems(): void {
    this.isLoadingItems = true;
    this.apiService.get<any>('ItemMasters').subscribe({
      next: (response) => {
        console.log('Items loaded from API:', response);
        
        // Handle paginated response
        if (response.data && response.data.items) {
          this.availableItems = response.data.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            available: item.quantity || 0,
            uom: item.uom || 'PCS'
          }));
        } else if (Array.isArray(response.data)) {
          this.availableItems = response.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            available: item.quantity || 0,
            uom: item.uom || 'PCS'
          }));
        }
        
        console.log('Available items:', this.availableItems);
        this.isLoadingItems = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading items:', err);
        this.isLoadingItems = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadAvailableShelves(): void {
    this.isLoadingShelves = true;
    this.inventoryService.getAllShelves().subscribe({
      next: (response) => {
        console.log('Shelves loaded from API:', response);
        
        if (response.data) {
          this.availableShelves = Array.isArray(response.data) ? response.data : [response.data];
        }
        
        console.log('Available shelves:', this.availableShelves);
        this.isLoadingShelves = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading shelves:', err);
        this.isLoadingShelves = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  private autoSaveDraft(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const draft = {
      form: this.form,
      selectedItems: this.selectedItems,
      currentStep: this.currentStep,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('serviceRequestDraft', JSON.stringify(draft));
    console.log('Draft auto-saved at', new Date().toLocaleTimeString());
  }

  nextStep(): void {
    // Validate current step before moving to next
    if (this.currentStep === 1) {
      if (!this.form.srNumber || !this.form.requester || !this.form.requiredBy || !this.form.remarks) {
        alert('Please fill in all required fields');
        return;
      }
    }
    
    if (this.currentStep === 2) {
      if (this.selectedItems.length === 0) {
        alert('Please select at least one item');
        return;
      }
    }

    if (this.currentStep < 3) {
      this.currentStep++;
      this.autoSaveDraft();
      this.cdr.markForCheck();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.autoSaveDraft();
      this.cdr.markForCheck();
    }
  }

  addItem(item: any): void {
    const existingItem = this.selectedItems.find((i) => i.sku === item.sku);
    
    // Use the first available shelf, or empty string if none available
    const defaultShelfId = this.availableShelves.length > 0 ? this.availableShelves[0].id : '';
    
    if (existingItem) {
      existingItem.quantity++;
      existingItem.requestedQty = existingItem.quantity;
    } else {
      this.selectedItems.push({ 
        name: item.name, 
        sku: item.sku, 
        quantity: 1,
        itemId: item.id, // Use the actual item ID from API
        srDetailId: '', // Leave empty - will be generated by backend
        requestedQty: 1,
        preferredShelfId: defaultShelfId, // Use the first available shelf
        notes: ''
      });
    }
    this.autoSaveDraft();
    this.cdr.markForCheck();
  }

  removeItem(sku: string): void {
    this.selectedItems = this.selectedItems.filter((item) => item.sku !== sku);
    this.autoSaveDraft();
    this.cdr.markForCheck();
  }

  updateItemQuantity(sku: string, quantity: number): void {
    const item = this.selectedItems.find((i) => i.sku === sku);
    if (item) {
      item.quantity = Math.max(1, quantity);
      item.requestedQty = item.quantity;
    }
    this.autoSaveDraft();
    this.cdr.markForCheck();
  }

  saveDraft(): void {
    if (typeof localStorage === 'undefined') {
      alert('Draft saving is not available in this environment');
      return;
    }

    // Save draft to local storage or backend
    const draft = {
      form: this.form,
      selectedItems: this.selectedItems,
      currentStep: this.currentStep,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('serviceRequestDraft', JSON.stringify(draft));
    this.draftSaved = true;
    this.cdr.markForCheck();
    alert('Draft saved successfully!');
    
    // Reset the flag after 3 seconds
    setTimeout(() => {
      this.draftSaved = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  submit(): void {
    if (this.currentStep !== 3) {
      alert('Please complete all steps before submitting');
      return;
    }

    if (!this.form.srNumber || !this.form.requester || !this.selectedItems.length) {
      alert('Please fill in all required information');
      return;
    }

    // Validate that all items have required fields
    const invalidItems = this.selectedItems.filter(item => !item.itemId || !item.preferredShelfId);
    if (invalidItems.length > 0) {
      alert('Please fill in Item ID and Shelf ID for all selected items');
      return;
    }

    // Build the API payload according to ApiServiceRequest interface
    const apiPayload = {
      items: this.selectedItems.map(item => ({
        itemId: item.itemId,
        srDetailId: item.srDetailId || '', // Use empty string instead of null
        requestedQty: item.requestedQty,
        preferredShelfId: item.preferredShelfId,
        notes: item.notes
      })),
      remarks: this.form.remarks || this.form.justification
    };

    console.log('=== SERVICE REQUEST SUBMISSION ===');
    console.log('Submitting request payload:', JSON.stringify(apiPayload, null, 2));
    console.log('Form data:', {
      srNumber: this.form.srNumber,
      requester: this.form.requester,
      department: this.form.department,
      requiredBy: this.form.requiredBy,
      priority: this.form.priority
    });
    console.log('Endpoint: /api/ServiceRequests');
    console.log('Items count:', this.selectedItems.length);
    console.log('Items details:', this.selectedItems.map(item => ({
      name: item.name,
      sku: item.sku,
      itemId: item.itemId,
      srDetailId: item.srDetailId,
      requestedQty: item.requestedQty,
      preferredShelfId: item.preferredShelfId,
      notes: item.notes
    })));
    console.log('====================================');
    
    this.pasApi.createServiceRequest(apiPayload).subscribe({
      next: (response) => {
        console.log('✅ Request saved successfully:', response);
        
        // Submit to workflow service for manager approval
        const userId = this.currentUserService.getUserId() || 'emp_001';
        const userName = this.form.requester || 'Employee';
        const userEmail = this.currentUserService.getCurrentUserValue()?.email || 'employee@africom.com';
        
        const created = this.extractCreatedRequestMeta(response);
        this.workflowService.submitRequest({
          employeeId: userId,
          employeeName: userName,
          employeeEmail: userEmail,
          department: this.form.department,
          managerId: this.workflowService.getAssignedManagerQueueId(),
          items: this.selectedItems.map(item => ({
            id: item.itemId,
            name: item.name,
            description: item.notes || 'No description provided',
            quantity: item.quantity,
            category: 'General' // Default category
          })),
          priority: this.form.priority as any,
          status: 'Submitted',
          justification: this.form.justification || this.form.remarks,
          requiredDate: this.form.requiredBy ? new Date(this.form.requiredBy) : new Date(),
        }, {
          id: created.id,
          srNumber: created.srNumber || this.form.srNumber,
        });

        alert('Service request created and submitted for approval!');
        
        // Clear draft
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('serviceRequestDraft');
        }
        
        // Navigate back to dashboard
        this.router.navigate(['/employee/dashboard']);
      },
      error: (err) => {
        console.error('❌ Error saving request:', err);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        console.error('Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
          headers: err.headers,
          url: err.url
        });
        
        // Log the full error response
        if (err.error) {
          console.error('Server response body:', err.error);
          console.error('Server response type:', typeof err.error);
          if (typeof err.error === 'string') {
            console.error('Server response (string):', err.error);
          } else if (typeof err.error === 'object') {
            console.error('Server response (object):', JSON.stringify(err.error, null, 2));
          }
        }
        
        // Provide more specific error messages
        let errorMessage = 'Failed to save request to database. Please try again.';
        if (err.status === 0) {
          errorMessage = 'Network error: Unable to connect to server. Please check your connection.';
        } else if (err.status === 401) {
          errorMessage = 'Unauthorized: Your session may have expired. Please login again.';
        } else if (err.status === 403) {
          errorMessage = 'Forbidden: You do not have permission to create service requests.';
        } else if (err.status === 400) {
          errorMessage = `Bad request: ${err.error?.message || 'Invalid data format'}`;
        } else if (err.status === 404) {
          errorMessage = 'Service endpoint not found. Please contact support.';
        } else if (err.status === 500) {
          const serverMessage = err.error?.message || err.error?.detail || 'Unknown server error';
          errorMessage = `Server error: ${serverMessage}`;
        }
        
        console.error('Final error message:', errorMessage);
        alert(errorMessage);
      }
    });
  }

  cancel(): void {
    const confirmCancel = confirm('Are you sure you want to cancel? Any unsaved changes will be lost.');
    if (confirmCancel) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('serviceRequestDraft');
      }
      this.router.navigate(['/employee/dashboard']);
    }
  }

  private extractCreatedRequestMeta(response: unknown): { id?: string; srNumber?: string } {
    if (!response || typeof response !== 'object') {
      return {};
    }
    const root = response as Record<string, unknown>;
    const data = root['data'] ?? root['Data'];
    if (typeof data === 'string' && data.trim()) {
      return { id: data.trim(), srNumber: this.form.srNumber };
    }
    if (data && typeof data === 'object') {
      const row = data as Record<string, unknown>;
      const id = row['id'] ?? row['Id'];
      const srNumber = row['srNumber'] ?? row['SrNumber'] ?? this.form.srNumber;
      return {
        id: id != null ? String(id) : undefined,
        srNumber: srNumber != null ? String(srNumber) : undefined,
      };
    }
    const id = root['id'] ?? root['Id'];
    return {
      id: id != null ? String(id) : undefined,
      srNumber: this.form.srNumber,
    };
  }
}
