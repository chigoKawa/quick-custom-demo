import type { IBaseIntegration } from '../core/types';

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'phone'
  | 'textarea' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'radio' 
  | 'number'
  | 'date'
  | 'hidden'
  | 'consent'
  | 'donation-amount'
  | 'field-group';

export interface FormFieldOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface FormFieldConditional {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty';
  value?: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  defaultValue?: string | string[] | number | boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  conditional?: FormFieldConditional;
  fields?: FormField[]; // For field-group type
  width?: 'full' | 'half' | 'third';
}

export interface Form {
  id: string;
  slug: string;
  name: string;
  title: string;
  description?: string;
  introCopy?: string;
  successMessage?: string;
  submitButtonText?: string;
  fields: FormField[];
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  submittedAt: Date;
  status?: 'pending' | 'processed' | 'failed';
}

export interface FormsFilters {
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface IFormsIntegration extends IBaseIntegration {
  getForms(filters?: FormsFilters): Promise<Form[]>;
  getForm(id: string): Promise<Form | null>;
  getFormBySlug(slug: string): Promise<Form | null>;
  createForm(form: Omit<Form, 'id'>): Promise<Form>;
  submitForm(formId: string, data: Record<string, unknown>): Promise<FormSubmission>;
  getSubmissions(formId: string): Promise<FormSubmission[]>;
}
