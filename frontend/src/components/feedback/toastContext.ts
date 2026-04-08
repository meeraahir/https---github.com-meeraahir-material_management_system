import { createContext } from "react";

export interface ToastContextValue {
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
