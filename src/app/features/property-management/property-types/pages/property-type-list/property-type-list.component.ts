import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { PropertyTypesService, PropertyTypeDto } from '../../../../../core/services/property-types.service';

interface PropertyType {
  id: string;
  name: string;
  description: string;
  propertiesCount: number;
  customFields: number;
  status: 'Active' | 'Inactive';
  icon: string;
}

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

interface StatCard {
  label: string;
  value: string;
  pct: number;
  color: string;
  icon: string;
}

interface DonutSegment {
  label: string;
  value: number;
  pct: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface BarItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

@Component({
  selector: 'app-property-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './property-type-list.component.html',
  styleUrls: ['./property-type-list.component.scss']
})
export class PropertyTypeListComponent implements OnInit {
  private router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly propertyTypesService = inject(PropertyTypesService);

  searchTerm = signal('');
  statusFilter = signal('All');
  showModal = signal(false);
  editingType = signal<PropertyType | null>(null);
  loading = signal(false);

  propertyTypes = signal<PropertyType[]>([]);

  customFields = signal<CustomField[]>([
    { name: 'Processor', type: 'Text', required: true },
    { name: 'RAM (GB)', type: 'Number', required: true },
    { name: 'Storage (GB)', type: 'Number', required: true },
    { name: 'Operating System', type: 'Dropdown', required: false }
  ]);

  modalFormData = signal({
    name: '',
    description: '',
    status: 'Active',
    icon: '💻',
    warrantyPeriod: '12 months',
    depreciationRate: '10% per year',
    locationCategory: 'IT Equipment'
  });

