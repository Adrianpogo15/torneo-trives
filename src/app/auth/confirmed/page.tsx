import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function AuthConfirmedPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-xl rounded border border-line bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded bg-gold-400 text-ink">
          <CheckCircle2 size={28} aria-hidden="true" />
        </span>
        <p className="text-sm font-black uppercase text-gold-700">Cuenta verificada</p>
        <h1 className="mt-2 text-3xl font-black uppercase text-ink">Ya puedes entrar</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          Tu cuenta ha quedado activada. Vuelve a La Porra e inicia sesión con
          tu DNI y contraseña.
        </p>
        <Link
          href="/porra"
          className="mt-6 inline-flex rounded bg-ink px-4 py-3 text-sm font-black uppercase text-gold-400"
        >
          Ir a La Porra
        </Link>
      </section>
    </AppShell>
  );
}
