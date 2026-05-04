import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface PropertyType {
  id: string;
  name: string;
  icon: string;
  propertiesCount: number;
  customFields: number;
  status: 'Active' | 'Inactive';
}

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

@Component({
  selector: 'app-property-type-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './property-type-list.component.html',
  styleUrls: ['./property-type-list.component.scss']
})
export class PropertyTypeListComponent {
  private router = inject(Router);

  searchTerm = signal('');
  statusFilter = signal('All');
  showModal = signal(false);
  editingType = signal<PropertyType | null>(null);

  propertyTypes = signal<PropertyType[]>([
    { id: '1', name: 'Computer', icon: '💻', propertiesCount: 234, customFields: 5, status: 'Active' },
    { id: '2', name: 'Printer', icon: '🖨️', propertiesCount: 56, customFields: 3, status: 'Active' },
    { id: '3', name: 'Furniture', icon: '🪑', propertiesCount: 189, customFields: 4, status: 'Active' },
    { id: '4', name: 'Vehicle', icon: '🚗', propertiesCount: 23, customFields: 6, status: 'Active' },
    { id: '5', name: 'Machinery', icon: '⚙️', propertiesCount: 67, customFields: 7, status: 'Inactive' },
    { id: '6', name: 'Office Equipment', icon: '📠', propertiesCount: 145, customFields: 2, status: 'Active' },
    { id: '7', name: 'Software License', icon: '💿', propertiesCount: 89, customFields: 4, status: 'Active' }
  ]);

  customFields = signal<CustomField[]>([
    { name: 'Processor', type: 'Text', required: true },
    { name: 'RAM (GB)', type: 'Number', required: true },
    { name: 'Storage (GB)', type: 'Number', required: true },
    { name: 'Operating System', type: 'Dropdown', required: false },
    { name: 'Graphics Card', type: 'Text', required: false }
  ]);

  modalFormData = signal({
    name: '',
    icon: '💻',
    description: '',
    warrantyPeriod: '12 months',
    depreciationRate: '20% per year',
    locationCategory: 'IT Equipment',
    status: 'Active'
  });

  filteredTypes = signal<PropertyType[]>([]);

  constructor() {
    this.filterTypes();
  }

  filterTypes(): void {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    this.filteredTypes.set(
      this.propertyTypes().filter(type => {
        const matchesSearch = type.name.toLowerCase().includes(search);
        const matchesStatus = status === 'All' || type.status === status;
        return matchesSearch && matchesStatus;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterTypes();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.filterTypes();
  }

  openAddModal(): void {
    this.editingType.set(null);
    this.modalFormData.set({
      name: '',
      icon: '💻',
      description: '',
      warrantyPeriod: '12 months',
      depreciationRate: '20% per year',
      locationCategory: 'IT Equipment',
      status: 'Active'
    });
    this.customFields.set([]);
    this.showModal.set(true);
  }

  openEditModal(type: PropertyType): void {
    this.editingType.set(type);
    this.modalFormData.set({
      name: type.name,
      icon: type.icon,
      description: '',
      warrantyPeriod: '12 months',
      depreciationRate: '20% per year',
      locationCategory: 'IT Equipment',
      status: type.status
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

  updateCustomField(index: number, field: keyof CustomField, value: any): void {
    this.customFields.update(fields => {
      const newFields = [...fields];
      newFields[index] = { ...newFields[index], [field]: value };
      return newFields;
    });
  }

  saveType(): void {
    const data = this.modalFormData();
    const editing = this.editingType();

    if (editing) {
      this.propertyTypes.update(types =>
        types.map(t => t.id === editing.id ? { ...t, ...data, customFields: this.customFields().length, status: data.status as 'Active' | 'Inactive' } : t)
      );
    } else {
      const newType: PropertyType = {
        id: Date.now().toString(),
        name: data.name,
        icon: data.icon,
        propertiesCount: 0,
        customFields: this.customFields().length,
        status: data.status as 'Active' | 'Inactive'
      };
      this.propertyTypes.update(types => [...types, newType]);
    }

    this.filterTypes();
    this.closeModal();
  }

  deleteType(id: string): void {
    if (confirm('Are you sure you want to delete this property type?')) {
      this.propertyTypes.update(types => types.filter(t => t.id !== id));
      this.filterTypes();
    }
  }

  toggleStatus(id: string): void {
    this.propertyTypes.update(types =>
      types.map(t => t.id === id ? { ...t, status: t.status === 'Active' ? 'Inactive' : 'Active' } : t)
    );
    this.filterTypes();
  }

  duplicateType(type: PropertyType): void {
    const newType: PropertyType = {
      ...type,
      id: Date.now().toString(),
      name: type.name + ' (Copy)',
      propertiesCount: 0
    };
    this.propertyTypes.update(types => [...types, newType]);
    this.filterTypes();
  }
}