  filteredTypes = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    return this.propertyTypes().filter(type => {
      const matchesSearch = !search || type.name.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || type.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  statCards = computed((): StatCard[] => {
    const types = this.filteredTypes();
    const total = types.length;
    const active = types.filter(t => t.status === 'Active').length;
    const inactive = types.filter(t => t.status === 'Inactive').length;
    const totalCustomFields = types.reduce((s, t) => s + t.customFields, 0);
    const totalProperties = types.reduce((s, t) => s + t.propertiesCount, 0);
    const mostUsed = types.reduce((best, t) => t.propertiesCount > (best?.propertiesCount ?? 0) ? t : best, types[0]);

    return [
      { label: 'Total Types', value: total.toString(), pct: 100, color: '#3b82f6', icon: 'bi-layers' },
      { label: 'Active', value: active.toString(), pct: total > 0 ? Math.round(active / total * 100) : 0, color: '#10b981', icon: 'bi-check-circle' },
      { label: 'Inactive', value: inactive.toString(), pct: total > 0 ? Math.round(inactive / total * 100) : 0, color: '#f59e0b', icon: 'bi-pause-circle' },
      { label: 'Custom Fields', value: totalCustomFields.toString(), pct: Math.min(100, Math.round(totalCustomFields / 30 * 100)), color: '#8b5cf6', icon: 'bi-list-ul' },
      { label: 'Total Properties', value: totalProperties.toLocaleString(), pct: Math.min(100, Math.round(totalProperties / 1000 * 100)), color: '#ec4899', icon: 'bi-box' },
      { label: 'Most Used', value: mostUsed?.name || 'N/A', pct: mostUsed ? Math.round(mostUsed.propertiesCount / 300 * 100) : 0, color: '#14b8a6', icon: 'bi-star' }
    ];
  });

  donutSegments = computed((): DonutSegment[] => {
    const total = this.filteredTypes().length || 1;
    const active = this.filteredTypes().filter(t => t.status === 'Active').length;
    const inactive = this.filteredTypes().filter(t => t.status === 'Inactive').length;
    const C = 2 * Math.PI * 50;

    const items = [
      { label: 'Active', value: active, pct: Math.round(active / total * 100), color: '#10b981' },
      { label: 'Inactive', value: inactive, pct: Math.round(inactive / total * 100), color: '#f59e0b' }
    ];

    let cumulative = 0;
    return items.map(item => {
      const dashLen = C * item.pct / 100;
      const seg: DonutSegment = { ...item, dashArray: `${dashLen} ${C}`, dashOffset: cumulative };
      cumulative += dashLen;
      return seg;
    });
  });

  propertyCountBars = computed((): BarItem[] => {
    const sorted = [...this.filteredTypes()].sort((a, b) => b.propertiesCount - a.propertiesCount);
    const max = sorted[0]?.propertiesCount || 1;
    return sorted.map((t, i) => ({
      name: t.name,
      value: t.propertiesCount,
      pct: Math.round(t.propertiesCount / max * 100),
      color: BAR_COLORS[i % BAR_COLORS.length]
    }));
  });

  showConfirmDelete = signal(false);
  typeToDelete = signal<string | null>(null);
  notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  ngOnInit(): void {
    this.loadPropertyTypes();
  }

  loadPropertyTypes(): void {
    this.loading.set(true);
    this.propertyTypesService.getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Handle both paginated and array responses
            const items = Array.isArray(response.data) ? response.data : ((response.data as any)?.items || []);
            const transformedTypes = items.map((type: any) => ({
              id: type.id,
              name: type.name ?? '',
              description: type.description ?? '',
              propertiesCount: type.propertiesCount ?? 0,
              customFields: 0, // custom fields count not returned by API
              status: (type.isActive !== false ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
              icon: '💻'
            }));
            this.propertyTypes.set(transformedTypes);
          }
        },
        error: (err) => {
          console.error('Failed to load property types:', err);
          this.showNotification('Failed to load property types from server', 'error');
        }
      });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3500);
  }

  openAddModal(): void {
    this.editingType.set(null);
    this.modalFormData.set({
      name: '',
      description: '',
      status: 'Active',
      icon: '💻',
      warrantyPeriod: '12 months',
      depreciationRate: '10% per year',
      locationCategory: 'IT Equipment'
    });
    this.customFields.set([]);
    this.showModal.set(true);
  }

  openEditModal(type: PropertyType): void {
    this.editingType.set(type);
    this.modalFormData.set({
      name: type.name,
      description: type.description,
      status: type.status,
      icon: '💻',
      warrantyPeriod: '12 months',
      depreciationRate: '10% per year',
      locationCategory: 'IT Equipment'
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingType.set(null);
  }

  addCustomField(): void {
    this.customFields.update(fields => [...fields, { name: '', type: 'Text', required: false }]);
  }

  removeCustomField(index: number): void {
    this.customFields.update(fields => fields.filter((_, i) => i !== index));
  }

  updateCustomField(index: number, field: keyof CustomField, value: string | boolean): void {
    this.customFields.update(fields => {
      const newFields = [...fields];
      newFields[index] = { ...newFields[index], [field]: value };
      return newFields;
    });
  }

  saveType(): void {
    const data = this.modalFormData();
    const editing = this.editingType();
    this.loading.set(true);

    if (editing) {
      this.propertyTypesService.update({
        id: editing.id,
        name: data.name,
        description: data.description
      }).pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPropertyTypes();
            this.closeModal();
            this.showNotification('Property type updated successfully', 'success');
          } else {
            this.showNotification('Failed to update property type: ' + response.message, 'error');
          }
        },
        error: () => {
          this.showNotification('Error updating property type', 'error');
        }
      });
    } else {
      this.propertyTypesService.create({
        name: data.name,
        description: data.description
      }).pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPropertyTypes();
            this.closeModal();
            this.showNotification('Property type created successfully', 'success');
          } else {
            this.showNotification('Failed to create property type: ' + response.message, 'error');
          }
        },
        error: () => {
          this.showNotification('Error creating property type', 'error');
        }
      });
    }
  }

  requestDelete(id: string): void {
    this.typeToDelete.set(id);
    this.showConfirmDelete.set(true);
  }

  cancelDelete(): void {
    this.showConfirmDelete.set(false);
    this.typeToDelete.set(null);
  }

  confirmDelete(): void {
    const id = this.typeToDelete();
    if (id) {
      this.loading.set(true);
      this.propertyTypesService.delete(id)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.propertyTypes.update(types => types.filter(t => t.id !== id));
              this.showNotification('Property type deleted successfully', 'success');
            } else {
              this.showNotification('Failed to delete property type: ' + response.message, 'error');
            }
          },
          error: (err) => {
            console.error('Error deleting property type:', err);
            this.showNotification('Error deleting property type', 'error');
          }
        });
    }
    this.cancelDelete();
  }

  toggleStatus(id: string): void {
    const type = this.propertyTypes().find(t => t.id === id);
    if (type) {
      const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
      this.loading.set(true);
      this.propertyTypesService.update({
        id: type.id,
        name: type.name,
        description: type.description
      }).pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPropertyTypes();
            this.showNotification(`Property type ${newStatus.toLowerCase()}`, 'success');
          } else {
            this.showNotification('Failed to update status: ' + response.message, 'error');
          }
        },
        error: () => {
          this.showNotification('Error updating status', 'error');
        }
      });
    }
  }

  duplicateType(type: PropertyType): void {
    const newType: PropertyType = {
      ...type,
      id: Date.now().toString(),
      name: type.name + ' (Copy)',
      propertiesCount: 0
    };
    this.propertyTypes.update(types => [...types, newType]);
    this.showNotification(`Duplicated as "${newType.name}"`, 'success');
  }

  getTypeInitials(name: string): string {
    return name.substring(0, 2).toUpperCase();
  }

  getStatusIcon(status: string): string {
    return status === 'Active' ? 'bi bi-check-circle-fill' : 'bi bi-pause-circle-fill';
  }
}