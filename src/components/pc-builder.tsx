"use client";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { asset, errorMessage, money, requestJson } from "@/lib/api";
import {
  highlights,
  PC_STEPS,
  readBuild,
  type PartKind,
  type PcPart,
  type PcQuote,
  type PcSelection,
  type PcIssue,
} from "@/lib/pc-builder";
import { Icon } from "./icons";
import { Pagination } from "./pagination";
const STORAGE = "raymer-pc-build-v1";
const PARTS_PER_PAGE = 12;
const PC_USES = [
  {
    value: "gaming",
    label: "Gaming",
    hint: "Juegos y streaming",
    icon: "gamepad",
  },
  {
    value: "oficina",
    label: "Estudio y oficina",
    hint: "Clases, documentos y videollamadas",
    icon: "monitor",
  },
  {
    value: "creacion",
    label: "Creación de contenido",
    hint: "Edición, diseño y trabajo 3D",
    icon: "chip",
  },
] as const;
const WHATSAPP = "https://wa.me/59172768877";
type Option = { producto_id: number; compatible: boolean; motivos: PcIssue[] };
type RecommendationResponse =
  | (PcQuote & { encontrado: true })
  | { encontrado: false; mensaje?: string };
type Recommendation =
  | { status: "loading" }
  | { status: "found"; quote: PcQuote }
  | { status: "empty" | "error"; message: string };
