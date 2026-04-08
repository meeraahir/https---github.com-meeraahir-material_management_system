import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import type { LoginFormValues } from "../../types/auth.types";
import { getErrorMessage } from "../../utils/apiError";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email or username is required.")
    .refine(
      (value) =>
        value.includes("@")
          ? z.string().email().safeParse(value).success
          : value.length >= 3,
      "Enter a valid email or username.",
    ),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

interface LoginLocationState {
  registered?: boolean;
  username?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formError, setFormError] = useState("");

  const state = (location.state as LoginLocationState | null) ?? null;

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    const parsedValues = loginSchema.safeParse(values);
    if (!parsedValues.success) {
      const fieldErrors = parsedValues.error.flatten().fieldErrors;

      if (fieldErrors.email?.[0]) {
        setError("email", { message: fieldErrors.email[0], type: "manual" });
      }

      if (fieldErrors.password?.[0]) {
        setError("password", {
          message: fieldErrors.password[0],
          type: "manual",
        });
      }

      return;
    }

    try {
      await login(parsedValues.data.email, parsedValues.data.password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
          Secure Sign In
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-slate-950 dark:text-white">
            Access your ERP workspace
          </h2>
          <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
            Sign in to manage sites, stock movement, vendor transactions, and
            labour operations from a single dashboard.
          </p>
        </div>
      </div>

      {state?.registered ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          Registration completed for{" "}
          <span className="font-semibold">{state.username ?? "your account"}</span>.
          You can sign in now.
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={onSubmit}>
        <Input
          autoComplete="username"
          error={errors.email?.message}
          label="Email or Username"
          placeholder="Enter your email or username"
          {...register("email")}
        />

        <Input
          autoComplete="current-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Enter your password"
          type="password"
          {...register("password")}
        />

        <FormError message={formError} />

        <Button className="w-full" isLoading={isSubmitting} size="lg" type="submit">
          Sign In
        </Button>
      </form>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <span>Need a new account?</span>
        <Link
          className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          to="/register"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
