import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceRequestService } from '../../../core/services/service-request.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { ItemMasterService } from '../../../core/services/item-master.service';
import { ShelvesService } from '../../../core/services/shelves.service';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-request.component.html',
  styleUrls: ['./create-request.component.scss'],
})
export class CreateRequestComponent implements OnInit {
  requestForm: FormGroup;
  isSubmitting = false;
  categories: any[] = [];
  items: any[] = [];
  shelves: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private requestService: ServiceRequestService,
    private categoriesService: CategoriesService,
    private itemMasterService: ItemMasterService,
    private shelvesService: ShelvesService,
  ) {
    this.requestForm = this.fb.group({
      requestType: ['', Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      category: ['', Validators.required],
      priority: ['', Validators.required],
      itemId: [''],
      shelfId: [''],
      quantity: [1, [Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadItems();
    this.loadShelves();
  }

  loadCategories(): void {
    this.categoriesService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        }
      },
    });
  }

  loadItems(): void {
    this.itemMasterService.getItemMasters().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.items = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        }
      },
    });
  }

  loadShelves(): void {
    this.shelvesService.getShelves().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.shelves = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        }
      },
    });
  }

  onRequestTypeChange(): void {
    const type = this.requestForm.get('requestType')?.value;
    if (type === 'item') {
      this.requestForm.get('itemId')?.setValidators(Validators.required);
      this.requestForm.get('quantity')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.requestForm.get('itemId')?.clearValidators();
      this.requestForm.get('quantity')?.clearValidators();
    }
    this.requestForm.get('itemId')?.updateValueAndValidity();
    this.requestForm.get('quantity')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.requestForm.invalid) return;

    this.isSubmitting = true;
    this.requestService.createRequest(this.requestForm.value).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.router.navigate(['/requests']);
        }
      },
      error: () => {
        this.isSubmitting = false;
      },
    });
  }

  resetForm(): void {
    this.requestForm.reset();
  }
}
