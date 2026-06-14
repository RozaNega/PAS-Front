import { Component, signal, inject, OnInit, computed } from '@angular/core';
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

  get totalCount(): number { return this.workflows().length; }

  protected getInitials(name: string): string {
    if (!name) return 'W';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  protected getAvatarColor(name: string): string {
    const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 55%, 50%)`;
  }

  ngOnInit(): void {
    this.loadWorkflows();
  }

  protected navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  private loadWorkflows(): void {
    this.loading.set(true);
    this.error.set(null);

    this.workflowService.getAllWorkflows().subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.succeeded) {
          this.workflows.set(response.data);
        } else {
          this.error.set('Failed to load workflows');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('An error occurred while loading workflows');
      }
    });
  }

  protected createWorkflow(): void {
    void this.router.navigate(['/manager/workflows/create']);
  }

  protected editWorkflow(id: string): void {
    void this.router.navigate(['/manager/workflows/edit', id]);
  }

  protected deleteWorkflow(id: string): void {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    this.workflowService.deleteWorkflow(id).subscribe({
      next: (response) => {
        if (response.succeeded) {
          this.loadWorkflows();
        } else {
          alert(`Failed to delete workflow: ${response.message}`);
        }
      },
      error: () => {
        alert('An error occurred while deleting the workflow');
      }
    });
  }

  protected refreshWorkflows(): void {
    this.loadWorkflows();
  }
}
