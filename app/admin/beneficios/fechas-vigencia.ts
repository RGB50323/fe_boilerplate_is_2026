export const fechaVigencia = new Intl.DateTimeFormat("es-SV", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/El_Salvador",
});

export function fechaParaSelector(instante?: string | Date) {
  if (!instante) return "";
  const partes = fechaVigencia.formatToParts(
    typeof instante === "string" ? new Date(instante) : instante,
  );
  const anio = partes
    .find(({ type }) => type === "year")
    ?.value.padStart(4, "0");
  const mes = partes.find(({ type }) => type === "month")?.value;
  const dia = partes.find(({ type }) => type === "day")?.value;
  return `${anio}-${mes}-${dia}`;
}

export function limitesVigencia(desde: string, hasta: string) {
  const formato = /^\d{4}-\d{2}-\d{2}$/;
  if (!formato.test(desde) || !formato.test(hasta) || hasta < desde)
    return null;
  return {
    vigenteDesde: `${desde}T00:00:00.000-06:00`,
    vigenteHasta: `${hasta}T23:59:59.999-06:00`,
  };
}
