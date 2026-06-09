import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AFROCOM_APPROVAL_RULES,
  AFROCOM_NOTIFICATION_RULES,
  AFROCOM_PERMISSION_MATRIX,
  AFROCOM_ROLE_DEFINITIONS,
  AFROCOM_WORKFLOW_SCENARIOS,
  AfrocomPermissionRow,
} from '../../../core/constants/afrocom-workflow-policy.const';

type MatrixColumn = {
  label: string;
  key: keyof Pick<
    AfrocomPermissionRow,
    'admin' | 'manager' | 'storekeeper' | 'employee' | 'compliance'
  >;
};

@Component({
  selector: 'app-role-workflow-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-workflow-guide.component.html',
  styleUrl: './role-workflow-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleWorkflowGuideComponent {
  readonly roles = AFROCOM_ROLE_DEFINITIONS;
  readonly permissionMatrix = AFROCOM_PERMISSION_MATRIX;
  readonly workflowScenarios = AFROCOM_WORKFLOW_SCENARIOS;
  readonly notificationRules = AFROCOM_NOTIFICATION_RULES;
  readonly approvalRules = AFROCOM_APPROVAL_RULES;

  readonly matrixColumns: readonly MatrixColumn[] = [
    { label: 'Admin', key: 'admin' },
    { label: 'Manager', key: 'manager' },
    { label: 'Storekeeper', key: 'storekeeper' },
    { label: 'Employee', key: 'employee' },
    { label: 'Compliance', key: 'compliance' },
  ];

  permissionTone(value: string): string {
    const normalized = value.toLowerCase();
    if (normalized === 'no') {
      return 'blocked';
    }
    if (normalized.includes('view') || normalized.includes('audit') || normalized.includes('dept')) {
      return 'limited';
    }
    return 'allowed';
  }

  priorityTone(priority: string): string {
    return priority.toLowerCase();
  }
}
