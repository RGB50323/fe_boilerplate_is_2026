"use client";

import type { ReactNode } from "react";
import { Dialog, DialogHeading } from "@ariakit/react";

type ModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  className?: string;
};

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  className = "",
}: ModalProps) {
  return (
    <Dialog
      open={abierto}
      onClose={onCerrar}
      portal={false}
      backdrop={<div className="fixed inset-0 z-40 bg-black/70" />}
      className={`fixed inset-3 z-50 m-auto h-fit max-h-[calc(100dvh-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border-2 border-white bg-black p-6 text-zinc-100 sm:p-8 ${className}`}
    >
      <DialogHeading className="text-2xl">{titulo}</DialogHeading>
      {descripcion && (
        <p className="mt-2 text-sm text-zinc-400">{descripcion}</p>
      )}
      <div className="mt-6">{children}</div>
    </Dialog>
  );
}
