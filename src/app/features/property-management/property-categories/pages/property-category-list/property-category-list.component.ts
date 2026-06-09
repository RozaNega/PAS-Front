import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { PropertyCategoriesService, PropertyCategory as ApiPropertyCategory } from '../../../../../core/services/property-categories.service';

interface Category {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
  subcategories: Category[];
  propertiesCount: number;
  status: 'Active' | 'Inactive';
  color: string;
  displayOrder: number;
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

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

@Component({
  selector: 'app-property-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './property-category-list.component.html',
  styleUrls: ['./property-category-list.component.scss']
})
export class PropertyCategoryListComponent implements OnInit {
  private router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoriesService = inject(PropertyCategoriesService);

  selectedCategory = signal<Category | null>(null);
  showModal = signal(false);
  editingCategory = signal<Category | null>(null);
  expandedCategories = signal<Set<string>>(new Set());
  loading = signal(false);
  showConfirmDelete = signal(false);
  categoryToDelete = signal<string | null>(null);
  notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  categories = signal<Category[]>([
    {
      id: '1',
      name: 'Electronics',
      icon: '💻',
      parentId: null,
      subcategories: [
        { id: '1-1', name: 'Computers', icon: '💻', parentId: '1', subcategories: [], propertiesCount: 45, status: 'Active', color: 'blue', displayOrder: 1 },
        { id: '1-2', name: 'Printers', icon: '🖨️', parentId: '1', subcategories: [], propertiesCount: 32, status: 'Active', color: 'blue', displayOrder: 2 },
        { id: '1-3', name: 'Networking', icon: '🌐', parentId: '1', subcategories: [], propertiesCount: 28, status: 'Active', color: 'blue', displayOrder: 3 },
        { id: '1-4', name: 'Audio/Visual', icon: '🔊', parentId: '1', subcategories: [], propertiesCount: 12, status: 'Active', color: 'blue', displayOrder: 4 },
        { id: '1-5', name: 'Cables', icon: '🔌', parentId: '1', subcategories: [], propertiesCount: 8, status: 'Active', color: 'blue', displayOrder: 5 }
      ],
      propertiesCount: 125,
      status: 'Active',
      color: 'blue',
      displayOrder: 1
    },
    {
      id: '2',
      name: 'Furniture',
      icon: '🪑',
      parentId: null,
      subcategories: [
        { id: '2-1', name: 'Chairs', icon: '🪑', parentId: '2', subcategories: [], propertiesCount: 145, status: 'Active', color: 'green', displayOrder: 1 },
        { id: '2-2', name: 'Desks', icon: '🖥️', parentId: '2', subcategories: [], propertiesCount: 98, status: 'Active', color: 'green', displayOrder: 2 },
        { id: '2-3', name: 'Cabinets', icon: '🗄️', parentId: '2', subcategories: [], propertiesCount: 69, status: 'Active', color: 'green', displayOrder: 3 }
      ],
      propertiesCount: 312,
      status: 'Active',
      color: 'green',
      displayOrder: 2
    },
    {
      id: '3',
      name: 'Vehicles',
      icon: '🚗',
      parentId: null,
      subcategories: [
        { id: '3-1', name: 'Cars', icon: '🚗', parentId: '3', subcategories: [], propertiesCount: 23, status: 'Active', color: 'red', displayOrder: 1 },
        { id: '3-2', name: 'Trucks', icon: '🚚', parentId: '3', subcategories: [], propertiesCount: 22, status: 'Active', color: 'red', displayOrder: 2 }
      ],
      propertiesCount: 45,
      status: 'Active',
      color: 'red',
      displayOrder: 3
    },
    {
      id: '4',
      name: 'Machinery',
      icon: '⚙️',
      parentId: null,
      subcategories: [],
      propertiesCount: 89,
      status: 'Active',
      color: 'orange',
      displayOrder: 4
    }
  ]);

  flatCategories = computed(() => {
    const flat: { cat: Category; depth: number }[] = [];
    const flatten = (cats: Category[], depth: number) => {
      cats.forEach(cat => {
        flat.push({ cat, depth });
        if (cat.subcategories.length > 0) {
          flatten(cat.subcategories, depth + 1);
        }
      });
    };
    flatten(this.categories(), 0);
    return flat;
  });

  totalSubcategories = computed(() =>
    this.flatCategories().filter(f => f.cat.parentId !== null).length
  );

