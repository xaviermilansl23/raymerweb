import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/servicio-tecnico.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
const { puedeConsultarServicio, servicioWhatsApp } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const equipo = {
  id: "81c5c915-4255-4815-90d3-39cba89ad9af",
  tipo: "LAPTOP",
  marca: "Marca & prueba",
  modelo: "Modelo + 15",
  estado: "DIAGNOSTICADO",
  diagnostico: "Requiere mantenimiento",
};

test("WhatsApp está disponible a partir del diagnóstico y requiere un diagnóstico publicado", () => {
  for (const estado of ["RECIBIDO", "EN_REVISION", "DESCONOCIDO"]) {
    assert.equal(puedeConsultarServicio({ ...equipo, estado }), false);
    assert.equal(servicioWhatsApp({ ...equipo, estado }), null);
  }
  for (const estado of ["DIAGNOSTICADO", "LISTO", "CANCELADO", "ENTREGADO"]) {
    assert.equal(puedeConsultarServicio({ ...equipo, estado }), true);
    assert.equal(
      servicioWhatsApp({ ...equipo, estado, diagnostico: null }),
      null,
    );
    assert.equal(
      servicioWhatsApp({ ...equipo, estado, diagnostico: "  " }),
      null,
    );
  }
});

test("la consulta identifica el equipo y abre el número de la tienda sin autorizar acciones", () => {
  const url = new URL(servicioWhatsApp(equipo));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/59172768877");
  const mensaje = url.searchParams.get("text");
  assert.ok(mensaje.includes(equipo.id));
  assert.ok(mensaje.includes("LAPTOP Marca & prueba Modelo + 15"));
  assert.ok(mensaje.includes("coordinar cómo continuar"));
  assert.equal([...url.searchParams.keys()].join(","), "text");
});
