import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Category {
  id: string;
  name: string;
  description: string;
  parentCategoryId: string | null;
  parentCategoryName?: string;
  subCategoriesCount: number;
  itemsCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
  parentCategoryId?: string | null;
}

export interface UpdateCategoryRequest {
  id: string;
  name: string;
  description: string;
  parentCategoryId?: string | null;
}

export interface CategoryTree {
  id: string;
  name: string;
  description: string;
  children: CategoryTree[];
}

export interface CategoryDetail extends Category {
  subCategories: Category[];
  items: CategoryItem[];
}

export interface CategoryItem {
  id: string;
  sku: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock: number;
}

@Component({
  selector: 'app-models',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './models.html',
  styleUrl: './models.css',
})
export class Models {}
