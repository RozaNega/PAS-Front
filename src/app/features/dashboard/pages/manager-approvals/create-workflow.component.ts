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

  protected submit(): void {
    this.submitted.set(true);
    
    if (this.workflowForm.invalid) {
      alert('Please fill in all required fields correctly.');
      return;
    }
    
    this.loading.set(true);
    
    const workflowData = {
      workflowName: this.workflowForm.value.name!,  // Map 'name' to 'workflowName'
      description: this.workflowForm.value.description!
    };
    
    console.log('🔄 Creating workflow with data:', workflowData);
    
    this.workflowService.createWorkflow(workflowData).subscribe({
      next: (response) => {
        console.log('✅ Workflow creation response:', response);
        this.loading.set(false);
        if (response.succeeded) {
          alert('Workflow created successfully!');
          this.workflowForm.reset();
          this.submitted.set(false);
          // Navigate to all workflows page
          this.router.navigate(['/manager/workflows/all']);
        } else {
          console.error('❌ Workflow creation failed:', response.message);
          alert(`Failed to create workflow: ${response.message}`);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('❌ Error creating workflow:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        
        let errorMessage = 'An error occurred while creating the workflow.';
        
        if (error.status === 404) {
          errorMessage = 'Workflow API endpoint not found. Please check the backend configuration.';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid workflow data. Please check your input.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please contact the administrator.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        alert(errorMessage + '\n\nCheck the browser console for more details.');
      }
    });
  }

  protected cancel(): void {
    this.workflowForm.reset();
    this.submitted.set(false);
    this.router.navigate(['/manager/workflows/all']);
  }
}
