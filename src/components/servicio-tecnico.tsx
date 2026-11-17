"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "./store";
import { ServicesSection } from "./services-section";
import { errorMessage } from "@/lib/api";
import type { EquipoServicio } from "@/lib/servicio-tecnico";
import { ServiceEquipmentCard } from "./service-equipment-card";
import { Icon } from "./icons";

export function ServicioTecnico() {
  const s = useStore();
  return (
    <>
      <section
        className="customer-journey service-tracking"
        aria-labelledby="mis-equipos"
      >
        <div className="journey-heading">
          <span className="eyebrow">SEGUIMIENTO</span>
          <h2 id="mis-equipos">Mis equipos</h2>
          <p>
            Consulta aquí las novedades de los equipos vinculados a tu cuenta.
          </p>
        </div>
        {!s.ready ? (
          <p>Cargando…</p>
        ) : !s.authenticated ? (
          <p>
            <Link href="/login?returnUrl=%2Fservicio-tecnico">
              Inicia sesión
            </Link>{" "}
            para consultar tus equipos.
          </p>
        ) : (
          <MisEquipos key={`${s.session}-${s.clienteId}`} />
        )}
      </section>
      <ServicesSection />
    </>
  );
}

function MisEquipos() {
  const { api, clienteId } = useStore();
  const [items, setItems] = useState<EquipoServicio[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let running = false;
    const load = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const result = await api<EquipoServicio[]>("/mobile/servicio-tecnico");
        if (active) {
          setItems(result);
          setError("");
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      } finally {
        running = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [api, attempt]);
  // A response that arrived after this tab was hidden must remain unread.
  useEffect(() => {
    if (!clienteId || error || loading) return;
    const markSeen = () => {
      if (document.visibilityState === "hidden") return;
      try {
        const latest = items.reduce(
          (max, r) => Math.max(max, Date.parse(r.actualizado_en) || 0),
          0,
        );
        const key = `raymer_servicio_visto_${clienteId}`;
        const previous = Date.parse(localStorage.getItem(key) || "") || 0;
        if (latest > previous)
          localStorage.setItem(key, new Date(latest).toISOString());
        window.dispatchEvent(new Event("servicio-visto"));
      } catch {
        /* El seguimiento sigue funcionando sin almacenamiento local. */
      }
    };
    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [items, clienteId, error, loading]);

  return (
    <>
      {loading && <p>Cargando equipos…</p>}
      {error && (
        <p role="alert">
          No pudimos actualizar tus equipos: {error}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </p>
      )}
      {!loading && !error && !items.length && (
        <div className="service-tracking-empty">
          <Icon name="monitor" />
          <p>
            Aún no tienes equipos vinculados a tu cuenta. Consulta en tienda al
            registrar tu equipo.
          </p>
        </div>
      )}
      <div className="service-equipment-list">
        {items.map((equipo) => (
          <ServiceEquipmentCard key={equipo.id} equipo={equipo} />
        ))}
      </div>
    </>
  );
}
