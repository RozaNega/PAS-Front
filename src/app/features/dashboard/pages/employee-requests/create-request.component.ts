import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RequisitionsService, CreateServiceRequestDto } from '../../../../core/services/requisitions.service';
import { ItemService } from '../../../catalog/item-master/services/item.service';
import { InventoryService, ShelfLocationDto } from '../../../../core/services/inventory.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-request.component.html',
  styleUrls: ['./create-request.component.scss']
})
export class CreateRequestComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly requisitionsService = inject(RequisitionsService);
  private readonly itemService = inject(ItemService);
  private readonly inventoryService = inject(InventoryService);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly items = signal<any[]>([]);
  protected readonly shelves = signal<ShelfLocationDto[]>([]);

  protected readonly requestForm = this.fb.group({
    items: this.fb.array([]),
    remarks: ['', [Validators.required]]
  });

  get itemsArray(): FormArray {
    return this.requestForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.fetchInitialData();
    this.addItem(); // Add one initial item
  }

  private fetchInitialData(): void {
    this.itemService.getItems({ pageSize: 100 }).subscribe(res => {
      if (res.success && res.data) {
        this.items.set(res.data.items);
      }
    });

    this.inventoryService.getAllShelves().subscribe(res => {
      if (res.success && res.data) {
        this.shelves.set(res.data);
      }
    });
  }

  protected addItem(): void {
    const itemGroup = this.fb.group({
      itemId: ['', [Validators.required]],
      srDetailId: [null], // Usually null for new requests
      requestedQty: [1, [Validators.required, Validators.min(1)]],
      preferredShelfId: ['', [Validators.required]],
      notes: ['']
    });
    this.itemsArray.push(itemGroup);
  }

  protected removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.requestForm.invalid) {
      return;
    }

    this.loading.set(true);
    const rawValue = this.requestForm.getRawValue();
    const payload: CreateServiceRequestDto = {
      items: rawValue.items.map((item: any) => ({
        itemId: item.itemId,
        srDetailId: item.srDetailId || null,
        requestedQty: item.requestedQty,
        preferredShelfId: item.preferredShelfId,
        notes: item.notes || ''
      })),
      remarks: rawValue.remarks || ''
    };

    console.log('Submitting payload:', payload);
    this.requisitionsService.createServiceRequest(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success || res.succeeded) {
            alert('Request created successfully!');
            this.router.navigate(['/employee/requests/pending']);
          } else {
            alert('Error creating request: ' + res.message);
          }
        },
        error: (err) => {
          console.error('Error creating request:', err);
          alert('An unexpected error occurred.');
        }
      });
  }

  protected cancel(): void {
    this.router.navigate(['/employee/dashboard']);
  }
}
