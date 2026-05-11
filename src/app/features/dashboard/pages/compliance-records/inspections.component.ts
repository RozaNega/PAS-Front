import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Inspection {
  id: string;
  inspectionNumber: string;
  receivingNoteNumber: string;
  inspectionDate: string;
  inspector: string;
  status: 'Pending' | 'Passed' | 'Failed';
  itemsInspected: number;
  itemsPassed: number;
  itemsFailed: number;
}

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inspections.component.html',
  styleUrls: ['./inspections.component.scss']
})
export class InspectionsComponent {
  protected readonly inspections = signal<Inspection[]>([
    { id: '1', inspectionNumber: 'INS-2024-001', receivingNoteNumber: 'GRN-2024-001', inspectionDate: '2024-01-20', inspector: 'Inspector A', status: 'Passed', itemsInspected: 50, itemsPassed: 48, itemsFailed: 2 }
  ]);
}
