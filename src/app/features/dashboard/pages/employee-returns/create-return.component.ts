import { Component, inject, signal, OnInit } from '@angular/core';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { ApiReturnMaterialRequest } from '../../../../types/dashboard.types';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface SIV {
  sivNumber: string;
  issueDate: string;
}

@Component({
  selector: 'app-create-return',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-return.component.html',
  styleUrls: ['./create-return.component.scss']
})
export class CreateReturnComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly sivs = signal<SIV[]>([
    { sivNumber: 'SIV-2024-001', issueDate: '2024-01-20' },
    { sivNumber: 'SIV-2024-003', issueDate: '2024-01-22' }
  ]);

  private pasApi = inject(PasApiService);

  protected readonly returnForm = this.fb.group({
    itemId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    reason: ['', [Validators.required]],
    returnType: ['CustomerReturn', [Validators.required]],
    sourceLocationId: ['', [Validators.required]],
    sourceShelfId: ['', [Validators.required]],
    supplierId: ['', [Validators.required]],
    batchNumber: [''],
    expiryDate: [new Date().toISOString()],
    reference: [''],
    remarks: ['']
  });

  protected submit(): void {
    this.submitted.set(true);
    if (this.returnForm.invalid) return;
    this.loading.set(true);

    const payload = this.returnForm.value as ApiReturnMaterialRequest;
    console.log('Creating return request:', payload);

    this.pasApi.createReturnMaterialRequest(payload).subscribe({
      next: () => {
        this.loading.set(false);
        alert('Return request submitted successfully!');
        this.returnForm.reset();
        this.submitted.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error creating return:', err);
        const errorMsg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to submit return request: ${errorMsg}`);
      }
    });
  }

  protected cancel(): void {
    this.returnForm.reset();
  }
}
