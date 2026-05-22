import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApprovalWorkflowService, WorkflowResponse } from '../../../workflow/approval-workflows/services/approval-workflow.service';

@Component({
  selector: 'app-all-workflows',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-workflows.component.html',
  styleUrls: ['./all-workflows.component.scss']
})
export class AllWorkflowsComponent implements OnInit {
  private readonly workflowService = inject(ApprovalWorkflowService);
  private readonly router = inject(Router);

  protected readonly workflows = signal<WorkflowResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWorkflows();
  }

  private loadWorkflows(): void {
    this.loading.set(true);
    this.error.set(null);

    this.workflowService.getAllWorkflows().subscribe({
      next: (response) => {
        console.log('✅ Workflows loaded:', response);
        this.loading.set(false);
        if (response.succeeded) {
          this.workflows.set(response.data);
        } else {
          this.error.set('Failed to load workflows');
        }
      },
      error: (error) => {
        console.error('❌ Error loading workflows:', error);
        this.loading.set(false);
        this.error.set('An error occurred while loading workflows');
      }
    });
  }

  protected createWorkflow(): void {
    this.router.navigate(['/manager/workflows/create']);
  }

  protected editWorkflow(id: string): void {
    this.router.navigate(['/manager/workflows/edit', id]);
  }

  protected deleteWorkflow(id: string): void {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    this.workflowService.deleteWorkflow(id).subscribe({
      next: (response) => {
        if (response.succeeded) {
          alert('Workflow deleted successfully!');
          this.loadWorkflows(); // Reload the list
        } else {
          alert(`Failed to delete workflow: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('❌ Error deleting workflow:', error);
        alert('An error occurred while deleting the workflow');
      }
    });
  }

  protected refreshWorkflows(): void {
    this.loadWorkflows();
  }
}
