import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-request.component.html',
  styleUrls: ['./create-request.component.scss']
})
export class CreateRequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);

  protected readonly requestForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    priority: ['Medium', [Validators.required]],
    itemId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    urgencyDate: ['', [Validators.required]],
  });

  protected readonly priorityOptions = ['Low', 'Medium', 'High', 'Urgent'];

  protected submit(): void {
    this.submitted.set(true);

    if (this.requestForm.invalid) {
      return;
    }

    this.loading.set(true);
    // TODO: Call API to create request
    console.log('Creating request:', this.requestForm.value);

    // Simulate API call
    setTimeout(() => {
      this.loading.set(false);
      alert('Request created successfully!');
      this.router.navigate(['/employee/requests/pending']);
    }, 1000);
  }

  protected cancel(): void {
    this.router.navigate(['/employee/dashboard']);
  }
}
