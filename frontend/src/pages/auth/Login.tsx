import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import type { ForgotPasswordFormValues, LoginFormValues } from "../../types/auth.types";
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

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address."),
    newPassword: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

interface LoginLocationState {
  registered?: boolean;
  username?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

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
  const {
    formState: { errors: forgotPasswordErrors, isSubmitting: isForgotPasswordSubmitting },
    handleSubmit: handleForgotPasswordSubmit,
    register: registerForgotPassword,
    reset: resetForgotPasswordForm,
    setError: setForgotPasswordFieldError,
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      newPassword: "",
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

  const onForgotPasswordSubmit = handleForgotPasswordSubmit(async (values) => {
    setForgotPasswordError("");

    const parsedValues = forgotPasswordSchema.safeParse(values);
    if (!parsedValues.success) {
      const fieldErrors = parsedValues.error.flatten().fieldErrors;

      if (fieldErrors.email?.[0]) {
        setForgotPasswordFieldError("email", {
          message: fieldErrors.email[0],
          type: "manual",
        });
      }

      if (fieldErrors.newPassword?.[0]) {
        setForgotPasswordFieldError("newPassword", {
          message: fieldErrors.newPassword[0],
          type: "manual",
        });
      }

      if (fieldErrors.confirmPassword?.[0]) {
        setForgotPasswordFieldError("confirmPassword", {
          message: fieldErrors.confirmPassword[0],
          type: "manual",
        });
      }

      return;
    }

    try {
      await authService.forgotPassword(
        parsedValues.data.email,
        parsedValues.data.newPassword,
        parsedValues.data.confirmPassword,
      );
      setIsForgotPasswordOpen(false);
      resetForgotPasswordForm();
      showSuccess("Password changed", "You can now sign in with the new password.");
    } catch (error) {
      setForgotPasswordError(getErrorMessage(error));
    }
  });

  return (
    <>
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-[#FFF1EC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#C2410C]">
          Secure Sign In
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-slate-950">
            Access your ERP workspace
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Sign in to manage sites, stock movement, vendor transactions, and
            labour operations from a single dashboard.
          </p>
        </div>
      </div>

      {state?.registered ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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

        <div className="flex justify-end">
          <button
            className="text-sm font-semibold text-[#FF6B4A] transition hover:text-[#E85B3D]"
            onClick={() => {
              setForgotPasswordError("");
              setIsForgotPasswordOpen(true);
            }}
            type="button"
          >
            Forgot password?
          </button>
        </div>

        <FormError message={formError} />

        <Button className="w-full" isLoading={isSubmitting} size="lg" type="submit">
          Sign In
        </Button>
      </form>

      <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-sm text-slate-600">
        <span>Need a new account?</span>
        <Link
          className="font-semibold text-[#FF6B4A] transition hover:text-[#E85B3D]"
          to="/register"
        >
          Create account
        </Link>
      </div>
    </div>
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => {
              setForgotPasswordError("");
              setIsForgotPasswordOpen(false);
              resetForgotPasswordForm();
            }}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            form="forgot-password-form"
            isLoading={isForgotPasswordSubmitting}
            type="submit"
          >
            Change Password
          </Button>
        </div>
      }
      onClose={() => {
        setForgotPasswordError("");
        setIsForgotPasswordOpen(false);
        resetForgotPasswordForm();
      }}
      open={isForgotPasswordOpen}
      size="md"
      title="Forgot Password"
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          Enter your registered email and set a new password for your account.
        </p>
        <form className="space-y-4" id="forgot-password-form" onSubmit={onForgotPasswordSubmit}>
          <Input
            error={forgotPasswordErrors.email?.message}
            label="Email"
            placeholder="Enter your registered email"
            type="email"
            {...registerForgotPassword("email")}
          />
          <Input
            error={forgotPasswordErrors.newPassword?.message}
            label="New Password"
            placeholder="Enter your new password"
            type="password"
            {...registerForgotPassword("newPassword")}
          />
          <Input
            error={forgotPasswordErrors.confirmPassword?.message}
            label="Confirm Password"
            placeholder="Re-enter your new password"
            type="password"
            {...registerForgotPassword("confirmPassword")}
          />
          <FormError message={forgotPasswordError} />
        </form>
      </div>
    </Modal>
    </>
  );
}
