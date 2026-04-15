import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import type { RegisterFormValues } from "../../types/auth.types";
import { getErrorMessage } from "../../utils/apiError";

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters."),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [formError, setFormError] = useState("");

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterFormValues>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    const parsedValues = registerSchema.safeParse(values);
    if (!parsedValues.success) {
      const fieldErrors = parsedValues.error.flatten().fieldErrors;

      if (fieldErrors.username?.[0]) {
        setError("username", {
          message: fieldErrors.username[0],
          type: "manual",
        });
      }

      if (fieldErrors.email?.[0]) {
        setError("email", { message: fieldErrors.email[0], type: "manual" });
      }

      if (fieldErrors.password?.[0]) {
        setError("password", {
          message: fieldErrors.password[0],
          type: "manual",
        });
      }

      if (fieldErrors.confirmPassword?.[0]) {
        setError("confirmPassword", {
          message: fieldErrors.confirmPassword[0],
          type: "manual",
        });
      }

      return;
    }

    try {
      await registerUser(
        parsedValues.data.username,
        parsedValues.data.email,
        parsedValues.data.password,
      );

      navigate("/login", {
        replace: true,
        state: {
          registered: true,
          username: parsedValues.data.username,
        },
      });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-[#FFF1EC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#C2410C]">
          New Workspace Access
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-slate-950">
            Create your ERP account
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Register a secure account to start using the Material Management
            System frontend.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <Input
          autoComplete="username"
          error={errors.username?.message}
          label="Username"
          placeholder="Choose a username"
          {...register("username")}
        />

        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="Enter your email"
          type="email"
          {...register("email")}
        />

        <Input
          autoComplete="new-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Create a password"
          type="password"
          {...register("password")}
        />

        <Input
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirm Password"
          placeholder="Re-enter your password"
          type="password"
          {...register("confirmPassword")}
        />

        <FormError message={formError} />

        <Button className="w-full" isLoading={isSubmitting} size="lg" type="submit">
          Create Account
        </Button>
      </form>

      <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-sm text-slate-600">
        <span>Already have access?</span>
        <Link
          className="font-semibold text-[#FF6B4A] transition hover:text-[#E85B3D]"
          to="/login"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
