import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CategoriesService } from '../../../../core/services/categories.service';

interface Category {
  id: string;
  name: string;
  parentCategory: string;
  itemsCount: number;
  subcategories: number;
  status: 'Active' | 'Inactive';
}

interface Subcategory {
  id: string;
  name: string;
  itemsCount: number;
  totalValue: number;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);

  searchTerm = signal('');
  viewMode = signal('tree'); // 'tree' or 'list'
  loading = signal(false);

  categories = signal<Category[]>([
    { id: '1', name: 'Electronics', parentCategory: '-', itemsCount: 234, subcategories: 8, status: 'Active' },
    { id: '2', name: 'Computers', parentCategory: 'Electronics', itemsCount: 89, subcategories: 3, status: 'Active' },
    { id: '3', name: 'Laptops', parentCategory: 'Computers', itemsCount: 45, subcategories: 0, status: 'Active' },
    { id: '4', name: 'Printers', parentCategory: 'Electronics', itemsCount: 56, subcategories: 2, status: 'Active' },
    { id: '5', name: 'Furniture', parentCategory: '-', itemsCount: 189, subcategories: 3, status: 'Active' },
    { id: '6', name: 'Chairs', parentCategory: 'Furniture', itemsCount: 89, subcategories: 0, status: 'Active' },
    { id: '7', name: 'Stationery', parentCategory: '-', itemsCount: 234, subcategories: 0, status: 'Active' }
  ]);

  showAddModal = signal(false);
  showCategoryItemsModal = signal(false);
  selectedCategory = signal<Category | null>(null);

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    parentCategoryId: ['']
  });

  // Subcategories for selected category
  subcategories = signal<Subcategory[]>([
    { id: '1', name: 'Computers', itemsCount: 89, totalValue: 456789, status: 'Active' },
    { id: '2', name: 'Printers', itemsCount: 56, totalValue: 234567, status: 'Active' },
    { id: '3', name: 'Networking', itemsCount: 78, totalValue: 345678, status: 'Active' },
    { id: '4', name: 'Audio/Visual', itemsCount: 11, totalValue: 208644, status: 'Active' }
  ]);

  // Category items
  categoryItems = signal([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', subcategory: 'Computers', stock: 45, price: 2499, totalValue: 112455 },
    { sku: 'MON-002', name: 'HP Monitor', subcategory: 'Displays', stock: 67, price: 350, totalValue: 23450 },
    { sku: 'PRI-003', name: 'HP Laser Printer', subcategory: 'Printers', stock: 12, price: 899, totalValue: 10788 },
    { sku: 'SWI-004', name: 'Cisco Switch', subcategory: 'Networking', stock: 23, price: 1200, totalValue: 27600 }
  ]);

  filteredCategories = signal<Category[]>([]);

  constructor() {
    this.filterCategories();
  }

  filterCategories(): void {
    const search = this.searchTerm().toLowerCase();

    this.filteredCategories.set(
      this.categories().filter(cat => {
        const matchesSearch = cat.name.toLowerCase().includes(search) ||
                              cat.parentCategory.toLowerCase().includes(search);
        return matchesSearch;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterCategories();
  }

  toggleViewMode(mode: 'tree' | 'list'): void {
    this.viewMode.set(mode);
  }

  openAddModal(): void {
    this.categoryForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.categoryForm.reset();
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.categoryForm.getRawValue();

    this.categoriesService.createCategory({
      name: formValue.name,
      description: formValue.description,
      parentCategoryId: formValue.parentCategoryId || null
    }).pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Category created successfully:', response.data);
          this.closeAddModal();
          // TODO: Reload categories from backend
        } else {
          console.error('Failed to create category:', response.message);
          alert('Failed to create category: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error creating category:', error);
        alert('Error creating category: ' + (error.error?.message || 'Unknown error'));
      }
    });
  }

  openCategoryItemsModal(category: Category): void {
    this.selectedCategory.set(category);
    this.showCategoryItemsModal.set(true);
  }

  closeCategoryItemsModal(): void {
    this.showCategoryItemsModal.set(false);
    this.selectedCategory.set(null);
  }

  editCategory(category: Category): void {
    console.log('Edit category:', category.name);
  }

  deleteCategory(category: Category): void {
    if (confirm(`Are you sure you want to delete ${category.name}?`)) {
      console.log('Delete category:', category.name);
    }
  }

  viewSubcategories(category: Category): void {
    this.openCategoryItemsModal(category);
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusIcon(status: string): string {
    return status === 'Active' ? '🟢' : '🔴';
  }
}
