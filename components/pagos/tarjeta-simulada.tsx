import type { Resultado } from "@/lib/api";

const tarjetasDemo: Record<string, string> = {
  "4242424242424242": "VISA",
  "5555555555554444": "MASTERCARD",
};

export function leerTarjetaSimulada(formulario: HTMLFormElement): Resultado<{ marca: string; ultimosCuatro: string }> {
  const campo = (clave: string) =>
    formulario.querySelector<HTMLInputElement>(`[data-tarjeta-demo="${clave}"]`);
  const numero = campo("numero")?.value.replaceAll(" ", "") ?? "";
  const marca = tarjetasDemo[numero];
  if (!marca) return { ok: false, error: "Usa uno de los números ficticios indicados." };
  if (!/^[\p{L}][\p{L} .'-]{1,79}$/u.test(campo("titular")?.value.trim() ?? "")) {
    return { ok: false, error: "Escribe el nombre ficticio del titular." };
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(campo("vencimiento")?.value ?? "")) {
    return { ok: false, error: "Escribe el vencimiento en formato MM/AA, con un mes entre 01 y 12." };
  }
  if (!/^\d{3}$/.test(campo("codigo")?.value ?? "")) {
    return { ok: false, error: "Escribe un código de seguridad ficticio de tres dígitos." };
  }
  for (const entrada of formulario.querySelectorAll<HTMLInputElement>("[data-tarjeta-demo]")) {
    entrada.value = "";
  }
  return { ok: true, datos: { marca, ultimosCuatro: numero.slice(-4) } };
}

export function TarjetaSimulada({ claseCampo }: { claseCampo: string }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-orange-400/40 bg-orange-400/10 p-3 text-sm text-orange-100">
        <p className="font-semibold">Pasarela simulada</p>
        <p>Usa únicamente datos ficticios. No introduzcas tarjetas reales.</p>
        <p className="mt-2">Números de prueba: 4242 4242 4242 4242 (Visa) o 5555 5555 5555 4444 (Mastercard).</p>
      </div>
      <label>
        Número de tarjeta ficticia
        <input className={claseCampo} data-tarjeta-demo="numero" inputMode="numeric" autoComplete="off"
          placeholder="4242 4242 4242 4242"
          onChange={(e) => {
            const entrada = e.currentTarget;
            entrada.value = entrada.value.replace(/\D/g, "").slice(0, 16).match(/.{1,4}/g)?.join(" ") ?? "";
          }} />
      </label>
      <label>
        Nombre ficticio del titular
        <input className={claseCampo} data-tarjeta-demo="titular" autoComplete="off" maxLength={80} placeholder="Ana Demo" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Vencimiento (MM/AA)
          <input className={claseCampo} data-tarjeta-demo="vencimiento" inputMode="numeric" autoComplete="off"
            placeholder="12/30" onChange={(e) => {
              const entrada = e.currentTarget;
              const digitos = entrada.value.replace(/\D/g, "").slice(0, 4);
              entrada.value = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
            }} />
        </label>
        <label>
          Código de seguridad ficticio
          <input className={claseCampo} data-tarjeta-demo="codigo" inputMode="numeric" autoComplete="off"
            type="password" maxLength={3} placeholder="123" />
        </label>
      </div>
    </div>
  );
}
