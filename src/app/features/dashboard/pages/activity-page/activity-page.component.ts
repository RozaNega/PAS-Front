import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Activity {
  dateTime: string;
  activity: string;
  entity: string;
  status: string;
}

export interface LoginHistory {
  dateTime: string;
  ipAddress: string;
  device: string;
  location: string;
  status: string;
}

@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-page.component.html',
  styleUrl: './activity-page.component.scss',
})
export class ActivityPageComponent {
  dateFrom = 'Dec 01, 2024';
  dateTo = 'Dec 15, 2024';
  activityType = 'All';
  entityType = 'All';

  activities: Activity[] = [
    {
      dateTime: 'Dec 15, 09:30 AM',
      activity: 'Created new request',
      entity: 'SR-2024-123',
      status: '✅',
    },
    {
      dateTime: 'Dec 14, 02:15 PM',
      activity: 'Viewed request status',
      entity: 'SR-2024-122',
      status: '👁️',
    },
    {
      dateTime: 'Dec 13, 11:00 AM',
      activity: 'Received approval',
      entity: 'SR-2024-121',
      status: '✅',
    },
    {
      dateTime: 'Dec 12, 04:30 PM',
      activity: 'Downloaded SIV',
      entity: 'SIV-045',
      status: '📥',
    },
    {
      dateTime: 'Dec 11, 10:00 AM',
      activity: 'Created new request',
      entity: 'SR-2024-120',
      status: '✅',
    },
  ];

  loginHistory: LoginHistory[] = [
    {
      dateTime: 'Dec 15, 09:30 AM',
      ipAddress: '192.168.1.100',
      device: 'Chrome/Win11',
      location: 'Office',
      status: '✅ Success',
    },
    {
      dateTime: 'Dec 14, 08:45 AM',
      ipAddress: '192.168.1.100',
      device: 'Chrome/Win11',
      location: 'Office',
      status: '✅ Success',
    },
    {
      dateTime: 'Dec 13, 09:15 AM',
      ipAddress: '10.0.0.45',
      device: 'Mobile/iOS',
      location: 'Remote',
      status: '✅ Success',
    },
  ];

  applyFilters(): void {
    console.log('Applying filters:', {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      activityType: this.activityType,
      entityType: this.entityType,
    });
  }

  export(): void {
    console.log('Exporting activity data');
  }
}
