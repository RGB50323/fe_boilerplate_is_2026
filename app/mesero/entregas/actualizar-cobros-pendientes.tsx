"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ActualizarCobrosPendientes() {
  const router = useRouter();

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 4000);
    return () => window.clearInterval(intervalo);
  }, [router]);

  return null;
}
