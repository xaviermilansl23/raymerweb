export type EquipoServicio = {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  estado: string;
  fecha_ingreso: string;
  actualizado_en: string;
  observacion_cliente: string;
  diagnostico: string | null;
  acciones: string | null;
  costo: string | number | null;
};

export function puedeConsultarServicio(
  equipo: Pick<EquipoServicio, "estado" | "diagnostico">,
): boolean {
  return (
    ["DIAGNOSTICADO", "LISTO", "CANCELADO", "ENTREGADO"].includes(
      equipo.estado,
    ) && Boolean(equipo.diagnostico?.trim())
  );
}

export function servicioWhatsApp(
  equipo: Pick<
    EquipoServicio,
    "id" | "tipo" | "marca" | "modelo" | "estado" | "diagnostico"
  >,
): string | null {
  if (!puedeConsultarServicio(equipo)) return null;
  const dispositivo = [equipo.tipo, equipo.marca, equipo.modelo]
    .filter(Boolean)
    .join(" ");
  const mensaje = `Hola Raymer, quisiera consultar el diagnóstico de mi equipo ${dispositivo}.\nServicio técnico: ${equipo.id}.\nQuiero conversar sobre las acciones recomendadas y coordinar cómo continuar.`;
  return `https://wa.me/59172768877?text=${encodeURIComponent(mensaje)}`;
}
