import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-workflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-workflow.component.html',
  styleUrls: ['./create-workflow.component.scss']
})
export class CreateWorkflowComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);

  protected readonly workflowForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    minAmount: [0, [Validators.required, Validators.min(0)]],
    maxAmount: [0, [Validators.required, Validators.min(0)]],
    approverLevels: [1, [Validators.required, Validators.min(1)]],
  });

  protected submit(): void {
    this.submitted.set(true);
    if (this.workflowForm.invalid) return;
    this.loading.set(true);
    console.log('Creating workflow:', this.workflowForm.value);
    setTimeout(() => {
      this.loading.set(false);
      alert('Workflow created successfully!');
      this.workflowForm.reset();
    }, 1000);
  }

  protected cancel(): void {
    this.workflowForm.reset();
  }
}
