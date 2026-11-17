"use client";

import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import { rutaConSucursal } from "@/lib/navegacion-sucursal";

type Props = ComponentProps<typeof NextLink>;

function Enlace({ href, ...props }: Props) {
  const params = useSearchParams();

  const destino =
    typeof href === "string"
      ? rutaConSucursal(href, params?.toString() ?? "")
      : href;

  return <NextLink {...props} href={destino} />;
}

export function EnlaceConSucursal(props: Props) {
  return (
    <Suspense fallback={null}>
      <Enlace {...props} />
    </Suspense>
  );
}
