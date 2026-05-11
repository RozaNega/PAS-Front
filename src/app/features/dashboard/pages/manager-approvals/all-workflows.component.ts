import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  approverCount: number;
  createdDate: string;
}

@Component({
  selector: 'app-all-workflows',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-workflows.component.html',
  styleUrls: ['./all-workflows.component.scss']
})
export class AllWorkflowsComponent {
  protected readonly workflows = signal<Workflow[]>([
    {
      id: '1',
      name: 'Standard Approval',
      description: 'Default approval workflow for requests under $10,000',
      status: 'Active',
      approverCount: 2,
      createdDate: '2024-01-01'
    },
    {
      id: '2',
      name: 'High Value Approval',
      description: 'Approval workflow for requests over $10,000',
      status: 'Active',
      approverCount: 3,
      createdDate: '2024-01-05'
    }
  ]);
}
