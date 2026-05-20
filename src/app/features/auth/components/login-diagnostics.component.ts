import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-login-diagnostics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="diagnostics-panel">
      <h3>🔍 Login Diagnostics</h3>
      
      <div class="test-section">
        <h4>1. Test API Connection</h4>
        <button (click)="testApiConnection()" [disabled]="loading">
          {{ loading ? 'Testing...' : 'Test API Connection' }}
        </button>
        <div class="result" [class]="apiResult.status">{{ apiResult.message }}</div>
      </div>

      <div class="test-section">
        <h4>2. Test User Account</h4>
        <input [(ngModel)]="testUsername" placeholder="Enter username" />
        <button (click)="checkUserAccount()" [disabled]="loading || !testUsername">
          Check Account Status
        </button>
        <div class="result" [class]="userResult.status">{{ userResult.message }}</div>
      </div>

      <div class="test-section">
        <h4>3. Test Login</h4>
        <input [(ngModel)]="testUsername" placeholder="Username" />
        <input [(ngModel)]="testPassword" type="password" placeholder="Password" />
        <button (click)="testLogin()" [disabled]="loading || !testUsername || !testPassword">
          Test Login
        </button>
        <div class="result" [class]="loginResult.status">{{ loginResult.message }}</div>
      </div>

      <div class="test-section">
        <h4>4. Common Solutions</h4>
        <ul class="solutions">
          <li>✅ Check if user account is active in database</li>
          <li>✅ Verify user has assigned roles (admin, employee, manager, etc.)</li>
          <li>✅ Check if account is locked due to failed login attempts</li>
          <li>✅ Ensure backend API is running and accessible</li>
          <li>✅ Verify database connection is working</li>
          <li>✅ Check if user email is verified (if required)</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .diagnostics-panel {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
    }
    
    .test-section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    
    .test-section h4 {
      margin-top: 0;
      color: #333;
    }
    
    input {
      margin: 0.5rem;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    button {
      margin: 0.5rem;
      padding: 0.5rem 1rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .result {
      margin-top: 1rem;
      padding: 0.5rem;
      border-radius: 4px;
    }
    
    .result.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .result.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .result.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    
    .solutions {
      list-style-type: none;
      padding: 0;
    }
    
    .solutions li {
      padding: 0.25rem 0;
      color: #666;
    }
  `]
})
export class LoginDiagnosticsComponent {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);

  loading = false;
  testUsername = '';
  testPassword = '';

  apiResult = { status: '', message: '' };
  userResult = { status: '', message: '' };
  loginResult = { status: '', message: '' };

  async testApiConnection() {
    this.loading = true;
    this.apiResult = { status: 'info', message: 'Testing API connection...' };

    try {
      // Test a simple API endpoint
      const response = await this.apiService.get('health').toPromise();
      this.apiResult = { 
        status: 'success', 
        message: '✅ API connection successful' 
      };
    } catch (error: any) {
      this.apiResult = { 
        status: 'error', 
        message: `❌ API connection failed: ${error.message || 'Unknown error'}` 
      };
    } finally {
      this.loading = false;
    }
  }

  async checkUserAccount() {
    this.loading = true;
    this.userResult = { status: 'info', message: 'Checking user account...' };

    try {
      // Try to get user info
      const response = await this.apiService.get(`Users/${this.testUsername}`).toPromise();
      this.userResult = { 
        status: 'success', 
        message: `✅ User found: ${JSON.stringify(response, null, 2)}` 
      };
    } catch (error: any) {
      if (error.status === 404) {
        this.userResult = { 
          status: 'error', 
          message: '❌ User not found in database' 
        };
      } else {
        this.userResult = { 
          status: 'error', 
          message: `❌ Error checking user: ${error.message || 'Unknown error'}` 
        };
      }
    } finally {
      this.loading = false;
    }
  }

  async testLogin() {
    this.loading = true;
    this.loginResult = { status: 'info', message: 'Testing login...' };

    try {
      const result = await this.authService.login({
        username: this.testUsername,
        password: this.testPassword
      }).toPromise();

      if (result?.succeeded) {
        this.loginResult = { 
          status: 'success', 
          message: `✅ Login successful! User: ${result.user.username}, Roles: ${result.user.roles.join(', ')}` 
        };
      } else {
        this.loginResult = { 
          status: 'error', 
          message: `❌ Login failed: ${result?.errors?.join(', ') || 'Unknown error'}` 
        };
      }
    } catch (error: any) {
      this.loginResult = { 
        status: 'error', 
        message: `❌ Login error: ${error.error?.message || error.message || 'Unknown error'}` 
      };
    } finally {
      this.loading = false;
    }
  }
}