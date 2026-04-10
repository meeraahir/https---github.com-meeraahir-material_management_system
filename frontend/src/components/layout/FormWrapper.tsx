import type { ReactNode } from "react";

interface FormWrapperProps {
  children: ReactNode;
}

export function FormWrapper({ children }: FormWrapperProps) {
  return <div className="space-y-4">{children}</div>;
}
