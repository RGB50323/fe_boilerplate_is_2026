import { Skeleton } from "@/components/ui/skeleton";
import {
  etiquetaPedido,
  fechaHoraLocal,
  formatoEntero,
  formatoMoneda,
  TIPOS_PEDIDO,
  type VentasPagina,
} from "@/lib/dashboard";

const th = "px-3 py-3 font-normal first:pl-0 last:pr-0";
const thNum = `${th} text-right`;
const td = "px-3 py-3 first:pl-0 last:pr-0";
const tdNum = `${td} text-right tabular-nums`;

const botonPagina =
  "cursor-pointer rounded-full border border-zinc-700 bg-[#101012] px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-[#FF7A1A]/60 focus-visible:outline-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-40";

// Lista de ventas confirmadas (una fila por pedido), paginada en el servidor.
export function TablaVentas({
  ventas,
  cargando,
  mostrarSucursal,
  onPagina,
}: {
  ventas: VentasPagina | null;
  cargando: boolean;
  mostrarSucursal: boolean;
  onPagina: (pagina: number) => void;
}) {
  const columnas = mostrarSucursal ? 9 : 8;
  const paginas = ventas ? Math.max(1, Math.ceil(ventas.total / ventas.porPagina)) : 1;
  const desde = ventas && ventas.total ? (ventas.pagina - 1) * ventas.porPagina + 1 : 0;
  const hasta = ventas ? Math.min(ventas.total, ventas.pagina * ventas.porPagina) : 0;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left">
          <thead className="border-b border-zinc-700 text-sm text-zinc-400">
            <tr>
              <th scope="col" className={th}>Fecha</th>
              <th scope="col" className={th}>Hora</th>
              <th scope="col" className={th}>Pedido</th>
              {mostrarSucursal && <th scope="col" className={th}>Sucursal</th>}
              <th scope="col" className={th}>Tipo</th>
              <th scope="col" className={thNum}>Artículos</th>
              <th scope="col" className={thNum}>Subtotal</th>
              <th scope="col" className={thNum}>Descuentos</th>
              <th scope="col" className={thNum}>Venta</th>
            </tr>
          </thead>
          <tbody aria-busy={cargando}>
            {cargando &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-zinc-800">
                  <td colSpan={columnas} className="py-3">
                    <Skeleton className="h-5 rounded" />
                  </td>
                </tr>
              ))}
            {!cargando &&
              ventas?.items.map((v) => {
                const { fecha, hora } = fechaHoraLocal(v.fecha);
                return (
                  <tr key={v.pedidoId} className="border-b border-zinc-800">
                    <td className={`${td} tabular-nums`}>{fecha}</td>
                    <td className={`${td} tabular-nums text-zinc-300`}>{hora}</td>
                    <th scope="row" className={`${td} font-normal`}>{etiquetaPedido(v)}</th>
                    {mostrarSucursal && <td className={td}>{v.sucursal}</td>}
                    <td className={`${td} text-zinc-300`}>{TIPOS_PEDIDO[v.tipo] ?? v.tipo}</td>
                    <td className={tdNum}>{formatoEntero(v.articulos)}</td>
                    <td className={tdNum}>{formatoMoneda(v.subtotal)}</td>
                    <td className={`${tdNum} text-zinc-400`}>
                      {v.descuentos ? `−${formatoMoneda(v.descuentos)}` : formatoMoneda(0)}
                    </td>
                    <td className={`${tdNum} text-zinc-100`}>{formatoMoneda(v.venta)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {ventas && ventas.total > 0 && (
        <nav
          aria-label="Paginación de ventas"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400"
        >
          <p>
            Mostrando {formatoEntero(desde)}–{formatoEntero(hasta)} de{" "}
            {formatoEntero(ventas.total)} ventas
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={botonPagina}
              disabled={cargando || ventas.pagina <= 1}
              onClick={() => onPagina(ventas.pagina - 1)}
            >
              Anterior
            </button>
            <span className="px-2 tabular-nums">
              Página {ventas.pagina} de {paginas}
            </span>
            <button
              type="button"
              className={botonPagina}
              disabled={cargando || ventas.pagina >= paginas}
              onClick={() => onPagina(ventas.pagina + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
