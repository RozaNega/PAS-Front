import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface FormData {
  tagNumber: string;
  propertyName: string;
  serialNumber: string;
  modelNumber: string;
  description: string;
  propertyType: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalValue: number;
  currency: string;
  purchaseDate: string;
  poNumber: string;
  supplier: string;
  location: string;
  safetyBox: string;
  shelf: string;
  warrantyStart: string;
  warrantyEnd: string;
  maintenanceSchedule: string;
  assignedTo: string;
  notes: string;
}

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss']
})
export class PropertyFormComponent {
  private router = inject(Router);

  currentStep = signal(1);
  readonly totalSteps = 4;

  formData = signal<FormData>({
    tagNumber: '',
    propertyName: '',
    serialNumber: '',
    modelNumber: '',
    description: '',
    propertyType: '',
    category: '',
    unitPrice: 0,
    quantity: 1,
    totalValue: 0,
    currency: 'ETB',
    purchaseDate: '',
    poNumber: '',
    supplier: '',
    location: '',
    safetyBox: '',
    shelf: '',
    warrantyStart: '',
    warrantyEnd: '',
    maintenanceSchedule: 'Every 6 months',
    assignedTo: '',
    notes: ''
  });

  propertyTypes = [
    { value: 'electronics', label: 'Electronics', icon: '💻' },
    { value: 'furniture', label: 'Furniture', icon: '🪑' },
    { value: 'vehicles', label: 'Vehicles', icon: '🚗' },
    { value: 'machinery', label: 'Machinery', icon: '⚙️' }
  ];

  categories = [
    { value: 'computers', label: 'Computers' },
    { value: 'printers', label: 'Printers' },
    { value: 'servers', label: 'Servers' },
    { value: 'networking', label: 'Networking' }
  ];

  suppliers = [
    { value: 'tech-solutions', label: 'Tech Solutions PLC' },
    { value: 'office-depot', label: 'Office Depot Trading' },
    { value: 'global-suppliers', label: 'Global Suppliers Inc' }
  ];

  locations = [
    { value: 'hq-floor1-it', label: 'Headquarters - Floor 1 - IT' },
    { value: 'warehouse-aisle5', label: 'Warehouse A - Aisle 5' },
    { value: 'branch-manager', label: 'Branch Office - Manager' }
  ];

  safetyBoxes = [
    { value: 'safe-001', label: 'Safe-001 (HQ - Floor 2)' },
    { value: 'safe-002', label: 'Safe-002 (Warehouse)' },
    { value: 'none', label: 'None' }
  ];

  shelves = [
    { value: 'shelf-a1', label: 'Shelf A-1' },
    { value: 'shelf-b3', label: 'Shelf B-3' },
    { value: 'shelf-c2', label: 'Shelf C-2' }
  ];

  employees = [
    { value: 'john-doe', label: 'John Doe (IT Manager)' },
    { value: 'sarah-smith', label: 'Sarah Smith (Store Officer)' },
    { value: 'unassigned', label: 'Unassigned' }
  ];

  maintenanceSchedules = [
    { value: '3-months', label: 'Every 3 months' },
    { value: '6-months', label: 'Every 6 months' },
    { value: '12-months', label: 'Every 12 months' },
    { value: '24-months', label: 'Every 24 months' }
  ];

  stepIcons = ['bi-info-circle', 'bi-currency-dollar', 'bi-geo-alt', 'bi-shield-check'];

  stepLabels = ['Basic Info', 'Financial', 'Location', 'Additional'];

  uploadedFiles = signal<{ name: string; size: number; type: string }[]>([]);
  notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  showCancelConfirm = signal(false);
  showSuccessModal = signal(false);

  totalValue = signal(0);

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  calculateTotalValue(): void {
    const data = this.formData();
    this.formData.update(d => ({ ...d, totalValue: d.unitPrice * d.quantity }));
  }

  generateTagNumber(): void {
    const tag = 'TAG-' + Date.now().toString(36).toUpperCase();
    this.formData.update(d => ({ ...d, tagNumber: tag }));
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      this.uploadedFiles.update(f => [...f, ...newFiles]);
    }
  }

  removeFile(index: number): void {
    this.uploadedFiles.update(f => f.filter((_, i) => i !== index));
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3500);
  }

  saveAsDraft(): void {
    this.showNotification('Property saved as draft!', 'success');
  }

  submitForm(): void {
    this.showSuccessModal.set(true);
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/admin/properties']);
  }

  requestCancel(): void {
    this.showCancelConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showCancelConfirm.set(false);
    this.router.navigate(['/admin/properties']);
  }

  cancelDismiss(): void {
    this.showCancelConfirm.set(false);
  }

  formatCurrency(value: number): string {
    return `ETB ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getStepClass(step: number): string {
    if (this.currentStep() === step) return 'active';
    if (this.currentStep() > step) return 'completed';
    return '';
  }
}
