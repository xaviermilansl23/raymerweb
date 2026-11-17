import type { Producto } from "./models";
export type PartKind =
  | "cpu"
  | "placa"
  | "ram"
  | "ssd"
  | "gpu"
  | "fuente"
  | "gabinete"
  | "cooler";
export const PC_STEPS: {
  key: PartKind;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    key: "cpu",
    label: "Procesador",
    short: "CPU",
    hint: "El punto de partida de tu equipo. Define la plataforma y la placa que podrás utilizar.",
  },
  {
    key: "placa",
    label: "Placa madre",
    short: "MB",
    hint: "Conecta todo. Revisamos socket, CPU, memoria y conexiones; avisamos si falta comprobar la BIOS instalada.",
  },
  {
    key: "ram",
    label: "Memoria RAM",
    short: "RAM",
    hint: "Elige un kit de memoria. La cantidad indica kits completos, no módulos individuales.",
  },
  {
    key: "ssd",
    label: "Almacenamiento",
    short: "SSD",
    hint: "Espacio para tus juegos, proyectos y archivos. Revisamos interfaz, tamaño y conexiones.",
  },
  {
    key: "gpu",
    label: "Tarjeta gráfica",
    short: "GPU",
    hint: "El motor visual. Si tu CPU tiene gráficos integrados, puedes dejarla para una futura mejora.",
  },
  {
    key: "fuente",
    label: "Fuente de poder",
    short: "PSU",
    hint: "Energía con margen y conectores correctos. No recomendamos adaptadores improvisados.",
  },
  {
    key: "gabinete",
    label: "Gabinete",
    short: "CASE",
    hint: "Tu equipo también necesita espacio: placa, fuente, gráfica y refrigeración deben caber.",
  },
  {
    key: "cooler",
    label: "Refrigeración",
    short: "FAN",
    hint: "Mantén tu procesador refrigerado. Si incluye un disipador compatible, esta pieza puede ser opcional.",
  },
];
export interface PcPart extends Producto {
  ficha: {
    tipo_componente: PartKind;
    especificaciones: Record<string, string | number | boolean | string[]>;
    fuente_especificaciones: string;
    estado_revision: string;
  };
}
export interface PcSelection {
  producto_id: number;
  cantidad: number;
}
export interface PcIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  components: string[];
}
export interface PcQuote {
  items: { producto: PcPart; cantidad: number; subtotal: number }[];
  total: number;
  emitido_en: string;
  validacion: {
    compatible: boolean;
    completo: boolean;
    por_verificar?: string[];
    listo: boolean;
    faltantes: string[];
    issues: PcIssue[];
    consumo_w: number;
    fuente_recomendada_w: number;
    rendimiento: string;
  };
}
export function readBuild(
  raw: string | null,
): {
  items: PcSelection[];
  uso: string;
  resolucion: string;
  presupuesto: number;
} | null {
  try {
    if (!raw || raw.length > 5000) return null;
    const v = JSON.parse(raw);
    if (
      !Array.isArray(v.items) ||
      v.items.length > 24 ||
      v.items.some(
        (i: PcSelection) =>
          !Number.isSafeInteger(i.producto_id) ||
          i.producto_id < 1 ||
          !Number.isSafeInteger(i.cantidad) ||
          i.cantidad < 1 ||
          i.cantidad > 4,
      ) ||
      new Set(v.items.map((i: PcSelection) => i.producto_id)).size !==
        v.items.length
    )
      return null;
    return {
      items: v.items,
      uso: ["gaming", "oficina", "creacion"].includes(v.uso) ? v.uso : "gaming",
      resolucion: ["1080p", "1440p", "4k"].includes(v.resolucion)
        ? v.resolucion
        : "1080p",
      presupuesto:
        Number.isFinite(v.presupuesto) &&
        v.presupuesto >= 100 &&
        v.presupuesto <= 1000000
          ? v.presupuesto
          : 7000,
    };
  } catch {
    return null;
  }
}
export function highlights(p: PcPart): string[] {
  const s = p.ficha.especificaciones;
  const val = (key: string) =>
    Array.isArray(s[key])
      ? (s[key] as string[]).join(" / ")
      : String(s[key] ?? "");
  const keys: Record<PartKind, string[]> = {
    cpu: ["socket", "potencia_max_w"],
    placa: ["socket", "tipo_ram", "formato"],
    ram: ["tipo_ram", "capacidad_gb", "modulos"],
    ssd: ["interfaz", "capacidad_gb", "formato"],
    gpu: ["potencia_w", "largo_mm"],
    fuente: ["potencia_w", "formato"],
    gabinete: ["formatos_placa", "gpu_max_mm"],
    cooler: ["tipo", "medida_mm"],
  };
  return keys[p.ficha.tipo_componente].map(
    (k) =>
      val(k) +
      ({
        potencia_max_w: " W máx.",
        potencia_w: " W",
        capacidad_gb: " GB",
        modulos: " módulos/kit",
        largo_mm: " mm",
        gpu_max_mm: " mm GPU",
        medida_mm: " mm",
      }[k] || ""),
  );
}
