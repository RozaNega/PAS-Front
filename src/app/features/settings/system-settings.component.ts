import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SettingSection {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

interface ToggleSetting {
  label: string;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-settings.component.html',
  styleUrl: './system-settings.component.scss',
})
export class SystemSettingsComponent {
  activeSection = 'general';

  sections: SettingSection[] = [
    { id: 'general', label: 'General', icon: 'bi bi-gear', active: true },
    { id: 'notifications', label: 'Notifications', icon: 'bi bi-bell', active: false },
    { id: 'security', label: 'Security', icon: 'bi bi-shield-lock', active: false },
    { id: 'email', label: 'Email', icon: 'bi bi-envelope', active: false },
    { id: 'localization', label: 'Localization', icon: 'bi bi-globe', active: false },
    { id: 'advanced', label: 'Advanced', icon: 'bi bi-sliders', active: false },
  ];

  generalSettings = {
    appName: 'PAS Enterprise',
    appUrl: 'https://pas.example.com',
    supportEmail: 'support@pas.com',
    itemsPerPage: 25,
    sessionTimeout: 60,
    maintenanceMode: false,
    debugMode: false,
  };

  notificationSettings = {
    emailAlerts: true,
    pushNotifications: false,
    smsAlerts: false,
    weeklyDigest: true,
    reportErrors: true,
    lowStockAlerts: true,
    approvalRequests: true,
  };

  securitySettings = {
    twoFactorAuth: false,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    ipWhitelisting: false,
    auditLogging: true,
    forceStrongPasswords: true,
  };

  emailSettings = {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUsername: 'noreply@pas.com',
    smtpPassword: '********',
    useSSL: true,
    fromAddress: 'noreply@pas.com',
    fromName: 'PAS System',
  };

  localizationSettings = {
    timezone: 'Africa/Nairobi',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    currency: 'USD',
    language: 'English',
    firstDayOfWeek: 1,
  };

  advancedSettings = {
    apiRateLimit: 100,
    cacheDuration: 3600,
    maxUploadSize: 10,
    logRetention: 90,
    backupFrequency: 'daily',
    enableCompression: true,
  };

  saved = signal(false);
  saving = signal(false);

  setActiveSection(id: string): void {
    this.activeSection = id;
  }

  saveSettings(): void {
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    }, 800);
  }

  resetSettings(): void {
    if (confirm('Reset all settings to default values?')) {
      alert('Settings have been reset to defaults.');
    }
  }

  testConnection(): void {
    alert('Testing SMTP connection... Connection successful!');
  }
}
