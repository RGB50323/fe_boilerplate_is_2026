import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { MenuView } from "./menu-view";

export const metadata: Metadata = {
  title: "Menú | Los Burle",
};

export default async function MenuPage() {
  const autenticado = Boolean(await getSession());
  return <MenuView autenticado={autenticado} />;
}