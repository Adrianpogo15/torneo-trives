"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Shield, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AccessModalProps = {
  triggerLabel: string;
  title: string;
  subtitle: string;
  mode: "porra" | "admin";
  triggerClassName?: string;
};

export function AccessModal({
  triggerLabel,
  title,
  subtitle,
  mode,
  triggerClassName,
}: AccessModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canResendVerification, setCanResendVerification] = useState(false);
  const Icon = mode === "admin" ? Shield : LockKeyhole;
  const showRegister = mode === "porra";
  const destination = mode === "admin" ? "/admin" : "/porra";

  if (mode === "porra") {
    return (
      <button
        aria-label={triggerLabel || title}
        className={
          triggerClassName ||
          "rounded bg-gold-400 px-4 py-3 text-sm font-black uppercase text-ink transition hover:bg-gold-300"
        }
        onClick={() => {
          window.location.href = destination;
        }}
        type="button"
      >
        {triggerLabel}
      </button>
    );
  }

  function changeTab(tab: "login" | "register") {
    setActiveTab(tab);
    setMessage(null);
    setError(null);
    setCanResendVerification(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setCanResendVerification(false);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const normalizedEmail = email.trim().toLowerCase();

    if (activeTab === "register" && showRegister) {
      if (!displayName.trim()) {
        setLoading(false);
        setError("Introduce un nombre de usuario para aparecer en la clasificacion.");
        return;
      }

      if (!normalizedEmail.endsWith("@gmail.com")) {
        setLoading(false);
        setError("Para registrarte en la porra necesitas una cuenta de Gmail.");
        return;
      }

      if (password !== confirmPassword) {
        setLoading(false);
        setError("Las contraseñas no coinciden.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirmed`,
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      setLoading(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        window.location.href = destination;
        return;
      }

      setCanResendVerification(true);
      setMessage("Cuenta creada. Revisa Gmail y pulsa el boton de verificacion para activarla.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    window.location.href = destination;
  }

  async function resendVerificationEmail() {
    setError(null);
    setMessage(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
    });

    setLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setCanResendVerification(true);
    setMessage("Correo reenviado. Revisa la bandeja de entrada y spam de Gmail.");
  }

  return (
    <>
      <button
        className={
          triggerClassName ||
          "rounded bg-gold-400 px-4 py-3 text-sm font-black uppercase text-ink transition hover:bg-gold-300"
        }
        onClick={() => setOpen(true)}
        type="button"
      >
        {mode === "admin" ? <Shield size={16} aria-hidden="true" /> : null}
        {triggerLabel ? <span>{triggerLabel}</span> : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md animate-modal-in rounded border border-line bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded bg-ink text-gold-400">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black uppercase">{title}</h2>
                  <p className="text-xs text-ink/55">{subtitle}</p>
                </div>
              </div>
              <button
                aria-label="Cerrar"
                className="rounded p-2 hover:bg-fog"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {showRegister ? (
              <div className="grid grid-cols-2 gap-2 border-b border-line p-3">
                <button
                  className={`rounded px-3 py-2 text-sm font-black uppercase ${
                    activeTab === "login" ? "bg-ink text-gold-400" : "bg-fog text-ink/65"
                  }`}
                  onClick={() => changeTab("login")}
                  type="button"
                >
                  Entrar
                </button>
                <button
                  className={`rounded px-3 py-2 text-sm font-black uppercase ${
                    activeTab === "register" ? "bg-ink text-gold-400" : "bg-fog text-ink/65"
                  }`}
                  onClick={() => changeTab("register")}
                  type="button"
                >
                  Registro
                </button>
              </div>
            ) : null}

            <form className="space-y-4 p-5" onSubmit={handleSubmit}>
              {activeTab === "register" && showRegister ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-bold">Nombre visible</span>
                  <input
                    className="w-full rounded border border-line bg-white px-3 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-gold-500"
                    placeholder="Ej. Ivan Trives"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                  <span className="mt-1 block text-xs text-ink/50">
                    Sera el nombre que aparezca en la clasificacion.
                  </span>
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-sm font-bold">Email</span>
                <input
                  className="w-full rounded border border-line bg-white px-3 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-gold-500"
                  placeholder="email@ejemplo.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                {activeTab === "register" && showRegister ? (
                  <span className="mt-1 block text-xs text-ink/50">
                    Solo se aceptan cuentas @gmail.com.
                  </span>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold">Contraseña</span>
                <input
                  className="w-full rounded border border-line bg-white px-3 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-gold-500"
                  placeholder="Tu contraseña"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>
              {activeTab === "register" && showRegister ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-bold">
                    Repetir contraseña
                  </span>
                  <input
                    className="w-full rounded border border-line bg-white px-3 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-gold-500"
                    placeholder="Repite tu contraseña"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                </label>
              ) : null}
              {error ? (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rounded border border-gold-400 bg-gold-50 px-3 py-2 text-sm text-ink">
                  {message}
                </p>
              ) : null}
              {canResendVerification ? (
                <button
                  className="w-full rounded border border-line px-4 py-3 text-sm font-black uppercase text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  onClick={resendVerificationEmail}
                  type="button"
                >
                  Reenviar verificacion
                </button>
              ) : null}
              <button
                className="w-full rounded bg-ink px-4 py-3 text-sm font-black uppercase text-gold-400 transition hover:bg-asphalt disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading
                  ? "Procesando..."
                  : activeTab === "register" && showRegister
                    ? "Crear cuenta"
                    : "Entrar"}
              </button>
              <p className="text-center text-xs text-ink/50">
                {mode === "admin"
                  ? "Solo usuarios autorizados podran entrar."
                  : "Necesitas cuenta para guardar tus pronosticos."}
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
