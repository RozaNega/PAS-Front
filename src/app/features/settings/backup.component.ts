import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BackupRecord {
  id: number;
  name: string;
  date: string;
  size: string;
  type: string;
  status: 'success' | 'failed' | 'in-progress';
}

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backup.component.html',
  styleUrl: './backup.component.scss',
})
export class BackupComponent {
  creating = signal(false);
  restoring = signal<number | null>(null);
  deleting = signal<number | null>(null);

  backupStats = {
    lastBackup: 'Today at 2:00 AM',
    databaseSize: '2.4 GB',
    totalBackups: 24,
    storageUsed: '57.6 GB',
    nextScheduled: 'Tomorrow at 2:00 AM',
    healthStatus: 'Healthy',
  };

  backupHistory: BackupRecord[] = [
    { id: 1, name: 'PAS_FullBackup_2026-06-01', date: 'Jun 1, 2026 • 2:00 AM', size: '2.4 GB', type: 'Full', status: 'success' },
    { id: 2, name: 'PAS_Incremental_2026-05-31', date: 'May 31, 2026 • 2:00 AM', size: '1.1 GB', type: 'Incremental', status: 'success' },
    { id: 3, name: 'PAS_FullBackup_2026-05-30', date: 'May 30, 2026 • 2:00 AM', size: '2.3 GB', type: 'Full', status: 'success' },
    { id: 4, name: 'PAS_Incremental_2026-05-29', date: 'May 29, 2026 • 2:00 AM', size: '0.9 GB', type: 'Incremental', status: 'failed' },
    { id: 5, name: 'PAS_FullBackup_2026-05-28', date: 'May 28, 2026 • 2:00 AM', size: '2.3 GB', type: 'Full', status: 'success' },
    { id: 6, name: 'PAS_Incremental_2026-05-27', date: 'May 27, 2026 • 2:00 AM', size: '1.0 GB', type: 'Incremental', status: 'success' },
  ];

  scheduleConfig = {
    frequency: 'daily',
    time: '02:00',
    retention: 30,
    compression: true,
    location: 'local',
    includeLogs: true,
    includeDatabase: true,
    includeUploads: false,
  };

  createBackup(): void {
    this.creating.set(true);
    setTimeout(() => {
      this.creating.set(false);
      const now = new Date();
      const newBackup: BackupRecord = {
        id: Date.now(),
        name: `PAS_FullBackup_${now.toISOString().slice(0, 10)}`,
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` • ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        size: '2.4 GB',
        type: 'Full',
        status: 'success',
      };
      this.backupHistory.unshift(newBackup);
      this.backupStats.lastBackup = 'Just now';
      this.backupStats.totalBackups++;
      alert('Backup created successfully!');
    }, 2000);
  }

  restoreBackup(id: number): void {
    if (confirm('Restoring a backup will overwrite current data. Continue?')) {
      this.restoring.set(id);
      setTimeout(() => {
        this.restoring.set(null);
        alert('Backup restored successfully!');
      }, 3000);
    }
  }

  deleteBackup(id: number): void {
    if (confirm('Are you sure you want to delete this backup?')) {
      this.deleting.set(id);
      setTimeout(() => {
        this.backupHistory = this.backupHistory.filter(b => b.id !== id);
        this.deleting.set(null);
        this.backupStats.totalBackups--;
        alert('Backup deleted successfully.');
      }, 500);
    }
  }

  saveSchedule(): void {
    alert('Backup schedule saved successfully!');
  }

  downloadBackup(id: number): void {
    const backup = this.backupHistory.find(b => b.id === id);
    if (backup) {
      alert(`Downloading ${backup.name}...`);
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      case 'in-progress': return 'In Progress';
      default: return status;
    }
  }
}
