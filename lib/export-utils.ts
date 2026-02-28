// jsPDF + autotable loaded dynamically to reduce initial bundle size
import { MasterplanUnit } from "./masterplan-store";
import { formatCurrency } from "./utils";

export const generateUnitPDF = async (unit: MasterplanUnit) => {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Brand Colors
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SevenToop Real Estate", 20, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("FICHA TÉCNICA DE PROPIEDAD", pageWidth - 20, 25, { align: "right" });

    // Unit Title
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Unidad: ${unit.numero}`, 20, 60);

    // Status Badge
    const statusColor = unit.estado === "DISPONIBLE" ? [16, 185, 129] : [245, 158, 11];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageWidth - 60, 52, 40, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(unit.estado, pageWidth - 40, 58, { align: "center" });

    // Content Table
    (doc as any).autoTable({
        startY: 75,
        theme: "striped",
        headStyles: { fillColor: [51, 65, 85] },
        body: [
            ["Tipo de Propiedad", unit.tipo],
            ["Superficie Total", `${unit.superficie || "—"} m²`],
            ["Frente", `${unit.frente || "—"} m`],
            ["Fondo", `${unit.fondo || "—"} m`],
            ["Orientación", unit.orientacion || "—"],
            ["Esquina", unit.esEsquina ? "SÍ" : "NO"],
            ["Precio de Lista", `${formatCurrency(unit.precio || 0)} ${unit.moneda}`],
            ["Ubicación", `${unit.manzanaNombre || "—"}, ${unit.etapaNombre || "—"}`],
        ],
        margin: { left: 20 },
        styles: { fontSize: 11, cellPadding: 5 }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Documento generado automáticamente por SevenToop AI Engine.", 20, finalY);
    doc.text("La disponibilidad y precio pueden variar sin previo aviso.", 20, finalY + 5);

    // Save
    doc.save(`Ficha-${unit.numero}.pdf`);
};
