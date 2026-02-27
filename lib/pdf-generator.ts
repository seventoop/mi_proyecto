import { jsPDF } from "jspdf";

interface ReservaPDFData {
    // Reservation
    reservaId: string;
    fechaInicio: string;
    fechaVencimiento: string;
    montoSena: number | null;
    observaciones?: string;

    // Unit
    unidadNumero: string;
    unidadTipo: string;
    unidadSuperficie: number | null;
    unidadPrecio: number | null;
    unidadMoneda: string;

    // Project
    proyectoNombre: string;
    proyectoUbicacion: string | null;

    // Client
    clienteNombre: string;
    clienteEmail: string | null;
    clienteTelefono: string | null;

    // Seller
    vendedorNombre: string;
}

export function generateReservaPDF(data: ReservaPDFData): Buffer {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // ─── Header ───
    doc.setFillColor(37, 99, 235); // brand-600
    doc.rect(0, 0, pageW, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("DOCUMENTO DE RESERVA", pageW / 2, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(data.proyectoNombre, pageW / 2, 28, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Reserva #${data.reservaId.slice(-8).toUpperCase()}`, pageW / 2, 35, { align: "center" });

    y = 55;
    doc.setTextColor(30, 41, 59); // slate-800

    // ─── Section: Project Info ───
    drawSectionTitle(doc, "INFORMACIÓN DEL PROYECTO", y);
    y += 8;
    drawField(doc, "Proyecto:", data.proyectoNombre, 20, y);
    y += 7;
    drawField(doc, "Ubicación:", data.proyectoUbicacion || "—", 20, y);
    y += 12;

    // ─── Section: Unit Info ───
    drawSectionTitle(doc, "UNIDAD RESERVADA", y);
    y += 8;
    drawField(doc, "Unidad:", data.unidadNumero, 20, y);
    drawField(doc, "Tipo:", data.unidadTipo === "LOTE" ? "Lote" : "Departamento", 110, y);
    y += 7;
    drawField(doc, "Superficie:", data.unidadSuperficie ? `${data.unidadSuperficie} m²` : "—", 20, y);
    drawField(doc, "Precio:", data.unidadPrecio ? `$${data.unidadPrecio.toLocaleString()} ${data.unidadMoneda}` : "—", 110, y);
    y += 12;

    // ─── Section: Client Info ───
    drawSectionTitle(doc, "DATOS DEL CLIENTE", y);
    y += 8;
    drawField(doc, "Nombre:", data.clienteNombre, 20, y);
    y += 7;
    drawField(doc, "Email:", data.clienteEmail || "—", 20, y);
    drawField(doc, "Teléfono:", data.clienteTelefono || "—", 110, y);
    y += 12;

    // ─── Section: Reservation Terms ───
    drawSectionTitle(doc, "CONDICIONES DE LA RESERVA", y);
    y += 8;
    drawField(doc, "Fecha inicio:", formatDatePDF(data.fechaInicio), 20, y);
    drawField(doc, "Vencimiento:", formatDatePDF(data.fechaVencimiento), 110, y);
    y += 7;
    drawField(doc, "Seña:", data.montoSena ? `$${data.montoSena.toLocaleString()} ${data.unidadMoneda}` : "Sin seña requerida", 20, y);
    drawField(doc, "Vendedor:", data.vendedorNombre, 110, y);
    y += 12;

    if (data.observaciones) {
        drawField(doc, "Observaciones:", data.observaciones, 20, y);
        y += 10;
    }

    // ─── Terms ───
    y += 5;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, y, pageW - 20, y);
    y += 8;
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const terms = [
        "1. La presente reserva tiene carácter de opción de compra durante el plazo indicado.",
        "2. Vencido el plazo sin concretar la seña, la unidad quedará automáticamente disponible.",
        "3. El monto de seña indicado es condición para mantener la reserva vigente.",
        "4. Este documento no constituye boleto de compra-venta.",
    ];
    terms.forEach((t) => {
        doc.text(t, 20, y);
        y += 5;
    });

    // ─── Signatures ───
    y += 15;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);

    // Client signature
    doc.line(25, y, 85, y);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Firma del cliente", 55, y + 5, { align: "center" });
    doc.text(data.clienteNombre, 55, y + 10, { align: "center" });

    // Seller signature
    doc.line(125, y, 185, y);
    doc.text("Firma del vendedor", 155, y + 5, { align: "center" });
    doc.text(data.vendedorNombre, 155, y + 10, { align: "center" });

    // ─── Footer ───
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado el ${new Date().toLocaleString("es-AR")} — Gention Geodevia`, pageW / 2, footerY, { align: "center" });

    return Buffer.from(doc.output("arraybuffer"));
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(title, 20, y);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, y + 1.5, 190, y + 1.5);
}

function drawField(doc: jsPDF, label: string, value: string, x: number, y: number) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(value, x + doc.getTextWidth(label) + 2, y);
}

function formatDatePDF(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}
