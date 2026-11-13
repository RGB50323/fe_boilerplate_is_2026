"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearPedido, listarMesas } from "@/app/actions/pedidos";
import { listarPlatillos } from "@/app/actions/platillos";
import { DrawerMesas } from "@/components/pedidos/drawer-mesas";
import { ListaPlatillos } from "@/components/pedidos/lista-platillos";
import { ResumenPedido } from "@/components/pedidos/resumen-pedido";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast } from "@/components/ui/toast";
import {
  itemsParaEnviar,
  normalizarTexto,
  type LineaPedido,
  type Mesa,
} from "@/lib/pedidos";
import type { Platillo } from "@/lib/platillos";

type Aviso = { id: number; texto: string; variante: "success" | "error" };

const BOTON_PRIMARIO =
  "cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400";

export function PedidoView({
  sucursalId,
  platillosIniciales,
  mesasIniciales,
  errorInicial,
}: {
  sucursalId: number;
  platillosIniciales: Platillo[];
  mesasIniciales: Mesa[];
  errorInicial?: string;
}) {
  const router = useRouter();
  const [platillos, setPlatillos] = useState(platillosIniciales);
  const [mesas, setMesas] = useState(mesasIniciales);
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function avisar(texto: string, variante: Aviso["variante"]) {
    setAviso({ id: Date.now(), texto, variante });
  }

  function agregar(platillo: Platillo) {
    setLineas((actuales) => {
      const existente = actuales.find((l) => l.platillo.id === platillo.id);
      if (!existente) {
        return [...actuales, { platillo, cantidad: 1, nota: "" }];
      }
      if (existente.cantidad >= platillo.disponibilidad) return actuales;
      return actuales.map((l) =>
        l.platillo.id === platillo.id ? { ...l, cantidad: l.cantidad + 1 } : l,
      );
    });
  }

  function cambiarCantidad(platilloId: number, delta: number) {
    setLineas((actuales) =>
      actuales.map((l) => {
        if (l.platillo.id !== platilloId) return l;
        const cantidad = Math.min(
          Math.max(l.cantidad + delta, 1),
          l.platillo.disponibilidad,
        );
        return { ...l, cantidad };
      }),
    );
  }

  function quitar(platilloId: number) {
    setLineas((actuales) =>
      actuales.filter((l) => l.platillo.id !== platilloId),
    );
  }

  function cambiarNota(platilloId: number, nota: string) {
    setLineas((actuales) =>
      actuales.map((l) => (l.platillo.id === platilloId ? { ...l, nota } : l)),
    );
  }

  async function refrescar() {
    const [resMesas, resPlatillos] = await Promise.all([
      listarMesas(sucursalId),
      listarPlatillos(sucursalId),
    ]);
    if (resMesas.ok) setMesas(resMesas.datos);
    if (resPlatillos.ok) setPlatillos(resPlatillos.datos);
  }

  async function enviar() {
    if (enviando || lineas.length === 0) return;
    if (!mesa) {
      avisar("Selecciona una mesa para el pedido.", "error");
      setDrawerAbierto(true);
      return;
    }

    setEnviando(true);
    const resultado = await crearPedido(mesa.id, itemsParaEnviar(lineas));
    setEnviando(false);

    if (!resultado.ok) {
      if (resultado.sinSesion) router.replace("/login");
      avisar(resultado.error, "error");
      return;
    }

    avisar(`Pedido ${resultado.datos.numero} enviado a cocina`, "success");
    setLineas([]);
    setMesa(null);
    await refrescar();
  }

  const filtro = normalizarTexto(busqueda.trim());
  const visibles = platillos.filter(
    (p) => p.activo && normalizarTexto(p.nombre).includes(filtro),
  );

  return (
    <main className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-5xl">
          Registrar el pedido de una mesa
        </h1>
        <button
          type="button"
          onClick={() => setDrawerAbierto(true)}
          className={BOTON_PRIMARIO}
        >
          {mesa ? `Mesa ${mesa.numero}: cambiar` : "Seleccionar mesa"}
        </button>
      </div>

      {errorInicial ? (
        <EmptyState mensaje={errorInicial} variante="error" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <ListaPlatillos
            platillos={visibles}
            busqueda={busqueda}
            onBuscar={setBusqueda}
            onAgregar={agregar}
          />
          <ResumenPedido
            mesa={mesa}
            lineas={lineas}
            enviando={enviando}
            onMas={(id) => cambiarCantidad(id, 1)}
            onMenos={(id) => cambiarCantidad(id, -1)}
            onQuitar={quitar}
            onNota={cambiarNota}
            onEnviar={() => void enviar()}
          />
        </div>
      )}

      <DrawerMesas
        abierto={drawerAbierto}
        mesas={mesas}
        seleccionada={mesa?.id ?? null}
        onCerrar={() => setDrawerAbierto(false)}
        onElegir={(elegida) => {
          setMesa(elegida);
          setDrawerAbierto(false);
        }}
      />

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </main>
  );
}
