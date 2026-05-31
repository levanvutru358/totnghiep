export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export const USER_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.STAFF,
  UserRole.CUSTOMER,
];

export const isUserRole = (value: string): value is UserRole =>
  USER_ROLES.includes(value as UserRole);

/** Roles allowed to access admin dashboard API (not CUSTOMER). */
export const ADMIN_PANEL_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF];
