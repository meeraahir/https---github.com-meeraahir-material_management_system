import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { DefaultValues, FieldValues, Path } from "react-hook-form";
import type { z } from "zod";

import type { FormFieldConfig } from "../../types/ui.types";
import { getErrorMessage } from "../../utils/apiError";
import { createZodResolver } from "../../utils/zodResolver";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../modal/Modal";
import { FormWrapper } from "../layout/FormWrapper";
import { FormError } from "../ui/FormError";

interface EntityFormModalProps<TFormValues extends FieldValues> {
  defaultValues: TFormValues;
  description: string;
  fields: FormFieldConfig<TFormValues>[];
  onClose: () => void;
  onSubmit: (values: TFormValues) => Promise<void>;
  open: boolean;
  schema: z.ZodType<TFormValues>;
  title: string;
}

export function EntityFormModal<TFormValues extends FieldValues>({
  defaultValues,
  fields,
  onClose,
  onSubmit,
  open,
  schema,
  title,
}: EntityFormModalProps<TFormValues>) {
  const [formError, setFormError] = useState("");
  const formId = title.toLowerCase().replaceAll(" ", "-");
  const handleClose = () => {
    setFormError("");
    onClose();
  };
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
  } = useForm<TFormValues>({
    defaultValues: defaultValues as DefaultValues<TFormValues>,
    mode: "onChange",
    resolver: createZodResolver(schema),
  });

  const watchedValues = useWatch({ control }) as Partial<TFormValues>;

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [defaultValues, open, reset]);

  return (
    <Modal
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-600">
            {isValid
              ? "Ready to save. Please review the details once before submitting."
              : "Complete required fields and fix highlighted errors to enable Save."}
          </p>
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              isLoading={isSubmitting}
              type="submit"
              form={formId}
            >
              Save
            </Button>
          </div>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="xl"
      title={title}
    >
      <FormWrapper>
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-blue-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-blue-700">
          Fields marked with <span className="font-semibold">*</span> are required. Optional fields can be left blank safely.
        </div>
        <form
          className="grid gap-4 md:grid-cols-2"
          id={formId}
          onSubmit={handleSubmit(async (values) => {
            try {
              setFormError("");
              await onSubmit(values as TFormValues);
            } catch (error) {
              setFormError(getErrorMessage(error));
            }
          })}
        >
          {fields.map((field) => {
            const errorMessage = errors[field.name]?.message;
            const sharedKey = `${field.name}-${field.kind}`;

            const fieldDisabled =
              typeof field.disabled === "function"
                ? field.disabled(watchedValues)
                : (field.disabled ?? false);

            if (field.kind === "textarea") {
              return (
                <div
                  className={field.wrapperClassName ?? "md:col-span-2"}
                  key={sharedKey}
                >
                  <Textarea
                    description={field.description}
                    disabled={fieldDisabled}
                    error={
                      typeof errorMessage === "string"
                        ? errorMessage
                        : undefined
                    }
                    label={field.label}
                    placeholder={field.placeholder}
                    requiredIndicator={field.required}
                    rows={field.rows ?? 4}
                    {...register(field.name as Path<TFormValues>)}
                  />
                </div>
              );
            }

            if (field.kind === "select") {
              return (
                <div className={field.wrapperClassName} key={sharedKey}>
                  <Select
                    description={field.description}
                    disabled={fieldDisabled}
                    error={
                      typeof errorMessage === "string"
                        ? errorMessage
                        : undefined
                    }
                    label={field.label}
                    options={field.options}
                    placeholder={field.placeholder}
                    requiredIndicator={field.required}
                    {...register(field.name as Path<TFormValues>, {
                      setValueAs:
                        field.valueType === "number"
                          ? (value) => (value === "" ? 0 : Number(value))
                          : undefined,
                    })}
                  />
                </div>
              );
            }

            if (field.kind === "checkbox") {
              return (
                <label
                  className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm dark:border-blue-100 dark:bg-blue-50/50 dark:text-slate-700"
                  key={sharedKey}
                >
                  <span>
                    <span className="block font-semibold">{field.label}</span>
                    {field.description ? (
                        <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-500">
                        {field.description}
                      </span>
                    ) : null}
                  </span>
                  <input
                    className="h-5 w-5 rounded border-blue-200 text-blue-600 focus:ring-blue-500 dark:border-blue-200"
                    disabled={fieldDisabled}
                    type="checkbox"
                    {...register(field.name as Path<TFormValues>)}
                  />
                </label>
              );
            }

            return (
              <div className={field.wrapperClassName} key={sharedKey}>
                <Input
                  description={field.description}
                  disabled={fieldDisabled}
                  error={
                    typeof errorMessage === "string" ? errorMessage : undefined
                  }
                  inputMode={
                    field.kind !== "number" ? field.inputMode : undefined
                  }
                  label={field.label}
                  max={
                    field.kind === "number" || field.kind === "date"
                      ? field.max
                      : undefined
                  }
                  maxLength={
                    field.kind !== "number" ? field.maxLength : undefined
                  }
                  min={
                    field.kind === "number" || field.kind === "date"
                      ? field.min
                      : undefined
                  }
                  minLength={
                    field.kind !== "number" ? field.minLength : undefined
                  }
                  pattern={field.kind !== "date" ? field.pattern : undefined}
                  placeholder={field.placeholder}
                  requiredIndicator={field.required}
                  step={field.kind === "number" ? field.step : undefined}
                  type={field.kind}
                  {...register(field.name as Path<TFormValues>, {
                    onChange: field.digitsOnly
                      ? (event) => {
                          const sanitizedValue = String(
                            event.target.value ?? "",
                          )
                            .replaceAll(/\D/g, "")
                            .slice(
                              0,
                              field.maxLength ?? Number.MAX_SAFE_INTEGER,
                            );
                          event.target.value = sanitizedValue;
                        }
                      : undefined,
                    setValueAs:
                      field.kind === "number" || field.valueType === "number"
                        ? (value) => (value === "" ? 0 : Number(value))
                        : undefined,
                  })}
                />
              </div>
            );
          })}
          <div className="md:col-span-2">
            <FormError message={formError} />
          </div>
        </form>
      </FormWrapper>
    </Modal>
  );
}
