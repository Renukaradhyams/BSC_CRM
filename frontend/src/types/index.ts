export type Role = 'super_admin' | 'admin' | 'crm_manager' | 'crm_staff' | 'purchase_manager' | 'telecaller' | 'vm' | 'pm' | 'hr';

export interface User {
  name: string;
  email: string;
  role: Role;
  sectionsAssigned: string;
}

export interface CompanySettings {
  companyName: string;
  companyLogoUrl?: string | null;
  operatingStart: string;
  operatingEnd: string;
  graceMin: number;
  editCutoff: string;
}

export interface SectionInput {
  name: string;
  type: 'sales' | 'non_sales';
  manager_name?: string;
  manager_email?: string;
}

export interface CompanyInput {
  name: string;
  logo_url?: string;
  op_start: string;
  op_end: string;
  grace_min: string;
  edit_cutoff: string;
}

export interface AdminInput {
  name: string;
  email: string;
  password?: string;
}
