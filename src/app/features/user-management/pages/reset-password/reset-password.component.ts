import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WorkflowService } from '../../../../core/services/workflow.service';

@Component({
  selector: 'app-admin-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class AdminResetPasswordComponent {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private workflowService = inject(WorkflowService);

  email = signal('');
  generatedPassword = signal('');
  loading = signal(false);
  sent = signal(false);
  error = signal('');
  emailSent = signal(false);
  linkSent = signal(false);
  passwordCopied = signal(false);

  generatePassword(): string {
    const length = 14;
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  onGenerate(): void {
    this.generatedPassword.set(this.generatePassword());
    this.passwordCopied.set(false);
  }

  copyPassword(): void {
    const pwd = this.generatedPassword();
    if (!pwd) return;
    navigator.clipboard.writeText(pwd).then(() => {
      this.passwordCopied.set(true);
      setTimeout(() => this.passwordCopied.set(false), 2000);
    });
  }

  private apiBase = 'http://localhost:5028/api';

  private async postApi(path: string, body: unknown): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cannot reach API server' };
    }
  }

  sendReset(): void {
    const email = this.email().trim();
    const pwd = this.generatedPassword();

    if (!email) { this.error.set('Enter a valid email address.'); return; }
    if (!pwd) { this.onGenerate(); }

    this.loading.set(true);
    this.error.set('');
    this.sent.set(false);
    this.emailSent.set(false);
    this.linkSent.set(false);

    const finalPwd = this.generatedPassword();
    const subject = 'Your password has been reset by administrator';
    const body = `Dear User,\n\nYour account password has been reset.\n\nNew password: ${finalPwd}\n\nPlease change after logging in.\n\nBest regards,\nPAS Administration`;

    this.postApi('/Notifications/send-email', { to: email, subject, body, priority: 'High' })
      .then(r => { if (!r.success) throw new Error(r.message || 'Failed'); this.emailSent.set(true); return this.postApi('/Auth/forgot-password', { email }); })
      .then(() => { this.linkSent.set(true); this.loading.set(false); this.sent.set(true); this.workflowService.createNotification({ recipientId: '', recipientRole: 'Admin', type: 'info', title: 'Password Reset Sent', message: `Password sent to ${email}.`, actionRequired: false, actionUrl: '/admin/users' }); })
      .catch((err: Error) => { this.loading.set(false); this.error.set(err.message); });
  }

  resetForm(): void {
    this.email.set('');
    this.generatedPassword.set('');
    this.sent.set(false);
    this.error.set('');
    this.emailSent.set(false);
    this.linkSent.set(false);
    this.passwordCopied.set(false);
  }
}
