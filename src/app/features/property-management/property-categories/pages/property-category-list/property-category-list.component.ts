import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-property-category-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './property-category-list.component.html',
  styleUrls: ['./property-category-list.component.scss']
})
export class PropertyCategoryListComponent {
  private router = inject(Router);

  selectedCategory = signal<Category | null>(null);
  showModal = signal(false);
  editingCategory = signal<Category | null>(null);
  expandedCategories = signal<Set<string>>(new Set());

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

    if (editing) {
      this.updateCategoryRecursive(this.categories(), editing.id, data);
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: data.name,
        icon: data.icon,
        parentId: data.parentId,
        subcategories: [],
        propertiesCount: 0,
        status: 'Active',
        color: data.color,
        displayOrder: data.displayOrder
      };

      if (data.parentId) {
        this.addToParentRecursive(this.categories(), data.parentId, newCategory);
      } else {
        this.categories.update(cats => [...cats, newCategory]);
      }
    }

    this.closeModal();
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

  deleteCategory(id: string): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.deleteCategoryRecursive(this.categories(), id);
    }
  }

  deleteCategoryRecursive(cats: Category[], id: string): boolean {
    for (let i = 0; i < cats.length; i++) {
      if (cats[i].id === id) {
        cats.splice(i, 1);
        this.categories.set([...cats]);
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

  getFlatCategories(): Category[] {
    const flat: Category[] = [];
    const flatten = (cats: Category[]) => {
      cats.forEach(cat => {
        flat.push(cat);
        if (cat.subcategories.length > 0) {
          flatten(cat.subcategories);
        }
      });
    };
    flatten(this.categories());
    return flat;
  }
}
