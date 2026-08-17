export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'colour'
  | 'password'
  | 'date'
  | 'image';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
}

export type FieldValue = string | number | boolean | null;

export interface GroupMeta {
  title: string;
  description: string;
}

export interface GroupDefinition {
  meta: GroupMeta;
  fields: FieldSpec[];
  defaults: Record<string, FieldValue>;
}

export interface SettingsResponse {
  group: string;
  meta: GroupMeta;
  fields: FieldSpec[];
  values: Record<string, FieldValue>;
}
