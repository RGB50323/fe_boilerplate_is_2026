import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";

type CampoPrecio = "precioMin" | "precioMax";

type RangoPrecioProps = {
  min: string;
  max: string;
  onChange: (campo: CampoPrecio, valor: string) => void;
  errorMin?: string;
  errorMax?: string;
};

export function RangoPrecio({
  min,
  max,
  onChange,
  errorMin,
  errorMax,
}: RangoPrecioProps) {
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="grid min-w-0 gap-1">
          <label
            htmlFor="precioMin"
            className="text-sm font-medium text-orange-200"
          >
            Precio mín.
          </label>
          <Input
            id="precioMin"
            type="number"
            value={min}
            onChange={(e) => onChange("precioMin", e.target.value)}
          />
        </div>

        <div className="grid min-w-0 gap-1">
          <label
            htmlFor="precioMax"
            className="text-sm font-medium text-orange-200"
          >
            Precio máx.
          </label>
          <Input
            id="precioMax"
            type="number"
            value={max}
            onChange={(e) => onChange("precioMax", e.target.value)}
          />
        </div>
      </div>

      <FieldError id="rango-precio-error" message={errorMin || errorMax} />
    </div>
  );
}
