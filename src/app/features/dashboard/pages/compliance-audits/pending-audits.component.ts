import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
}

@Component({
  selector: 'app-pending-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-audits.component.html',
  styleUrls: ['./pending-audits.component.scss']
})
export class PendingAuditsComponent {
  protected readonly audits = signal<Audit[]>([
    { id: '1', auditId: 'AUD-2024-003', type: 'Request Review', priority: 'High', assignedTo: 'Officer A', dueDate: '2024-01-25' }
  ]);
}
