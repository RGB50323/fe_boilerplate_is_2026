"use client";

import { useActionState, useState, type ComponentProps } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";

type FieldErrors = {
  email?: string;
  password?: string;
};

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

const initialState: LoginState = {};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ siguiente = "/menu" }: { siguiente?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const invalidCredentials = state.error === "Correo o contraseña incorrectos.";
  const hasFieldErrors = Boolean(errors.email || errors.password);

  const passwordError =
    errors.password ??
    (!pending && !hasFieldErrors && invalidCredentials
      ? state.error
      : undefined);

  const generalError =
    pending || hasFieldErrors || invalidCredentials ? undefined : state.error;

  const validateFields: FormSubmitHandler = (event) => {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: FieldErrors = {};

    if (!email) {
      nextErrors.email = "Ingresá tu correo electrónico.";
    } else if (!emailPattern.test(email)) {
      nextErrors.email = "Ingresá un correo electrónico válido.";
    }

    if (!password) {
      nextErrors.password = "Ingresá tu contraseña.";
    }

    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      event.preventDefault();
    }
  };

  return (
    <form
      action={formAction}
      onSubmit={validateFields}
      noValidate
      className="grid gap-5"
    >
      <input type="hidden" name="next" value={siguiente} />
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-orange-200">
          Correo electrónico
        </label>

        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="tu@correo.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />

        <FieldError id="email-error" message={errors.email} />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-orange-200"
        >
          Contraseña
        </label>

        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-12"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "password-error" : undefined}
          />

          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-zinc-400 hover:text-[#FF7A1A] focus-visible:outline-2 focus-visible:outline-orange-400"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        <FieldError id="password-error" message={passwordError} />
      </div>

      <Toast>{generalError}</Toast>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
