import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  description,
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
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<TFormValues>({
    defaultValues: defaultValues as DefaultValues<TFormValues>,
    resolver: createZodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [defaultValues, open, reset]);

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button isLoading={isSubmitting} type="submit" form={formId}>
            Save
          </Button>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="lg"
      title={title}
    >
      <FormWrapper description={description} title={title}>
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

            if (field.kind === "textarea") {
              return (
                <div className="md:col-span-2" key={sharedKey}>
                  <Textarea
                    error={typeof errorMessage === "string" ? errorMessage : undefined}
                    label={field.label}
                    placeholder={field.placeholder}
                    rows={field.rows ?? 4}
                    {...register(field.name as Path<TFormValues>)}
                  />
                </div>
              );
            }

            if (field.kind === "select") {
              return (
                <Select
                  error={typeof errorMessage === "string" ? errorMessage : undefined}
                  key={sharedKey}
                  label={field.label}
                  options={field.options}
                  {...register(field.name as Path<TFormValues>, {
                    setValueAs:
                      field.valueType === "number"
                        ? (value) => (value === "" ? 0 : Number(value))
                        : undefined,
                  })}
                />
              );
            }

            if (field.kind === "checkbox") {
              return (
                <label
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  key={sharedKey}
                >
                  <input
                    className="h-4 w-4"
                    type="checkbox"
                    {...register(field.name as Path<TFormValues>)}
                  />
                  <span>{field.label}</span>
                </label>
              );
            }

            return (
              <Input
                error={typeof errorMessage === "string" ? errorMessage : undefined}
                key={sharedKey}
                label={field.label}
                min={field.kind === "number" ? field.min : undefined}
                placeholder={field.placeholder}
                step={field.kind === "number" ? field.step : undefined}
                type={field.kind}
                {...register(field.name as Path<TFormValues>, {
                  setValueAs:
                    field.kind === "number" || field.valueType === "number"
                      ? (value) => (value === "" ? 0 : Number(value))
                      : undefined,
                })}
              />
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
