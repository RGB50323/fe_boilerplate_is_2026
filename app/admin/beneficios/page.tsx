import type { Metadata } from "next";
import { consultarBeneficiosAdministrativos, consultarRegla } from "@/app/actions/lealtad";
import { connection } from "next/server";
import { AdminBeneficios } from "./admin-beneficios";
import { EditorRegla } from "./editor-regla";

export const metadata: Metadata = { title: "Administrar beneficios | Los Burle" };

export default async function AdminBeneficiosPage() {
  await connection();
  const [beneficios, regla] = await Promise.all([consultarBeneficiosAdministrativos(), consultarRegla()]);
  return (
    <main className="grid gap-8 py-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">Administrar beneficios</h1>
      <EditorRegla inicial={regla} />
      <AdminBeneficios inicial={beneficios} />
    </main>
  );
}

