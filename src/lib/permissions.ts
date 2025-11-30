import { UserRoleType } from '@/types';

// Define all possible actions in the system
export type Permission =
  // Patient/Client Management
  | 'patient:register'
  | 'patient:view'
  | 'patient:edit'
  // Vitals
  | 'vitals:record'
  | 'vitals:view'
  | 'vitals:edit'
  // Doctor Assessment
  | 'assessment:create'
  | 'assessment:view'
  | 'assessment:edit'
  // Lab Tests (Diabetes, PSA)
  | 'lab:diabetes:create'
  | 'lab:diabetes:view'
  | 'lab:psa:create'
  | 'lab:psa:view'
  // Pathway Screenings
  | 'screening:hypertension:create'
  | 'screening:hypertension:view'
  | 'screening:cervical:create'
  | 'screening:cervical:view'
  | 'screening:breast:create'
  | 'screening:breast:view'
  // Screening Management
  | 'screening:create'
  | 'screening:view'
  | 'screening:route'
  | 'screening:complete'
  // Appointments
  | 'appointment:create'
  | 'appointment:view'
  | 'appointment:edit'
  // Admin-only
  | 'staff:manage'
  | 'facility:manage'
  | 'system:admin';

// Role-based permission mapping
const rolePermissions: Record<UserRoleType, Permission[]> = {
  admin: [
    // Admin has all permissions
    'patient:register',
    'patient:view',
    'patient:edit',
    'vitals:record',
    'vitals:view',
    'vitals:edit',
    'assessment:create',
    'assessment:view',
    'assessment:edit',
    'lab:diabetes:create',
    'lab:diabetes:view',
    'lab:psa:create',
    'lab:psa:view',
    'screening:hypertension:create',
    'screening:hypertension:view',
    'screening:cervical:create',
    'screening:cervical:view',
    'screening:breast:create',
    'screening:breast:view',
    'screening:create',
    'screening:view',
    'screening:route',
    'screening:complete',
    'appointment:create',
    'appointment:view',
    'appointment:edit',
    'staff:manage',
    'facility:manage',
    'system:admin',
  ],

  him_officer: [
    // HIM Officers: Patient registration and routing
    'patient:register',
    'patient:view',
    'patient:edit',
    'screening:create',
    'screening:view',
    'screening:route',
    'appointment:create',
    'appointment:view',
    'appointment:edit',
    // Can view but not edit clinical data
    'vitals:view',
    'assessment:view',
    'lab:diabetes:view',
    'lab:psa:view',
    'screening:hypertension:view',
    'screening:cervical:view',
    'screening:breast:view',
  ],

  nurse: [
    // Nurses: Vitals recording and patient care
    'patient:view',
    'vitals:record',
    'vitals:view',
    'vitals:edit',
    'screening:view',
    'appointment:view',
    // Can view but not create clinical assessments
    'assessment:view',
    'lab:diabetes:view',
    'lab:psa:view',
    'screening:hypertension:view',
    'screening:cervical:view',
    'screening:breast:view',
    // Nurses can perform cervical screening
    'screening:cervical:create',
  ],

  doctor: [
    // Doctors: Clinical assessments and all viewing
    'patient:view',
    'vitals:view',
    'vitals:record', // Doctors can also record vitals if needed
    'vitals:edit',
    'assessment:create',
    'assessment:view',
    'assessment:edit',
    'screening:view',
    'screening:complete',
    'appointment:create',
    'appointment:view',
    'appointment:edit',
    // Can view all screening types
    'lab:diabetes:view',
    'lab:psa:view',
    'screening:hypertension:view',
    'screening:cervical:view',
    'screening:breast:view',
    // Doctors can perform breast screening (clinical exam)
    'screening:breast:create',
  ],

  mls: [
    // Medical Lab Scientists: Lab tests
    'patient:view',
    'vitals:view',
    'screening:view',
    // Lab test permissions
    'lab:diabetes:create',
    'lab:diabetes:view',
    'lab:psa:create',
    'lab:psa:view',
    // Can view other screening data
    'assessment:view',
    'screening:hypertension:view',
    'screening:cervical:view',
    'screening:breast:view',
    'appointment:view',
  ],

  cho: [
    // Community Health Officers: Vitals and hypertension screening
    'patient:view',
    'vitals:record',
    'vitals:view',
    'vitals:edit',
    'screening:view',
    // CHO can perform hypertension screening
    'screening:hypertension:create',
    'screening:hypertension:view',
    // Can view other screening data
    'assessment:view',
    'lab:diabetes:view',
    'lab:psa:view',
    'screening:cervical:view',
    'screening:breast:view',
    'appointment:view',
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRoleType | undefined, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRoleType | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRoleType | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
}

// Get all permissions for a role
export function getPermissions(role: UserRoleType | undefined): Permission[] {
  if (!role) return [];
  return rolePermissions[role] ?? [];
}

// Check if role is clinical (non-admin)
export function isClinicalRole(role: UserRoleType | undefined): boolean {
  if (!role) return false;
  return ['him_officer', 'nurse', 'doctor', 'mls', 'cho'].includes(role);
}

// Get role display name
export function getRoleDisplayName(role: UserRoleType | undefined): string {
  const displayNames: Record<UserRoleType, string> = {
    admin: 'Administrator',
    him_officer: 'HIM Officer',
    nurse: 'Nurse',
    doctor: 'Doctor',
    mls: 'Medical Lab Scientist',
    cho: 'Community Health Officer',
  };
  return role ? displayNames[role] : 'Unknown';
}

// Get role color (for UI badges)
export function getRoleColor(role: UserRoleType | undefined): string {
  const colors: Record<UserRoleType, string> = {
    admin: 'bg-purple-100 text-purple-700',
    him_officer: 'bg-indigo-100 text-indigo-700',
    nurse: 'bg-teal-100 text-teal-700',
    doctor: 'bg-blue-100 text-blue-700',
    mls: 'bg-orange-100 text-orange-700',
    cho: 'bg-green-100 text-green-700',
  };
  return role ? colors[role] : 'bg-gray-100 text-gray-700';
}

// Get action buttons to show based on screening type and user role
export interface ActionButton {
  id: string;
  label: string;
  icon: string;
  color: string;
  permission: Permission;
}

export function getScreeningActions(
  screeningType: string,
  screeningStatus: string,
  role: UserRoleType | undefined
): ActionButton[] {
  const allActions: ActionButton[] = [];

  // Always available actions based on status
  if (screeningStatus === 'pending' || screeningStatus === 'in_progress') {
    // Record Vitals - available if vitals not yet recorded
    allActions.push({
      id: 'vitals',
      label: 'Record Vitals',
      icon: 'heart',
      color: 'teal',
      permission: 'vitals:record',
    });
  }

  // Screening type specific actions - available for pending and in_progress
  if (screeningStatus === 'pending' || screeningStatus === 'in_progress') {
    switch (screeningType.toLowerCase()) {
      case 'hypertension screening':
        allActions.push({
          id: 'hypertension',
          label: 'BP Screening',
          icon: 'activity',
          color: 'red',
          permission: 'screening:hypertension:create',
        });
        break;
      case 'diabetes screening':
        allActions.push({
          id: 'diabetes',
          label: 'Blood Sugar Test',
          icon: 'flask',
          color: 'orange',
          permission: 'lab:diabetes:create',
        });
        break;
      case 'cervical cancer screening':
        allActions.push({
          id: 'cervical',
          label: 'Cervical Screening',
          icon: 'clipboard',
          color: 'pink',
          permission: 'screening:cervical:create',
        });
        break;
      case 'breast cancer screening':
        allActions.push({
          id: 'breast',
          label: 'Breast Exam',
          icon: 'search',
          color: 'rose',
          permission: 'screening:breast:create',
        });
        break;
      case 'prostate cancer screening':
      case 'psa screening':
        allActions.push({
          id: 'psa',
          label: 'PSA Test',
          icon: 'flask',
          color: 'blue',
          permission: 'lab:psa:create',
        });
        break;
    }
  }

  // Doctor assessment - available after vitals for all screening types
  if (screeningStatus === 'in_progress') {
    allActions.push({
      id: 'assessment',
      label: 'Doctor Assessment',
      icon: 'stethoscope',
      color: 'indigo',
      permission: 'assessment:create',
    });
  }

  // Filter by role permissions
  return allActions.filter(action => hasPermission(role, action.permission));
}
