import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TrackRequestModalComponent } from '../../components/track-request-modal/track-request-modal.component';

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
  private modalService = inject(NgbModal);

  dateFrom = 'Dec 01, 2024';
  dateTo = 'Dec 15, 2024';
  activityType = 'All ▼';
  entityType = 'All ▼';

  allActivities: Activity[] = [
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

  activities: Activity[] = [...this.allActivities];

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
    let filtered = [...this.allActivities];
    
    // Filter by Activity Type
    if (this.activityType && !this.activityType.includes('All')) {
      filtered = filtered.filter(a => a.activity.includes(this.activityType) || a.activity.startsWith(this.activityType));
    }

    // Filter by Entity Type
    if (this.entityType && !this.entityType.includes('All')) {
      filtered = filtered.filter(a => a.entity.startsWith(this.entityType));
    }

    this.activities = filtered;
  }

  export(): void {
    const headers = ['Date/Time', 'Activity', 'Entity', 'Status'];
    const csvContent = [
      headers.join(','),
      ...this.activities.map(a => `"${a.dateTime}","${a.activity}","${a.entity}","${a.status}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'my_activity_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewActivity(activity: Activity): void {
    if (activity.entity.startsWith('SR-')) {
      const modalRef = this.modalService.open(TrackRequestModalComponent, {
        fullscreen: true,
        backdrop: 'static',
        windowClass: 'track-request-fullscreen-modal'
      });
      modalRef.componentInstance.srNumber = activity.entity;
      modalRef.componentInstance.status = 'Pending Approval';
    } else {
      alert(`Viewing details for ${activity.entity}`);
    }
  }
}
