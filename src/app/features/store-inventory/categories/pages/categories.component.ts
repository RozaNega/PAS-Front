import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { CategoriesService } from '../../../../core/services/categories.service';

echarts.use([
  BarChart, PieChart,
  TooltipComponent, GridComponent, LegendComponent,
  CanvasRenderer,
]);

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

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);

  searchTerm = signal('');
  viewMode = signal('tree');
  loading = signal(false);

  categories = signal<Category[]>([
    { id: '1', name: 'Electronics', parentCategory: '-', itemsCount: 234, subcategories: 8, status: 'Active' },
    { id: '2', name: 'Computers', parentCategory: 'Electronics', itemsCount: 89, subcategories: 3, status: 'Active' },
    { id: '3', name: 'Laptops', parentCategory: 'Computers', itemsCount: 45, subcategories: 0, status: 'Active' },
    { id: '4', name: 'Printers', parentCategory: 'Electronics', itemsCount: 56, subcategories: 2, status: 'Active' },
    { id: '5', name: 'Furniture', parentCategory: '-', itemsCount: 189, subcategories: 3, status: 'Active' },
    { id: '6', name: 'Chairs', parentCategory: 'Furniture', itemsCount: 89, subcategories: 0, status: 'Active' },
    { id: '7', name: 'Stationery', parentCategory: '-', itemsCount: 234, subcategories: 0, status: 'Active' },
    { id: '8', name: 'Desks', parentCategory: 'Furniture', itemsCount: 67, subcategories: 0, status: 'Active' },
    { id: '9', name: 'Cabinets', parentCategory: 'Furniture', itemsCount: 33, subcategories: 0, status: 'Active' },
    { id: '10', name: 'Laser Printers', parentCategory: 'Printers', itemsCount: 34, subcategories: 0, status: 'Active' },
    { id: '11', name: 'Inkjet Printers', parentCategory: 'Printers', itemsCount: 22, subcategories: 0, status: 'Active' },
    { id: '12', name: 'Supplies', parentCategory: '-', itemsCount: 156, subcategories: 0, status: 'Active' },
    { id: '13', name: 'IT Equipment', parentCategory: '-', itemsCount: 89, subcategories: 0, status: 'Active' },
    { id: '14', name: 'Networking', parentCategory: 'Electronics', itemsCount: 78, subcategories: 0, status: 'Active' },
    { id: '15', name: 'Audio/Visual', parentCategory: 'Electronics', itemsCount: 11, subcategories: 0, status: 'Active' },
    { id: '16', name: 'Office Equipment', parentCategory: '-', itemsCount: 67, subcategories: 0, status: 'Active' }
  ]);

  showAddModal = signal(false);
  showCategoryItemsModal = signal(false);
  selectedCategory = signal<Category | null>(null);

  constructor() {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoriesService.getAll(1, 100).subscribe({
      next: (res: any) => {
        const data = res?.data;
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data?.items) {
          items = data.items;
        }
        if (items.length) {
          this.categories.set(items.map((c: any) => ({
            id: String(c.id),
            name: c.name || c.categoryName || '',
            parentCategory: c.parentCategoryName || '-',
            itemsCount: c.itemsCount ?? 0,
            subcategories: c.subCategoriesCount ?? 0,
            status: c.isActive !== false ? 'Active' : 'Inactive'
          })));
        }
      },
      error: () => {}
    });
  }

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    parentCategoryId: ['']
  });

  subcategories = signal<Subcategory[]>([
    { id: '1', name: 'Computers', itemsCount: 89, totalValue: 456789, status: 'Active' },
    { id: '2', name: 'Printers', itemsCount: 56, totalValue: 234567, status: 'Active' },
    { id: '3', name: 'Networking', itemsCount: 78, totalValue: 345678, status: 'Active' },
    { id: '4', name: 'Audio/Visual', itemsCount: 11, totalValue: 208644, status: 'Active' }
  ]);

  categoryItems = signal([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', subcategory: 'Computers', stock: 45, price: 2499, totalValue: 112455 },
    { sku: 'MON-002', name: 'HP 27" Monitor', subcategory: 'Displays', stock: 67, price: 350, totalValue: 23450 },
    { sku: 'PRI-003', name: 'HP Laser Printer', subcategory: 'Printers', stock: 12, price: 899, totalValue: 10788 },
    { sku: 'SWI-004', name: 'Cisco Switch', subcategory: 'Networking', stock: 23, price: 1200, totalValue: 27600 }
  ]);

  filteredCategories = computed(() => {
    const search = this.searchTerm().toLowerCase();
    return this.categories().filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(search) ||
                            cat.parentCategory.toLowerCase().includes(search);
      return matchesSearch;
    });
  });

  totalCategories = computed(() => this.categories().length);
  activeCategories = computed(() => this.categories().filter(c => c.status === 'Active').length);
  totalItemsAcrossCategories = computed(() => this.categories().reduce((sum, c) => sum + c.itemsCount, 0));
  totalSubcategories = computed(() => this.categories().reduce((sum, c) => sum + c.subcategories, 0));

  categoryTree = computed<CategoryTreeNode[]>(() => {
    const buildTree = (parentName: string): CategoryTreeNode[] => {
      return this.categories()
        .filter(c => c.parentCategory === parentName)
        .map(c => ({
          ...c,
          children: buildTree(c.name)
        }));
    };
    return buildTree('-');
  });

  categoryBarChartData = computed(() => {
    const items = this.categories()
      .filter(c => c.parentCategory === '-')
      .sort((a, b) => b.itemsCount - a.itemsCount);
    return {
      names: items.map(c => c.name),
      values: items.map(c => c.itemsCount)
    };
  });

  get categoryBarOpts(): Record<string, unknown> {
    const data = this.categoryBarChartData();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: data.names, axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar',
        data: data.values.map((v, i) => ({
          value: v,
          itemStyle: { color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i % 7], borderRadius: [6, 6, 0, 0] }
        })),
        barWidth: '55%'
      }]
    };
  }

  get categoryPieOpts(): Record<string, unknown> {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} items ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16 },
        labelLine: { length: 10, length2: 15, smooth: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' } },
        data: this.categories()
          .filter(c => c.parentCategory === '-')
          .map((c, i) => ({
            value: c.itemsCount,
            name: c.name,
            itemStyle: { color: colors[i % colors.length] }
          }))
      }]
    };
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
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
      categoryName: formValue.name,
      description: formValue.description,
      parentCategoryId: formValue.parentCategoryId ? formValue.parentCategoryId : undefined
    }).pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Category created successfully:', response.data);
          this.closeAddModal();
          this.loadCategories();
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

  getChildren(parentName: string): Category[] {
    return this.categories().filter(c => c.parentCategory === parentName);
  }

  getRootCategories(): Category[] {
    return this.categories().filter(c => c.parentCategory === '-');
  }

  getCategoryItemsCount(name: string): number {
    const cat = this.categories().find(c => c.name === name);
    return cat ? cat.itemsCount : 0;
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
