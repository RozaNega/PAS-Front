import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CategoryTree as CategoryTreeNode } from '../../models/models';
import { CategoryApi } from '../../services/category-api';

@Component({
  selector: 'app-category-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-tree.html',
  styleUrl: './category-tree.css',
})
export class CategoryTree {
  private readonly categoryApi = inject(CategoryApi);

  protected readonly tree = this.categoryApi.categoryTree;

  protected readonly trackByNode = (_index: number, node: CategoryTreeNode): string => node.id;
}
