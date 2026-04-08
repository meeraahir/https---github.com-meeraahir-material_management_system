import type { ReactNode } from "react";

interface FormWrapperProps {
  children: ReactNode;
  description?: string;
  title: string;
}

export function FormWrapper({ children, description, title }: FormWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-100">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
