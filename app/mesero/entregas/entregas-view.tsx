"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listarItemsListos,
  marcarItemEntregado,
  type ItemsListosResultado,
  type MarcarEntregadoResultado,
} from "@/app/actions/entregas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast } from "@/components/ui/toast";
import { horaListo } from "@/lib/cocina/pedidos";
import {
  agruparPorMesa,
  quitarItem,
  textoPorEntregar,
  type ItemPorEntregar,
} from "@/lib/entregas";
import { EncabezadoEntregas, EsqueletoEntregas, IconoBurger } from "./esqueleto-entregas";

type Carga = "cargando" | "listo" | "error";
type Aviso = { id: number; texto: string; variante: "success" | "error" };
type Entregar = (item: ItemPorEntregar) => Promise<void>;

const ERROR_CARGA = "No pudimos cargar los platillos";
const ERROR_ENTREGA = "No pudimos marcar el platillo como entregado. Intenta de nuevo.";

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5 animate-spin motion-reduce:animate-none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BotonEntregado({ item, onEntregar }: { item: ItemPorEntregar; onEntregar: Entregar }) {
  const [enviando, setEnviando] = useState(false);

  async function entregar() {
    if (enviando) return;
    setEnviando(true);
    try {
      await onEntregar(item);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Button
      onClick={entregar}
      disabled={enviando}
      aria-busy={enviando}
      aria-label={`Marcar ${item.cantidad} × ${item.platillo} como entregado`}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 text-base sm:px-5 sm:text-lg"
    >
      {enviando && <Spinner />}
      Entregado
    </Button>
  );
}

function MesaCard({
  mesa,
  items,
  onEntregar,
}: {
  mesa: number;
  items: ItemPorEntregar[];
  onEntregar: Entregar;
}) {
  return (
    <article
      aria-label={`Mesa ${mesa}`}
      className="flex h-full flex-col rounded-2xl border-4 border-zinc-600 bg-black p-4 sm:p-5"
    >
      <header className="flex items-center justify-between gap-3 border-b border-zinc-700 pb-4">
        <h2 className="text-3xl tabular-nums">Mesa {mesa}</h2>
        <Badge className="shrink-0 whitespace-nowrap text-base tabular-nums">
          {textoPorEntregar(items.length)}
        </Badge>
      </header>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const hora = horaListo(item.listoEn);
          return (
            <li
              key={item.itemId}
              className="flex items-center gap-3 rounded-lg bg-[#2b2b2f] py-2 pl-4 pr-2"
            >
              <div className="min-w-0 flex-1 py-1">
                <p className="wrap-break-word text-lg sm:text-xl">
                  <span className="tabular-nums">{item.cantidad}</span> × {item.platillo}
                </p>
                {hora && (
                  <p className="mt-1 text-base text-zinc-400">
                    Listo{" "}
                    <time dateTime={item.listoEn ?? undefined} className="tabular-nums">
                      {hora}
                    </time>
                  </p>
                )}
              </div>
              <BotonEntregado item={item} onEntregar={onEntregar} />
            </li>
          );
        })}
      </ul>
    </article>
  );
}

async function pedir<T>(accion: () => Promise<T>, error: T, contexto: string): Promise<T> {
  try {
    return await accion();
  } catch (causa) {
    console.error(contexto, causa);
    return error;
  }
}

export function EntregasView() {
  const router = useRouter();
  const [carga, setCarga] = useState<Carga>("cargando");
  const [items, setItems] = useState<ItemPorEntregar[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const ultimaConsulta = useRef(0);
  const siguienteAviso = useRef(0);

  const avisar = useCallback((texto: string, variante: Aviso["variante"]) => {
    setAviso({ id: ++siguienteAviso.current, texto, variante });
  }, []);

  const cargar = useCallback(
    (silenciosa = false) => {
      const consulta = ++ultimaConsulta.current;
      return pedir<ItemsListosResultado>(
        listarItemsListos,
        { error: ERROR_CARGA },
        "Error al cargar los platillos por entregar:",
      ).then((resultado) => {
        if (consulta !== ultimaConsulta.current) return;
        if ("items" in resultado) {
          setItems(resultado.items);
          setCarga("listo");
        } else if ("sinSesion" in resultado) {
          router.replace("/login");
        } else if (silenciosa) {
          avisar(ERROR_CARGA, "error");
        } else {
          setCarga("error");
        }
      });
    },
    [router, avisar],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function reintentar() {
    setCarga("cargando");
    void cargar();
  }

  const entregar = useCallback(
    async (item: ItemPorEntregar) => {
      const resultado = await pedir<MarcarEntregadoResultado>(
        () => marcarItemEntregado(item.itemId),
        { error: ERROR_ENTREGA },
        "Error al marcar el platillo como entregado:",
      );

      if ("entregado" in resultado) {
        setItems((actuales) => quitarItem(actuales, item.itemId));
        avisar(
          resultado.entregado.pedidoEstado === "ENTREGADO"
            ? `Pedido de la Mesa ${item.mesa} entregado completo`
            : `Platillo entregado · Mesa ${item.mesa}`,
          "success",
        );
      } else if ("refrescar" in resultado) {
        await cargar(true);
      } else if ("sinSesion" in resultado) {
        router.replace("/login");
      } else {
        avisar(resultado.error, "error");
      }
    },
    [avisar, cargar, router],
  );

  const grupos = agruparPorMesa(items);

  return (
    <>
      <EncabezadoEntregas />

      <section aria-busy={carga === "cargando"} aria-label="Platillos por entregar">
        {carga === "cargando" && <EsqueletoEntregas />}

        {carga === "error" && (
          <EmptyState mensaje={ERROR_CARGA} variante="error">
            <Button onClick={reintentar} className="min-h-11 px-8 text-xl">
              Reintentar
            </Button>
          </EmptyState>
        )}

        {carga === "listo" && grupos.length === 0 && (
          <EmptyState
            mensaje="No hay platillos por entregar"
            icono={<IconoBurger className="size-16" />}
            className="border-4 border-zinc-200 bg-black"
          />
        )}

        {carga === "listo" && grupos.length > 0 && (
          <ol
            aria-label="Mesas con platillos por entregar"
            className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {grupos.map((grupo) => (
              <li key={grupo.mesa}>
                <MesaCard mesa={grupo.mesa} items={grupo.items} onEntregar={entregar} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </>
  );
}
