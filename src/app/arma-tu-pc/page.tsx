import type { Metadata } from "next";
import { PcBuilder } from "@/components/pc-builder";
export const metadata: Metadata = {
  title: "Arma tu PC | Raymer",
  description:
    "Construye tu próxima PC con componentes disponibles, compatibilidad comprobada y cotización en bolivianos. Elige por piezas o según tu presupuesto.",
};
export default function Page() {
  return <PcBuilder />;
}
