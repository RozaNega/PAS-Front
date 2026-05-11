import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface FormData {
  // Step 1: Basic Information
  tagNumber: string;
  propertyName: string;
  serialNumber: string;
  modelNumber: string;
  description: string;
  propertyType: string;
  category: string;
  // Step 2: Financial & Purchase Details
  unitPrice: number;
  quantity: number;
  totalValue: number;
  currency: string;
  purchaseDate: string;
  poNumber: string;
  supplier: string;
  // Step 3: Location & Assignment
  location: string;
  safetyBox: string;
  shelf: string;
  // Step 4: Additional Information
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
  totalSteps = 4;

  formData = signal<FormData>({
    // Step 1
    tagNumber: '',
    propertyName: '',
    serialNumber: '',
    modelNumber: '',
    description: '',
    propertyType: '',
    category: '',
    // Step 2
    unitPrice: 0,
    quantity: 1,
    totalValue: 0,
    currency: 'USD',
    purchaseDate: '',
    poNumber: '',
    supplier: '',
    // Step 3
    location: '',
    safetyBox: '',
    shelf: '',
    // Step 4
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
    { value: 'tech-solutions', label: 'Tech Solutions Ltd' },
    { value: 'office-depot', label: 'Office Depot' },
    { value: 'global-suppliers', label: 'Global Suppliers' }
  ];

  locations = [
    { value: 'hq-floor1-it', label: 'Headquarters - Floor 1 - IT Department' },
    { value: 'warehouse-aisle5', label: 'Warehouse A - Aisle 5' },
    { value: 'branch-manager', label: 'Branch Office - Manager Office' }
  ];

  safetyBoxes = [
    { value: 'safe-001', label: 'Safe-001 (Headquarters - Floor 2)' },
    { value: 'safe-002', label: 'Safe-002 (Warehouse - Secure Room)' },
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

  uploadedFiles = signal<any[]>([]);

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  calculateTotalValue(): void {
    const data = this.formData();
    const total = data.unitPrice * data.quantity;
    this.formData.update(d => ({ ...d, totalValue: total }));
  }

  generateTagNumber(): void {
    const tag = 'TAG-' + Date.now().toString(36).toUpperCase();
    this.formData.update(d => ({ ...d, tagNumber: tag }));
  }

  handleFileUpload(event: any): void {
    const files = event.target.files as FileList;
    if (files) {
      const newFiles = Array.from(files).map((file: File) => ({
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

  saveAsDraft(): void {
    console.log('Saving as draft:', this.formData());
    alert('Property saved as draft!');
  }

  submitForm(): void {
    console.log('Submitting property:', this.formData());
    alert('Property submitted successfully!');
    this.router.navigate(['/admin/properties']);
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      this.router.navigate(['/admin/properties']);
    }
  }
}
