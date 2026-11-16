import type { Metadata } from "next";
import Image from "next/image";
import { Fraunces } from "next/font/google";
import { LoginForm } from "./login-form";
import { retornoLogin } from "@/lib/retorno-login";

export const metadata: Metadata = {
  title: "Iniciar sesión | Los Burle",
};

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const siguiente = retornoLogin((await searchParams).next);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#101012] px-4 py-6 text-zinc-100 sm:px-6 sm:py-8">
      <div className="grid w-full max-w-md grid-cols-1 overflow-hidden rounded-2xl border border-zinc-800 bg-[#18181b] lg:max-w-5xl lg:grid-cols-2">
        <section
          aria-labelledby="login-title"
          className={`${fraunces.className} flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 sm:py-10 lg:min-h-140`}
        >
          <p className="mb-5 text-2xl text-[#FF7A1A] sm:mb-8 sm:text-3xl">
            Los Burle
          </p>

          <h1 id="login-title" className="text-3xl sm:text-4xl lg:text-5xl">
            Iniciar sesión
          </h1>

          <p className="mb-5 mt-2 text-sm text-zinc-400 sm:mb-7 sm:text-base">
            Ingresá tu correo y contraseña para acceder a tu cuenta.
          </p>

          {siguiente !== "/menu" && (
            <p role="status" className="mb-5 text-sm text-orange-200">
              Iniciá sesión para continuar con tu reservación.
            </p>
          )}
          <LoginForm siguiente={siguiente} />
        </section>

        <div className="relative hidden lg:block">
          <Image
            src="/images/login.png"
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 1072px) 512px, (min-width: 1024px) calc(50vw - 24px), 0px"
            className="object-cover"
          />
        </div>
      </div>
    </main>
  );
}
