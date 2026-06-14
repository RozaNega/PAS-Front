import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApprovalWorkflowService } from '../../../workflow/approval-workflows/services/approval-workflow.service';

@Component({
  selector: 'app-create-workflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-workflow.component.html',
  styleUrls: ['./create-workflow.component.scss']
})
export class CreateWorkflowComponent {
  private readonly fb = inject(FormBuilder);
  private readonly workflowService = inject(ApprovalWorkflowService);
  private readonly router = inject(Router);
  
  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);

  protected readonly workflowForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected submit(): void {
    this.submitted.set(true);
    
    if (this.workflowForm.invalid) return;
    
    this.loading.set(true);
    
    const workflowData = {
      workflowName: this.workflowForm.value.name!,
      description: this.workflowForm.value.description!
    };
    
    this.workflowService.createWorkflow(workflowData).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.succeeded) {
          this.workflowForm.reset();
          this.submitted.set(false);
          this.navigateTo('/manager/workflows/all');
        } else {
          alert(`Failed to create workflow: ${response.message}`);
        }
      },
      error: () => {
        this.loading.set(false);
        alert('An error occurred while creating the workflow. Please try again.');
      }
    });
  }

  protected cancel(): void {
    this.workflowForm.reset();
    this.submitted.set(false);
    this.navigateTo('/manager/workflows/all');
  }
}
