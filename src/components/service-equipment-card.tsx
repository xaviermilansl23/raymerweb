import { money } from "@/lib/api";
import { servicioWhatsApp, type EquipoServicio } from "@/lib/servicio-tecnico";
import { Icon } from "./icons";

const estados: Record<string, { label: string; tone: string }> = {
  RECIBIDO: { label: "Equipo recibido", tone: "received" },
  EN_REVISION: { label: "En revisión", tone: "review" },
  DIAGNOSTICADO: { label: "Diagnóstico disponible", tone: "diagnosed" },
  LISTO: { label: "Listo para recoger", tone: "ready" },
  CANCELADO: { label: "Proceso cancelado", tone: "cancelled" },
  ENTREGADO: { label: "Equipo entregado", tone: "delivered" },
};
const etapas = [
  ["RECIBIDO", "Recibido"],
  ["EN_REVISION", "En revisión"],
  ["DIAGNOSTICADO", "Diagnóstico"],
  ["LISTO", "Listo para recoger"],
  ["ENTREGADO", "Entregado"],
];
const tipos: Record<string, string> = {
  LAPTOP: "Laptop",
  PC: "Computadora de escritorio",
  IMPRESORA: "Impresora",
  ESCANER: "Escáner",
};
const fecha = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("es-BO", {
        timeZone: "America/La_Paz",
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export function ServiceEquipmentCard({ equipo }: { equipo: EquipoServicio }) {
  const estado = estados[equipo.estado] || {
    label: equipo.estado,
    tone: "received",
  };
  const titulo =
    [equipo.marca, equipo.modelo].filter(Boolean).join(" ") ||
    tipos[equipo.tipo] ||
    equipo.tipo;
  const whatsapp = servicioWhatsApp(equipo);
  const diagnosticado = Boolean(equipo.diagnostico?.trim());
  // A returned device may have been cancelled: do not invent the stages it completed.
  const recorrido =
    equipo.estado === "CANCELADO" || equipo.estado === "ENTREGADO"
      ? [
          ["RECIBIDO", "Recibido"],
          [
            equipo.estado,
            equipo.estado === "CANCELADO" ? "Cancelado" : "Devuelto al cliente",
          ],
        ]
      : etapas;
  const etapaActual = recorrido.findIndex(([key]) => key === equipo.estado);
  const costo =
    equipo.costo !== null &&
    equipo.costo !== "" &&
    Number.isFinite(Number(equipo.costo))
      ? Number(equipo.costo)
      : null;

  return (
    <article
      className={`service-equipment service-tone-${estado.tone}`}
      aria-labelledby={`equipo-${equipo.id}`}
    >
      <div className="service-card-top">
        <div className="service-device">
          <span className="service-device-icon">
            <Icon
              name={
                equipo.tipo === "PC" || equipo.tipo === "LAPTOP"
                  ? "monitor"
                  : "tools"
              }
            />
          </span>
          <div>
            <span className="service-device-type">
              {tipos[equipo.tipo] || equipo.tipo}
            </span>
            <h3 id={`equipo-${equipo.id}`}>{titulo}</h3>
            <span className="service-reference" title={equipo.id}>
              Servicio #{equipo.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
        <span className="service-status">
          <span aria-hidden="true" />
          {estado.label}
        </span>
      </div>

      {etapaActual >= 0 && (
        <ol
          className="service-progress"
          aria-label="Avance del servicio"
          style={{
            gridTemplateColumns: `repeat(${recorrido.length}, minmax(0, 1fr))`,
          }}
        >
          {recorrido.map(([key, label], index) => (
            <li
              key={key}
              className={
                index < etapaActual
                  ? "complete"
                  : index === etapaActual
                    ? "current"
                    : ""
              }
              aria-current={index === etapaActual ? "step" : undefined}
            >
              <span className="service-step-dot" aria-hidden="true">
                {index < etapaActual ? <Icon name="check" /> : index + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      )}

      <div
        className={`service-card-content${diagnosticado ? " has-diagnosis" : ""}`}
      >
        <div className="service-request">
          <span className="service-section-label">
            <Icon name="chat" />
            Observación de ingreso
          </span>
          <p>{equipo.observacion_cliente}</p>
          <dl className="service-device-meta">
            <div>
              <dt>Fecha de ingreso</dt>
              <dd>{fecha(equipo.fecha_ingreso)}</dd>
            </div>
            {equipo.serie && (
              <div>
                <dt>Número de serie</dt>
                <dd>{equipo.serie}</dd>
              </div>
            )}
          </dl>
        </div>
        {diagnosticado && (
          <div className="service-diagnosis">
            <span className="service-section-label">
              <Icon name="tools" />
              Diagnóstico técnico
            </span>
            <p>{equipo.diagnostico}</p>
            {equipo.acciones && (
              <>
                <span className="service-section-label service-recommendation">
                  Acciones recomendadas
                </span>
                <p>{equipo.acciones}</p>
              </>
            )}
            <div className="service-price">
              <span>Costo del servicio</span>
              <strong>{costo !== null ? money(costo) : "Por confirmar"}</strong>
            </div>
          </div>
        )}
      </div>

      {(equipo.estado === "LISTO" || equipo.estado === "CANCELADO") && (
        <p className="service-state-note">
          <Icon name={equipo.estado === "LISTO" ? "check" : "close"} />
          {equipo.estado === "LISTO"
            ? "Tu equipo está listo para recoger en tienda."
            : "Proceso cancelado. Coordina con la tienda la devolución de tu equipo."}
        </p>
      )}
      <div className="service-card-bottom">
        <span className="service-updated">
          Última actualización
          <br />
          <time dateTime={equipo.actualizado_en}>
            {fecha(equipo.actualizado_en)}
          </time>
        </span>
        {whatsapp && (
          <a
            className="button service-whatsapp"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="chat" />
            Consultar por WhatsApp
            <Icon name="arrow" />
          </a>
        )}
      </div>
    </article>
  );
}
