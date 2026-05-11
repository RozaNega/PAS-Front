import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  auditedBy: string;
  auditDate: string;
  findings: number;
}

@Component({
  selector: 'app-all-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-audits.component.html',
  styleUrls: ['./all-audits.component.scss']
})
export class AllAuditsComponent {
  protected readonly audits = signal<Audit[]>([
    { id: '1', auditId: 'AUD-2024-001', type: 'Request Review', status: 'Completed', auditedBy: 'Officer A', auditDate: '2024-01-20', findings: 2 },
    { id: '2', auditId: 'AUD-2024-002', type: 'SIV Verification', status: 'In Progress', auditedBy: 'Officer B', auditDate: '2024-01-21', findings: 0 }
  ]);
}
