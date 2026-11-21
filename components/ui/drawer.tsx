"use client";

import type { ReactNode } from "react";
import { Dialog, DialogDismiss, DialogHeading } from "@ariakit/react";

type DrawerProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  lado?: "derecha" | "izquierda";
  children?: ReactNode;
  className?: string;
};

const LADOS = {
  derecha: "right-0 border-l drawer-derecha",
  izquierda: "left-0 border-r drawer-izquierda",
};

export function Drawer({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  lado = "derecha",
  children,
  className = "",
}: DrawerProps) {
  return (
    <Dialog
      open={abierto}
      onClose={onCerrar}
      portal={false}
      backdrop={<div className="fixed inset-0 z-40 bg-black/70" />}
      className={`fixed inset-y-0 z-50 w-full max-w-md overflow-y-auto border-zinc-800 bg-[#151517] p-6 text-zinc-100 sm:p-8 shadow-[0_0_48px_-12px_rgb(0_0_0/0.6)] ${LADOS[lado]} ${className}`}
    >
      <DialogDismiss
        aria-label="Cerrar"
        className="absolute right-4 top-4 flex size-9 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        <span aria-hidden="true">×</span>
      </DialogDismiss>

      <DialogHeading className="pr-10 text-3xl">{titulo}</DialogHeading>
      {descripcion && (
        <p className="mt-2 text-sm text-zinc-400">{descripcion}</p>
      )}
      <div className="mt-6">{children}</div>
    </Dialog>
  );
}