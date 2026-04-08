import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export interface TableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
  sortValue?: (row: T) => boolean | number | string | null;
}

export interface TableAction<T> {
  label: string;
  onClick: (row: T) => void;
  variant?: "primary" | "secondary" | "ghost";
}

export type FormFieldKind =
  | "text"
  | "email"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "checkbox";

export interface FormOption {
  label: string;
  value: number | string;
}

interface BaseFieldConfig<TFormValues> {
  description?: string;
  label: string;
  name: keyof TFormValues & string;
  placeholder?: string;
  required?: boolean;
  wrapperClassName?: string;
}

export interface TextFieldConfig<TFormValues> extends BaseFieldConfig<TFormValues> {
  kind: "text" | "email" | "number" | "date";
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  pattern?: string;
  step?: number;
  valueType?: "number" | "string";
}

export interface SelectFieldConfig<TFormValues> extends BaseFieldConfig<TFormValues> {
  kind: "select";
  options: FormOption[];
  valueType?: "number" | "string";
}

export interface TextareaFieldConfig<TFormValues>
  extends BaseFieldConfig<TFormValues> {
  kind: "textarea";
  rows?: number;
}

export interface CheckboxFieldConfig<TFormValues>
  extends BaseFieldConfig<TFormValues> {
  kind: "checkbox";
}

export type FormFieldConfig<TFormValues> =
  | TextFieldConfig<TFormValues>
  | SelectFieldConfig<TFormValues>
  | TextareaFieldConfig<TFormValues>
  | CheckboxFieldConfig<TFormValues>;