export function PcBuilder() {
  const [catalog, setCatalog] = useState<PcPart[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [items, setItems] = useState<PcSelection[]>([]),
    [hydrated, setHydrated] = useState(false),
    [step, setStep] = useState<PartKind>("cpu");
  const [uso, setUso] = useState("gaming"),
    [resolucion, setResolucion] = useState("1080p"),
    [budget, setBudget] = useState(7000);
  const [query, setQuery] = useState(""),
    [onlyCompatible, setOnlyCompatible] = useState(false),
    [sort, setSort] = useState("precio"),
    [page, setPage] = useState(1);
  const [options, setOptions] = useState<Option[] | null>(null),
    [quote, setQuote] = useState<PcQuote | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
      null,
    ),
    [budgetError, setBudgetError] = useState(false),
    [pdfBusy, setPdfBusy] = useState(false),
    [reload, setReload] = useState(0);
  const recommendationRequest = useRef<AbortController | null>(null);
  const budgetInput = useRef<HTMLInputElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const selectionVersion = useRef(0);
  useEffect(() => () => recommendationRequest.current?.abort(), []);
  useEffect(() => {
    let saved = null;
    try {
      saved = readBuild(
        window.location.hash.startsWith("#pc=")
          ? decodeURIComponent(window.location.hash.slice(4))
          : localStorage.getItem(STORAGE),
      );
    } catch {}
    if (saved) {
      setItems(saved.items);
      setUso(saved.uso);
      setResolucion(saved.resolucion);
      setBudget(saved.presupuesto);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      try {
        localStorage.setItem(
          STORAGE,
          JSON.stringify({ items, uso, resolucion, presupuesto: budget }),
        );
      } catch {}
  }, [items, uso, resolucion, budget, hydrated]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    requestJson<{ productos: PcPart[] }>("/mobile/armado-pc/catalogo", {
      signal: controller.signal,
    })
      .then((r) => setCatalog(r.productos))
      .catch((e) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  const payload = useMemo(
    () => ({ items, uso, resolucion }),
    [items, uso, resolucion],
  );
  useEffect(() => {
    if (!hydrated || loading || loadError) return;
    const controller = new AbortController();
    setQuote(null);
    setError("");
    const timer = setTimeout(
      () =>
        requestJson<PcQuote>("/mobile/armado-pc/evaluar", {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
          .then((r) => {
            if (!controller.signal.aborted) setQuote(r);
          })
          .catch((e) => {
            if (!controller.signal.aborted) setError(errorMessage(e));
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [payload, hydrated, loading, loadError, reload]);
  useEffect(() => {
    if (loading || loadError) return;
    const controller = new AbortController();
    setOptions(null);
    requestJson<Option[]>("/mobile/armado-pc/opciones", {
      method: "POST",
      body: JSON.stringify({ ...payload, tipo: step }),
      signal: controller.signal,
    })
      .then((r) => {
        if (!controller.signal.aborted) setOptions(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [payload, step, loading, loadError, reload]);
  const catalogById = useMemo(
    () => new Map(catalog.map((part) => [part.producto_id, part])),
    [catalog],
  );
  const optionsById = useMemo(
    () => new Map(options?.map((option) => [option.producto_id, option])),
    [options],
  );
  const chosen = items.map((i) => ({
    item: i,
    part: catalogById.get(i.producto_id),
  }));
  const active = PC_STEPS.find((s) => s.key === step)!;
  const compatibleFilter = onlyCompatible ? optionsById : null;
  const displayed = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog
      .filter(
        (p) =>
          p.ficha.tipo_componente === step &&
          `${p.nombre} ${p.marca || ""} ${p.modelo || ""}`
            .toLowerCase()
            .includes(term) &&
          (!compatibleFilter ||
            compatibleFilter.get(p.producto_id)?.compatible),
      )
      .sort((a, b) =>
        sort === "nombre"
          ? a.nombre.localeCompare(b.nombre)
          : sort === "precio-desc"
            ? b.precio_venta - a.precio_venta
            : a.precio_venta - b.precio_venta,
      );
  }, [catalog, step, query, compatibleFilter, sort]);
  const pages = Math.max(1, Math.ceil(displayed.length / PARTS_PER_PAGE));
  const currentPage = Math.min(page, pages);
  const progress = PC_STEPS.filter((s) =>
    chosen.some((c) => c.part?.ficha.tipo_componente === s.key),
  ).length;
  const estimated = chosen.reduce(
    (n, c) => n + (c.part?.precio_venta || 0) * c.item.cantidad,
    0,
  );
  const total = quote?.total ?? estimated;
  const recommending = recommendation?.status === "loading";
  const proposed =
    recommendation?.status === "found" ? recommendation.quote : null;
  const validBudget =
    Number.isFinite(budget) && budget >= 100 && budget <= 1000000;
  const useLabel = PC_USES.find((option) => option.value === uso)?.label ?? uso;
  const advisorUrl = `${WHATSAPP}?text=${encodeURIComponent(
    `Hola Raymer, quiero ayuda para armar una PC para ${useLabel.toLowerCase()} (${resolucion}) con un presupuesto de ${money(budget)}.`,
  )}`;
  const change = (next: PcSelection[]) => {
    selectionVersion.current++;
    setItems(next);
    setQuote(null);
    setNotice("");
  };
  function showStep(kind: PartKind) {
    setStep(kind);
    setQuery("");
    setPage(1);
  }
  function choose(p: PcPart) {
    change([
      ...items.filter(
        (i) =>
          catalogById.get(i.producto_id)?.ficha.tipo_componente !==
          p.ficha.tipo_componente,
      ),
      { producto_id: p.producto_id, cantidad: 1 },
    ]);
    const idx = PC_STEPS.findIndex((s) => s.key === step);
    const next = PC_STEPS[idx + 1];
    if (next) showStep(next.key);
  }
  function clearRecommendation() {
    recommendationRequest.current?.abort();
    recommendationRequest.current = null;
    setRecommendation(null);
  }
  async function recommend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validBudget) {
      setBudgetError(true);
      budgetInput.current?.focus();
      return;
    }
    if (recommendationRequest.current || !hydrated || loading || loadError)
      return;
    const controller = new AbortController();
    recommendationRequest.current = controller;
    setRecommendation({ status: "loading" });
    try {
      const r = await requestJson<RecommendationResponse>(
        "/mobile/armado-pc/recomendar",
        {
          method: "POST",
          body: JSON.stringify({ presupuesto: budget, uso, resolucion }),
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      if (!r.encontrado) {
        setRecommendation({
          status: "empty",
          message:
            r.mensaje ||
            "Ajusta el presupuesto o consulta a un asesor de Raymer.",
        });
      } else if (r.total > budget) {
        setRecommendation({
          status: "empty",
          message:
            "El precio actualizado supera tu presupuesto. Vuelve a buscar o ajusta el monto.",
        });
      } else {
        setRecommendation({ status: "found", quote: r });
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setRecommendation({ status: "error", message: errorMessage(e) });
      }
    } finally {
      if (recommendationRequest.current === controller)
        recommendationRequest.current = null;
    }
  }
  function applyRecommendation(proposal: PcQuote) {
    // La propuesta puede incluir productos publicados después de cargar el catálogo.
    const parts = new Map(
      proposal.items.map(({ producto }) => [producto.producto_id, producto]),
    );
    setCatalog((current) => [
      ...current.filter((part) => !parts.has(part.producto_id)),
      ...parts.values(),
    ]);
    change(
      proposal.items.map(({ producto, cantidad }) => ({
        producto_id: producto.producto_id,
        cantidad,
      })),
    );
    clearRecommendation();
    summaryHeading.current?.focus({ preventScroll: true });
    document.getElementById("mi-pc")?.scrollIntoView({ block: "start" });
  }
  async function freshQuote() {
    const version = selectionVersion.current;
    const r = await requestJson<PcQuote>("/mobile/armado-pc/evaluar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (version !== selectionVersion.current)
      throw new Error(
        "El armado cambió mientras se cotizaba. Intenta descargar de nuevo.",
      );
    setQuote(r);
    return r;
  }
  function quoteText(q: PcQuote) {
    return `Hola Raymer, quiero cotizar mi PC para ${uso} (${resolucion}).\n${q.items.map((i) => `• ${i.producto.nombre} ×${i.cantidad}: ${money(i.subtotal)}`).join("\n")}\nTotal referencial: ${money(q.total)}\n${q.validacion.listo ? "Equipo completo según las fichas verificadas." : "Selección incompleta o con observaciones."}\n${q.validacion.issues.map((i) => i.message).join("\n")}\nSin reserva de stock. ¿Pueden revisar el armado y confirmar disponibilidad?`;
  }
  async function pdf() {
    setPdfBusy(true);
    setError("");
    try {
      const q = await freshQuote();
      const { createQuotationPdf, quotationFilename } = await import(
        "@/lib/quotation-pdf"
      );
      const rows = q.items.flatMap((i) => {
        const cents = Math.round(i.subtotal * 100),
          base = Math.floor(cents / i.cantidad),
          extra = cents % i.cantidad;
        return [
          ...(i.cantidad - extra
            ? [
                {
                  producto: { ...i.producto, precio_venta: base / 100 },
                  cantidad: i.cantidad - extra,
                },
              ]
            : []),
          ...(extra
            ? [
                {
                  producto: { ...i.producto, precio_venta: (base + 1) / 100 },
                  cantidad: extra,
                },
              ]
            : []),
        ];
      });
      const doc = await createQuotationPdf(rows, new Date(q.emitido_en));
      doc.addPage();
      doc.setFontSize(18);
      doc.text("Tu PC · Revisión del armado", 20, 25);
      doc.setFontSize(10);
      const notes = [
        `Uso: ${uso}. Resolución: ${resolucion}.`,
        q.validacion.listo
          ? "Configuración completa según las fichas publicadas."
          : q.validacion.completo
            ? "Equipo completo con observaciones: requiere revisión antes del montaje."
            : "Selección parcial: revisa las piezas y observaciones.",
        ...q.validacion.faltantes.map(
          (k) => `Falta: ${PC_STEPS.find((s) => s.key === k)?.label || k}`,
        ),
        ...q.validacion.issues.map((i) => i.message),
        `Fuente recomendada: ${q.validacion.fuente_recomendada_w} W (estimación).`,
        "Las gamas son orientativas. No garantizamos FPS ni ausencia de cuello de botella.",
        "Verificar BIOS, montaje, cables y refrigeración final con un técnico.",
        "Cotización referencial: no reserva inventario.",
      ];
      let y = 40;
      for (const n of notes) {
        const lines = doc.splitTextToSize(n, 170);
        if (y + lines.length * 5 > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, 20, y);
        y += lines.length * 5 + 5;
      }
      await doc.save(quotationFilename(new Date(q.emitido_en)), {
        returnPromise: true,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPdfBusy(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/arma-tu-pc#pc=${encodeURIComponent(JSON.stringify({ ...payload, presupuesto: budget }))}`,
      );
      setNotice(
        "Enlace copiado. Al abrirlo se comprobarán precios y disponibilidad actuales.",
      );
    } catch {
      setNotice(
        "No se pudo copiar el enlace. Tu armado sigue guardado en este navegador.",
      );
    }
  }
  return (
    <div className="pc-builder">
      <section className="pc-hero">
        <div className="pc-hero-copy">
          <Link href="/productos" className="pc-breadcrumb">
            RAYMER / CONFIGURADOR
          </Link>
          <div className="pc-live">
            <span /> TÚ ELIGES. NOSOTROS TE ACOMPAÑAMOS.
          </div>
          <h1>
            No es cualquier PC.
            <br />
            Es <em>tu próxima PC.</em>
          </h1>
          <p>
            De la primera pieza al equipo que imaginas. Construye a tu ritmo,
            comprueba compatibilidad y cotiza con nuestro inventario.
          </p>
          <div className="pc-hero-actions">
            <a href="#pc-recommendation" className="button button-primary">
              <Icon name="spark" /> Recomiéndame una PC
            </a>
            <a href="#pc-workbench">
              Elegir piezas por mi cuenta <Icon name="arrow" />
            </a>
          </div>
          <div className="pc-promises">
            <span>
              <Icon name="shield" /> Compatibilidad explicada
            </span>
            <span>
              <Icon name="bag" /> Precios en bolivianos
            </span>
          </div>
        </div>
        <div className="pc-hero-visual" aria-hidden="true">
          <div className="pc-orbit" />
          <div className="pc-tower">
            <div className="pc-tower-top" />
            <div className="pc-tower-glass">
              <div className="pc-board-lines" />
              <div className="pc-cpu-block">R</div>
              <div className="pc-ram-lines">
                <i />
                <i />
              </div>
              <div className="pc-gpu-block">RAYMER / BUILD</div>
            </div>
            <div className="pc-fans">
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="pc-float pc-float-a">01 / ELIGE TU POTENCIA</span>
          <span className="pc-float pc-float-b">
            HECHA PARA TI <Icon name="spark" />
          </span>
          <span className="pc-visual-caption">
            TU SETUP EMPIEZA CON UNA IDEA.
          </span>
        </div>
      </section>
      <section
        id="pc-recommendation"
        className="pc-planner"
        aria-labelledby="pc-planner-title"
      >
        <div>
          <span className="eyebrow">ARMA TU PC</span>
          <h2 id="pc-planner-title">Recomiéndame una PC</h2>
          <p>
            Cuéntanos para qué la necesitas y cuánto quieres invertir.
            Buscaremos un equipo completo con piezas disponibles en Raymer.
          </p>
        </div>
        <form className="pc-planner-form" onSubmit={recommend} noValidate>
          <fieldset className="pc-use-options">
            <legend>¿Para qué la vas a usar?</legend>
            <div>
              {PC_USES.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="uso"
                    value={option.value}
                    checked={uso === option.value}
                    onChange={() => {
                      clearRecommendation();
                      selectionVersion.current++;
                      setQuote(null);
                      setUso(option.value);
                    }}
                  />
                  <Icon name={option.icon} />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="pc-planner-fields">
            <label>
              Resolución de tu monitor
              <select
                value={resolucion}
                onChange={(e) => {
                  clearRecommendation();
                  selectionVersion.current++;
                  setQuote(null);
                  setResolucion(e.target.value);
                }}
              >
                <option value="1080p">Full HD · 1080p</option>
                <option value="1440p">QHD · 1440p</option>
                <option value="4k">Ultra HD · 4K</option>
              </select>
            </label>
            <label>
              Presupuesto máximo (Bs)
              <input
                ref={budgetInput}
                type="number"
                min="100"
                max="1000000"
                step="any"
                required
                value={budget || ""}
                aria-invalid={budgetError}
                aria-describedby={budgetError ? "pc-budget-error" : undefined}
                onChange={(e) => {
                  clearRecommendation();
                  setBudgetError(false);
                  setBudget(Number(e.target.value));
                }}
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={!hydrated || loading || !!loadError || recommending}
            >
              <Icon name="spark" />
              {recommending ? "Buscando combinación…" : "Buscar mi PC"}
            </button>
          </div>
          {budgetError && (
            <p className="pc-planner-error" id="pc-budget-error" role="alert">
              Ingresa un presupuesto entre Bs 100 y Bs 1.000.000.
            </p>
          )}
        </form>
        <div role="status" className="pc-planner-status">
          {loading
            ? "Cargando el catálogo de componentes…"
            : recommending
              ? "Comprobando combinaciones y precios…"
              : proposed
                ? "Encontramos un equipo dentro de tu presupuesto."
                : ""}
        </div>
        {loadError && (
          <div className="pc-proposal" role="alert">
            <h3>No pudimos cargar el catálogo.</h3>
            <button className="button" onClick={() => setReload((v) => v + 1)}>
              Volver a intentar
            </button>
          </div>
        )}
        {recommendation &&
          (recommendation.status === "empty" ||
            recommendation.status === "error") && (
            <div
              className="pc-proposal"
              role={recommendation.status === "error" ? "alert" : "status"}
            >
              <h3>
                {recommendation.status === "error"
                  ? "No pudimos buscar tu PC"
                  : "Sin propuesta para este presupuesto"}
              </h3>
              <p>{recommendation.message}</p>
              <div className="pc-proposal-actions">
                <a
                  href={advisorUrl}
                  className="button pc-whatsapp"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="chat" /> Consultar por WhatsApp
                </a>
                <a className="text-link" href="#pc-workbench">
                  Elegir piezas manualmente <Icon name="arrow" />
                </a>
              </div>
            </div>
          )}
        {proposed && (
          <article className="pc-proposal" aria-labelledby="pc-proposal-title">
            <div className="pc-proposal-heading">
              <div>
                <span className="eyebrow">EQUIPO RECOMENDADO</span>
                <h3 id="pc-proposal-title">
                  Tu PC para {useLabel.toLowerCase()}
                </h3>
                <p>
                  {resolucion.toUpperCase()} · {proposed.items.length}{" "}
                  componentes
                </p>
              </div>
              <div className="pc-proposal-price">
                <span>Total de la propuesta</span>
                <strong>{money(proposed.total)}</strong>
                <small>
                  {budget > proposed.total
                    ? `${money(budget - proposed.total)} de margen`
                    : "Dentro de tu presupuesto"}
                </small>
              </div>
            </div>
            <dl className="pc-proposal-parts">
              {PC_STEPS.map((category) => {
                const item = proposed.items.find(
                  ({ producto }) =>
                    producto.ficha.tipo_componente === category.key,
                );
                const included =
                  category.key === "gpu"
                    ? "Gráficos integrados"
                    : category.key === "cooler"
                      ? "Disipador incluido con el procesador"
                      : null;
                if (!item && !included) return null;
                return (
                  <div key={category.key}>
                    <dt>{category.label}</dt>
                    <dd>{item?.producto.nombre ?? included}</dd>
                  </div>
                );
              })}
            </dl>
            {proposed.validacion.issues.length > 0 && (
              <ul className="pc-proposal-warnings">
                {proposed.validacion.issues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            )}
            <div className="pc-proposal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => applyRecommendation(proposed)}
              >
                {items.length
                  ? "Reemplazar mi armado"
                  : "Usar esta configuración"}{" "}
                <Icon name="arrow" />
              </button>
              <span>Podrás ajustar las piezas y descargar la cotización.</span>
            </div>
          </article>
        )}
      </section>
      <div id="pc-workbench" className="pc-workbench">
        <aside className="pc-steps" aria-label="Componentes del armado">
          <div className="pc-step-heading">
            <b>TU ARMADO</b>
            <span>{progress} / 8 categorías</span>
          </div>
          <div className="pc-progress">
            <span style={{ width: `${(progress / 8) * 100}%` }} />
          </div>
          {PC_STEPS.map((s, i) => {
            const picked = chosen.find(
              (c) => c.part?.ficha.tipo_componente === s.key,
            );
            return (
              <button
                key={s.key}
                className={step === s.key ? "selected" : ""}
                onClick={() => showStep(s.key)}
                aria-current={step === s.key ? "step" : undefined}
              >
                <span className={picked ? "done" : ""}>
                  {picked ? (
                    <Icon name="check" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  {s.label}
                  <small>
                    {picked
                      ? "Seleccionado"
                      : s.key === "gpu" || s.key === "cooler"
                        ? "Según tu configuración"
                        : "Por elegir"}
                  </small>
                </span>
                <b>›</b>
              </button>
            );
          })}
          <p>
            El avance cuenta categorías. La revisión indica si tu equipo está
            completo.
          </p>
        </aside>
        <section
          className="pc-candidates"
          aria-label="Selección de componentes"
        >
          <div className="pc-candidate-heading">
            <span className="eyebrow">
              PASO{" "}
              {String(PC_STEPS.findIndex((s) => s.key === step) + 1).padStart(
                2,
                "0",
              )}{" "}
              / TU EQUIPO, PIEZA A PIEZA
            </span>
            <h2>
              {active.label}
              <span>.</span>
            </h2>
            <p>{active.hint}</p>
          </div>
          {(notice || error) && (
            <div
              className={error ? "error" : "pc-notice"}
              role={error ? "alert" : "status"}
            >
              {error || notice}
              <button
                aria-label="Cerrar aviso"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                ×
              </button>
            </div>
          )}
          {loadError ? (
            <div className="pc-empty">
              <Icon name="tools" />
              <h3>Estamos preparando el taller.</h3>
              <p>{loadError}</p>
              <button onClick={() => setReload((v) => v + 1)}>
                Volver a intentar
              </button>
              <a
                href="https://wa.me/59172768877"
                target="_blank"
                rel="noreferrer"
              >
                Consultar a un asesor ↗
              </a>
            </div>
          ) : loading ? (
            <div className="pc-loading" role="status">
              Cargando componentes del inventario…
            </div>
          ) : (
            <>
              <div id="pc-part-filters" className="pc-filters">
                <label className="pc-search">
                  <span className="sr-only">Buscar componente</span>
                  <input
                    placeholder="Buscar por nombre o marca…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  <span className="sr-only">Ordenar componentes</span>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="precio">Menor precio</option>
                    <option value="precio-desc">Mayor precio</option>
                    <option value="nombre">Nombre</option>
                  </select>
                </label>
              </div>
              <div className="pc-result-line">
                <span>{displayed.length} opciones</span>
                <label>
                  <input
                    type="checkbox"
                    checked={onlyCompatible}
                    onChange={(e) => {
                      setOnlyCompatible(e.target.checked);
                      setPage(1);
                    }}
                  />{" "}
                  Solo compatibles{options === null ? " · comprobando…" : ""}
                </label>
              </div>
              {onlyCompatible && options === null && !error ? (
                <div className="pc-loading" role="status">
                  Comprobando compatibilidad…
                </div>
              ) : !displayed.length ? (
                <div className="pc-empty">
                  <Icon name="chip" />
                  <h3>
                    {query || onlyCompatible
                      ? "No hay piezas con estos filtros."
                      : "Próximas piezas en el taller."}
                  </h3>
                  <p>
                    {query || onlyCompatible
                      ? "Prueba otra búsqueda o muestra todas las piezas para revisar los conflictos."
                      : "Todavía no hay fichas técnicas publicadas para esta categoría. Nuestro equipo puede ayudarte a completar tu configuración."}
                  </p>
                  {(query || onlyCompatible) && (
                    <button
                      onClick={() => {
                        setQuery("");
                        setOnlyCompatible(false);
                        setPage(1);
                      }}
                    >
                      Quitar filtros
                    </button>
                  )}
                  <a
                    href={`https://wa.me/59172768877?text=${encodeURIComponent(`Hola Raymer, quiero armar una PC y necesito ayuda con ${active.label.toLowerCase()}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar por WhatsApp ↗
                  </a>
                </div>
              ) : (
                <div className="pc-product-grid">
                  {displayed
                    .slice(
                      (currentPage - 1) * PARTS_PER_PAGE,
                      currentPage * PARTS_PER_PAGE,
                    )
                    .map((p) => {
                      const opt = optionsById.get(p.producto_id),
                        selected = items.some(
                          (i) => i.producto_id === p.producto_id,
                        );
                      return (
                        <article
                          className={`pc-part-card ${selected ? "picked" : ""}`}
                          key={p.producto_id}
                        >
                          <div className="pc-part-image">
                            <img
                              src={asset(p.imagen_url)}
                              alt={p.nombre}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/no-product.svg";
                              }}
                            />
                            <span
                              className={!p.stock_disponible ? "no-stock" : ""}
                            >
                              {p.stock_disponible > 0
                                ? "Disponible"
                                : "Sin stock"}
                            </span>
                          </div>
                          <div className="pc-part-body">
                            <small>{p.marca || active.label}</small>
                            <h3>{p.nombre}</h3>
                            <div className="pc-spec-tags">
                              {highlights(p).map((s, i) => (
                                <span key={i}>{s}</span>
                              ))}
                            </div>
                            <div
                              className={`pc-fit ${opt?.compatible ? "good" : opt ? "bad" : ""}`}
                            >
                              {selected
                                ? "✓ En tu armado"
                                : opt
                                  ? opt.compatible
                                    ? "✓ Sin conflictos con tu selección"
                                    : "! Revisa la combinación"
                                  : "Comprobando compatibilidad…"}
                            </div>
                            {opt && !opt.compatible && (
                              <p className="pc-fit-reason">
                                {
                                  opt.motivos.find(
                                    (m) => m.severity === "error",
                                  )?.message
                                }
                              </p>
                            )}
                            <div className="pc-part-bottom">
                              <div>
                                <small>PRECIO REFERENCIAL</small>
                                <strong>{money(p.precio_venta)}</strong>
                              </div>
                              <button
                                disabled={
                                  !p.stock_disponible || selected || !opt
                                }
                                onClick={() => choose(p)}
                                aria-label={`Elegir ${p.nombre}`}
                              >
                                {selected ? (
                                  <Icon name="check" />
                                ) : (
                                  <>
                                    Elegir <span>+</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}
              {pages > 1 && (
                <Pagination
                  current={currentPage}
                  pages={pages}
                  totalItems={displayed.length}
                  pageSize={PARTS_PER_PAGE}
                  onChange={(target) => {
                    setPage(target);
                    document
                      .getElementById("pc-part-filters")
                      ?.scrollIntoView({ block: "start" });
                  }}
                />
              )}
            </>
          )}
        </section>
        <aside id="mi-pc" className="pc-summary" aria-label="Resumen de mi PC">
          <div className="pc-summary-title">
            <span className="eyebrow">ESTÁS CREANDO ALGO TUYO</span>
            <h2 ref={summaryHeading} tabIndex={-1}>
              Mi próxima PC
              <Icon name="cube" />
            </h2>
            <div
              className={`pc-status ${quote?.validacion.listo ? "ready" : ""}`}
              role="status"
            >
              {!items.length
                ? "Elige tu primera pieza"
                : error
                  ? "Revisión pendiente"
                  : !quote
                    ? "Comprobando tu selección…"
                    : quote.validacion.listo
                      ? "✓ Equipo completo y sin conflictos"
                      : quote.validacion.compatible
                        ? quote.validacion.completo
                          ? "Equipo completo · requiere revisión"
                          : "Sin conflictos · faltan piezas"
                        : "Hay conflictos por resolver"}
            </div>
          </div>
          <div className="pc-summary-parts">
            {PC_STEPS.map((s) => {
              const c = chosen.find(
                (c) => c.part?.ficha.tipo_componente === s.key,
              );
              return (
                <div key={s.key} className={c ? "filled" : ""}>
                  <button
                    className="pc-summary-category"
                    onClick={() => showStep(s.key)}
                  >
                    <span>{s.short}</span>
                    <div>
                      <small>{s.label}</small>
                      <b>{c?.part?.nombre || "Por elegir"}</b>
                    </div>
                  </button>
                  {c && (
                    <div className="pc-summary-actions">
                      {["ram", "ssd"].includes(s.key) && (
                        <label>
                          <span className="sr-only">Cantidad de {s.label}</span>
                          <select
                            value={c.item.cantidad}
                            onChange={(e) =>
                              change(
                                items.map((i) =>
                                  i.producto_id === c.item.producto_id
                                    ? { ...i, cantidad: Number(e.target.value) }
                                    : i,
                                ),
                              )
                            }
                          >
                            {Array.from(
                              {
                                length: Math.min(
                                  4,
                                  c.part?.stock_disponible || 1,
                                ),
                              },
                              (_, i) => (
                                <option key={i} value={i + 1}>
                                  ×{i + 1}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      )}
                      <button
                        aria-label={`Quitar ${s.label}`}
                        onClick={() =>
                          change(
                            items.filter(
                              (i) => i.producto_id !== c.item.producto_id,
                            ),
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {chosen
              .filter((c) => !c.part)
              .map((c) => (
                <div key={c.item.producto_id}>
                  <span>Una pieza ya no está disponible.</span>
                  <button
                    onClick={() =>
                      change(
                        items.filter(
                          (i) => i.producto_id !== c.item.producto_id,
                        ),
                      )
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
          </div>
          {quote && items.length > 0 && (
            <div className="pc-checks">
              <h3>
                <Icon name="shield" /> Revisión del equipo
              </h3>
              {quote.validacion.faltantes.length > 0 && (
                <p>
                  Falta elegir:{" "}
                  {quote.validacion.faltantes
                    .map((k) => PC_STEPS.find((s) => s.key === k)?.label)
                    .join(", ")}
                  .
                </p>
              )}
              {quote.validacion.issues.map((issue, i) => (
                <p
                  key={i}
                  className={
                    issue.severity === "error"
                      ? "pc-issue-error"
                      : "pc-issue-warning"
                  }
                >
                  {issue.severity === "error" ? "!" : "○"} {issue.message}
                </p>
              ))}
              <div className="pc-power">
                <span>
                  Consumo estimado<b>{quote.validacion.consumo_w} W</b>
                </span>
                <span>
                  Fuente sugerida
                  <b>≥ {quote.validacion.fuente_recomendada_w} W</b>
                </span>
              </div>
              <small>
                Orientación por fichas y gama. La revisión final de BIOS,
                montaje y refrigeración corresponde a un técnico.
              </small>
            </div>
          )}
          <div className="pc-total">
            <span>
              {quote ? "Total verificado ahora" : "Total referencial"}
            </span>
            <strong>{money(total)}</strong>
            {validBudget && total > budget && (
              <small className="pc-over-budget">
                Supera tu presupuesto en {money(total - budget)}.
              </small>
            )}
          </div>
          <div className="pc-summary-buttons">
            <button
              className="button button-primary"
              onClick={pdf}
              disabled={!items.length || !quote || pdfBusy}
            >
              <Icon name="bag" />
              {pdfBusy ? "Generando cotización…" : "Descargar cotización"}
            </button>
            {quote && items.length > 0 && (
              <a
                className="button pc-whatsapp"
                href={`https://wa.me/59172768877?text=${encodeURIComponent(quoteText(quote))}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="chat" /> Revisar con un asesor
              </a>
            )}
            <button onClick={share} disabled={!items.length}>
              Compartir mi armado ↗
            </button>
            {items.length > 0 && (
              <button
                className="pc-reset"
                onClick={() => {
                  if (
                    window.confirm("¿Quitar todas las piezas de este armado?")
                  )
                    change([]);
                }}
              >
                Empezar de nuevo
              </button>
            )}
            <p>
              Tu armado se guarda en este navegador. Cotizar no reserva stock.
              Precios sujetos a confirmación.
            </p>
          </div>
        </aside>
      </div>
      <a className="pc-mobile-summary" href="#mi-pc">
        <span>Ver mi PC · {progress} categorías</span>
        <strong>{money(total)} ↓</strong>
      </a>
      <section className="pc-how">
        <div>
          <span>01</span>
          <h3>Elige tu objetivo.</h3>
          <p>Presupuesto y uso para orientar tus elecciones.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Encuentra tu combinación.</h3>
          <p>Revisa piezas, conexiones y espacio con cada cambio.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Hagámosla realidad.</h3>
          <p>Lleva tu cotización a nuestro equipo para revisar el montaje.</p>
        </div>
      </section>
    </div>
  );
}