  totalCategoryProperties = computed(() =>
    this.flatCategories().reduce((s, f) => s + f.cat.propertiesCount, 0)
  );

  statCards = computed((): StatCard[] => {
    const all = this.flatCategories();
    const total = all.length;
    const roots = all.filter(f => f.cat.parentId === null).length;
    const subs = all.filter(f => f.cat.parentId !== null).length;
    const active = all.filter(f => f.cat.status === 'Active').length;
    const totalProps = all.reduce((s, f) => s + f.cat.propertiesCount, 0);
    const largest = all.reduce((best, f) =>
      f.cat.propertiesCount > (best?.cat.propertiesCount ?? 0) ? f : best, all[0]);

    return [
      { label: 'Total Categories', value: total.toString(), pct: 100, color: '#3b82f6', icon: 'bi-folder' },
      { label: 'Root Categories', value: roots.toString(), pct: total > 0 ? Math.round(roots / total * 100) : 0, color: '#10b981', icon: 'bi-diagram-3' },
      { label: 'Subcategories', value: subs.toString(), pct: total > 0 ? Math.round(subs / total * 100) : 0, color: '#f59e0b', icon: 'bi-list-nested' },
      { label: 'Active', value: active.toString(), pct: total > 0 ? Math.round(active / total * 100) : 0, color: '#8b5cf6', icon: 'bi-check-circle' },
      { label: 'Total Properties', value: totalProps.toLocaleString(), pct: Math.min(100, Math.round(totalProps / 800 * 100)), color: '#ec4899', icon: 'bi-box' },
      { label: 'Largest', value: largest?.cat.name || 'N/A', pct: largest ? Math.round(largest.cat.propertiesCount / 312 * 100) : 0, color: '#14b8a6', icon: 'bi-trophy' }
    ];
  });

  categoryBars = computed((): BarItem[] => {
    const roots = this.categories().filter(c => c.parentId === null);
    const max = Math.max(...roots.map(c => c.propertiesCount), 1);
    return roots.map((c, i) => ({
      name: c.name,
      value: c.propertiesCount,
      pct: Math.round(c.propertiesCount / max * 100),
      color: BAR_COLORS[i % BAR_COLORS.length]
    }));
  });

  donutSegments = computed((): DonutSegment[] => {
    const roots = this.categories().filter(c => c.parentId === null);
    const total = roots.reduce((s, c) => s + c.propertiesCount, 0) || 1;
    const C = 2 * Math.PI * 50;
    let cumulative = 0;
    return roots.map((c, i) => {
      const pct = Math.round(c.propertiesCount / total * 100);
      const dashLen = C * pct / 100;
      const seg: DonutSegment = {
        label: c.name,
        value: c.propertiesCount,
        pct,
        color: BAR_COLORS[i % BAR_COLORS.length],
        dashArray: `${dashLen} ${C}`,
        dashOffset: cumulative
      };
      cumulative += dashLen;
      return seg;
    });
  });

  modalFormData = signal({
    name: '',
    parentId: '' as string | null,
    icon: '💻',
    description: '',
    color: 'blue',
    displayOrder: 1
  });

