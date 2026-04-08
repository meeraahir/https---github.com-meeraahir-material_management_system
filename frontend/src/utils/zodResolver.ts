import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import { z } from "zod";

export function createZodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return {
        errors: {},
        values: result.data,
      };
    }

    const errors: Record<string, { message: string; type: string }> = {};

    for (const issue of result.error.issues) {
      const fieldPath = issue.path.join(".");

      if (!fieldPath || errors[fieldPath]) {
        continue;
      }

      errors[fieldPath] = {
        message: issue.message,
        type: issue.code,
      };
    }

    return {
      errors: errors as FieldErrors<TFieldValues>,
      values: {} as never,
    };
  };
}
