export interface MenuItem {
  label: string;
  icon: string;
  routerLink: string;
  /** Reserved for BO-B03 — filled in when PermissionsService lands in D08. */
  permission?: string;
}

export interface MenuGroup {
  label: string;
  items: readonly MenuItem[];
}
