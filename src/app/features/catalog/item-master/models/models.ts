import { ChangeDetectionStrategy, Component } from '@angular/core';

export type ItemStatus = 'active' | 'draft' | 'archived';

export interface ItemRecord {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitOfMeasure: string;
  price: number;
  stockOnHand: number;
  status: ItemStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateItemRequest {
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitOfMeasure: string;
  price: number;
  stockOnHand: number;
  status: ItemStatus;
}

export interface UpdateItemRequest extends CreateItemRequest {
  id: string;
}

@Component({
  selector: 'app-models',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './models.html',
  styleUrl: './models.css',
})
export class Models {}