  colors = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'orange', label: 'Orange' },
    { value: 'purple', label: 'Purple' },
    { value: 'gray', label: 'Gray' }
  ];

  icons = ['💻', '🖨️', '🪑', '🚗', '⚙️', '📠', '💿', '🌐', '🔊', '🔌', '🖥️', '🗄️', '🚚'];

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoriesService.getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const items = (response.data as any).items ?? response.data as any;
            const transformedCategories = (Array.isArray(items) ? items : []).map((cat: any) => ({
              id: cat.id,
              name: cat.name ?? '',
              icon: '💻',
              parentId: cat.parentCategoryId ?? null,
              subcategories: [] as Category[],
              propertiesCount: 0,
              status: (cat.isActive !== false ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
              color: 'blue',
              displayOrder: 1
            }));
            this.categories.set(transformedCategories);
          }
        },
        error: () => {
          this.showNotification('Failed to load categories from server, using mock data', 'info');
        }
      });
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3500);
  }

  getRootCategories(): Category[] {
    return this.categories().filter(c => c.parentId === null);
  }

  selectCategory(category: Category): void {
    this.selectedCategory.set(category);
  }

  toggleExpand(categoryId: string): void {
    const expanded = new Set(this.expandedCategories());
    if (expanded.has(categoryId)) {
      expanded.delete(categoryId);
    } else {
      expanded.add(categoryId);
    }
    this.expandedCategories.set(expanded);
  }

  expandAll(): void {
    const allIds = new Set<string>();
    const collectIds = (cats: Category[]) => {
      cats.forEach(cat => {
        allIds.add(cat.id);
        if (cat.subcategories.length > 0) {
          collectIds(cat.subcategories);
        }
      });
    };
    collectIds(this.categories());
    this.expandedCategories.set(allIds);
  }

  collapseAll(): void {
    this.expandedCategories.set(new Set());
  }

  openAddModal(parentId: string | null = null): void {
    this.editingCategory.set(null);
    this.modalFormData.set({
      name: '',
      parentId: parentId,
      icon: '💻',
      description: '',
      color: 'blue',
      displayOrder: 1
    });
    this.showModal.set(true);
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.modalFormData.set({
      name: category.name,
      parentId: category.parentId,
      icon: category.icon,
      description: '',
      color: category.color,
      displayOrder: category.displayOrder
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCategory.set(null);
  }

  saveCategory(): void {
    const data = this.modalFormData();
    const editing = this.editingCategory();
    this.loading.set(true);

    if (editing) {
      this.categoriesService.update(String(editing.id), {
        name: data.name,
        description: data.description
      }).pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.updateCategoryRecursive(this.categories(), editing.id, data);
            this.closeModal();
            this.loadCategories();
            this.showNotification('Category updated successfully', 'success');
          } else {
            this.showNotification('Failed to update category: ' + response.message, 'error');
          }
        },
        error: (error) => {
          this.showNotification('Error updating category', 'error');
        }
      });
    } else {
      this.categoriesService.create({
        name: data.name,
        description: data.description
      }).pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: { success: boolean; message?: string }) => {
          if (response.success) {
            this.closeModal();
            this.loadCategories();
            this.showNotification('Category created successfully', 'success');
          } else {
            this.showNotification('Failed to create category: ' + (response.message ?? 'Unknown error'), 'error');
          }
        },
        error: (err: unknown) => {
          const msg = (err as { error?: { message?: string }; message?: string })?.error?.message
            ?? (err as { message?: string })?.message
            ?? 'Unknown error';
          this.showNotification('Error creating category: ' + msg, 'error');
        }
      });
    }
  }

  updateCategoryRecursive(cats: Category[], id: string, data: any): boolean {
    for (const cat of cats) {
      if (cat.id === id) {
        cat.name = data.name;
        cat.icon = data.icon;
        cat.color = data.color;
        cat.displayOrder = data.displayOrder;
        return true;
      }
      if (cat.subcategories.length > 0) {
        if (this.updateCategoryRecursive(cat.subcategories, id, data)) {
          return true;
        }
      }
    }
    return false;
  }

  addToParentRecursive(cats: Category[], parentId: string, newCategory: Category): boolean {
    for (const cat of cats) {
      if (cat.id === parentId) {
        cat.subcategories.push(newCategory);
        return true;
      }
      if (cat.subcategories.length > 0) {
        if (this.addToParentRecursive(cat.subcategories, parentId, newCategory)) {
          return true;
        }
      }
    }
    return false;
  }

  requestDelete(id: string): void {
    this.categoryToDelete.set(id);
    this.showConfirmDelete.set(true);
  }

  cancelDelete(): void {
    this.showConfirmDelete.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDelete(): void {
    const id = this.categoryToDelete();
    if (id) {
      this.deleteCategoryRecursive(this.categories(), id);
      this.showNotification('Category deleted', 'success');
    }
    this.cancelDelete();
  }

  deleteCategory(id: string): void {
    this.requestDelete(id);
  }

  deleteCategoryRecursive(cats: Category[], id: string): boolean {
    for (let i = 0; i < cats.length; i++) {
      if (cats[i].id === id) {
        cats.splice(i, 1);
        this.categories.set([...cats]);
        if (this.selectedCategory()?.id === id) {
          this.selectedCategory.set(null);
        }
        return true;
      }
      if (cats[i].subcategories.length > 0) {
        if (this.deleteCategoryRecursive(cats[i].subcategories, id)) {
          return true;
        }
      }
    }
    return false;
  }

  getCategoryStatus(cat: Category): 'Active' | 'Inactive' {
    return cat.status;
  }

  getFlatCategories(): Category[] {
    return this.flatCategories().map(f => f.cat);
  }

  getParentLabel(cat: Category): string {
    return cat.parentId ? 'Subcategory' : 'Root Category';
  }
}
