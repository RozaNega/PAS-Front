import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ReturnRequest {
  id: string;
  returnNumber: string;
  sivNumber: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processed';
  itemCount: number;
  returnReason: string;
}

@Component({
  selector: 'app-my-returns',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-returns.component.html',
  styleUrls: ['./my-returns.component.scss']
})
export class MyReturnsComponent {
  protected readonly returns = signal<ReturnRequest[]>([
    {
      id: '1',
      returnNumber: 'RET-2024-001',
      sivNumber: 'SIV-2024-001',
      requestDate: '2024-01-20',
      status: 'Pending',
      itemCount: 2,
      returnReason: 'Damaged during use'
    },
    {
      id: '2',
      returnNumber: 'RET-2024-002',
      sivNumber: 'SIV-2024-003',
      requestDate: '2024-01-22',
      status: 'Approved',
      itemCount: 1,
      returnReason: 'Wrong item received'
    }
  ]);
}
