import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  completedBy: string;
  completedDate: string;
  findings: number;
  riskLevel: string;
}

@Component({
  selector: 'app-completed-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completed-audits.component.html',
  styleUrls: ['./completed-audits.component.scss']
})
export class CompletedAuditsComponent {
  protected readonly audits = signal<Audit[]>([
    { id: '1', auditId: 'AUD-2024-001', type: 'Request Review', completedBy: 'Officer A', completedDate: '2024-01-20', findings: 2, riskLevel: 'Low' }
  ]);
}
