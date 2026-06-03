import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoriesService } from '../../core/services/categories.service';

@Component({
  selector: 'app-property-category-list',
  templateUrl: './property-category-list.component.html',
  styleUrls: ['./property-category-list.component.scss'],
})
export class PropertyCategoryListComponent implements OnInit {
  categories: any[] = [];
  isLoading = false;
  showForm = false;
  isEditing = false;
  selectedCategory: any = null;
  categoryForm: FormGroup;

  Math = Math;

  constructor(
    private fb: FormBuilder,
    private categoriesService: CategoriesService,
  ) {
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      description: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoriesService.getCategories(1, 50).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  showAddForm(): void {
    this.isEditing = false;
    this.selectedCategory = null;
    this.categoryForm.reset({ isActive: true });
    this.showForm = true;
  }

  editCategory(category: any): void {
    this.isEditing = true;
    this.selectedCategory = category;
    this.categoryForm.patchValue({
      categoryName: category.categoryName,
      description: category.description,
      isActive: category.isActive,
    });
    this.showForm = true;
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) return;

    this.isLoading = true;
    const data = this.categoryForm.value;

    if (this.isEditing && this.selectedCategory) {
      this.categoriesService.updateCategory(this.selectedCategory.id, data).subscribe({
        next: () => {
          this.loadCategories();
          this.cancelForm();
        },
        error: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.categoriesService.createCategory(data).subscribe({
        next: () => {
          this.loadCategories();
          this.cancelForm();
        },
        error: () => {
          this.isLoading = false;
        },
      });
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.selectedCategory = null;
    this.categoryForm.reset();
  }

  deleteCategory(id: number): void {
    if (!confirm('Are you sure you want to delete this category?')) return;
    this.isLoading = true;
    this.categoriesService.deleteCategory(id).subscribe({
      next: () => {
        this.loadCategories();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  toggleStatus(category: any): void {
    this.categoriesService.toggleCategoryStatus(category.id, !category.isActive).subscribe({
      next: () => {
        category.isActive = !category.isActive;
      },
    });
  }
}
