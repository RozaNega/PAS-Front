import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ResponseTime {
  id: string;
  approver: string;
  department: string;
  avgResponseTime: string;
  totalDecisions: number;
  onTimeRate: number;
}

@Component({
  selector: 'app-response-times',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './response-times.component.html',
  styleUrls: ['./response-times.component.scss']
})
export class ResponseTimesComponent {
  protected readonly responseTimes = signal<ResponseTime[]>([
    { id: '1', approver: 'Manager A', department: 'IT', avgResponseTime: '2.3 hours', totalDecisions: 45, onTimeRate: 92 },
    { id: '2', approver: 'Manager B', department: 'Finance', avgResponseTime: '1.8 hours', totalDecisions: 32, onTimeRate: 95 }
  ]);
}
