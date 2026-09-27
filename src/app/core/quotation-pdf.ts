import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CotizacionItem } from './cotizacion.service';

const money = (cents: number) => `Bs ${(cents / 100).toFixed(2)}`;

const LOGO_URL = 'favicon.png';

let logoSrcPromise: Promise<string | null> | null = null;

/** Carga el logo de la empresa (public/favicon.png) una sola vez. */
function cargarLogo(): Promise<string | null> {
  if (!logoSrcPromise) {
    logoSrcPromise = fetch(LOGO_URL)
      .then((resp) => (resp.ok ? resp.blob() : null))
      .then(
        (blob) =>
          new Promise<string | null>((resolve) => {
            if (!blob) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return logoSrcPromise;
}

export function quotationFilename(date: Date): string {
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
  return `cotizacion-raymer-${stamp}.pdf`;
}

/** Documento local: no crea pedidos ni guarda cotizaciones en el servidor. */
export async function createQuotationPdf(items: readonly CotizacionItem[], date = new Date()): Promise<jsPDF> {
  if (!items.length || items.some(({ cantidad, producto }) =>
    !Number.isSafeInteger(cantidad) || cantidad <= 0 ||
    !Number.isFinite(producto.precio_venta) || producto.precio_venta < 0)) {
    throw new Error('La cotización debe contener productos y cantidades válidas.');
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Cotización de productos - RAYMER', author: 'CORPRAYMER S.R.L.', subject: 'Cotización temporal del catálogo web' });
  doc.setCreationDate(date);
  const logoSrc = await cargarLogo();
  const dateLabel = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
  const drawHeader = () => {
    doc.setFillColor(21, 23, 31);
    doc.rect(0, 0, 210, 40, 'F');
    if (logoSrc) {
      doc.addImage(logoSrc, 'PNG', 20, 10, 20, 20);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(21);
    doc.text('CORPRAYMER S.R.L.', 46, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Tecnología en tus Manos', 46, 26);
    doc.setFontSize(12);
    doc.text('Cotización de productos', 190, 17, { align: 'right' });
    doc.setFontSize(8);
    doc.text(dateLabel, 190, 26, { align: 'right' });
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(1);
    doc.line(20, 34, 190, 34);
  };
  const totalCents = items.reduce((sum, item) => sum + Math.round(item.producto.precio_venta * 100) * item.cantidad, 0);
  if (!Number.isSafeInteger(totalCents)) throw new Error('El total excede el límite admitido.');

  autoTable(doc, {
    startY: 50,
    margin: { top: 50, right: 20, bottom: 25, left: 20 },
    head: [['#', 'Producto', 'Cant.', 'Precio unitario', 'Subtotal']],
    body: items.map((item, index) => [
      String(index + 1), item.producto.nombre, String(item.cantidad),
      money(Math.round(item.producto.precio_venta * 100)),
      money(Math.round(item.producto.precio_venta * 100) * item.cantidad),
    ]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: [26, 26, 26], overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [240, 242, 245], textColor: [70, 78, 88], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: {
      0: { cellWidth: 10 }, 1: { cellWidth: 76 }, 2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 34, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' },
    },
    rowPageBreak: 'avoid',
    didDrawPage: drawHeader,
  });
  let y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  if (y > 230) { doc.addPage(); drawHeader(); y = 50; }
  doc.setFillColor(240, 242, 245);
  doc.roundedRect(20, y, 170, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(11);
  doc.text('Total estimado', 25, y + 11);
  doc.setFontSize(14);
  doc.text(money(totalCents), 185, y + 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 98, 110);
  doc.text('Precios referenciales sujetos a confirmación de disponibilidad y condiciones comerciales.', 20, y + 28, { maxWidth: 170 });
  doc.text('Esta cotización no constituye una factura ni una reserva de productos.', 20, y + 40, { maxWidth: 170 });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(.2);
    doc.line(20, 278, 190, 278);
    doc.setFontSize(8);
    doc.setTextColor(90, 98, 110);
    doc.text('CORPRAYMER S.R.L.  |  WhatsApp: +591 72768877', 20, 285);
    doc.text(`Página ${page} de ${pages}`, 190, 285, { align: 'right' });
  }
  return doc;
}
