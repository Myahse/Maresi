package com.maresi.api.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.Locale;
import java.util.UUID;

public final class PaymentReceiptPdf {
  private static final Color BRAND = new Color(13, 148, 136);
  private static final Color INK = new Color(15, 23, 42);
  private static final Color MUTED = new Color(100, 116, 139);
  private static final Color LINE = new Color(226, 232, 240);

  public record Data(
      UUID paymentId,
      UUID visitId,
      String title,
      String location,
      String checkIn,
      String checkOut,
      String guestName,
      String amount,
      String currency,
      String paidAt,
      String reference) {}

  private PaymentReceiptPdf() {}

  public static String filename(UUID paymentId) {
    return "recu-maresi-" + ref(paymentId).toLowerCase(Locale.ROOT) + ".pdf";
  }

  public static byte[] render(Data data) {
    try {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      Document document = new Document(PageSize.A4, 48, 48, 48, 52);
      PdfWriter.getInstance(document, out);
      document.open();

      Paragraph brand = new Paragraph(win("Maresi"), font(18, Font.BOLD, BRAND));
      brand.setSpacingAfter(2);
      document.add(brand);

      Paragraph kicker = new Paragraph(win("Reçu de paiement"), font(10, Font.NORMAL, MUTED));
      kicker.setSpacingAfter(14);
      document.add(kicker);

      Paragraph title = new Paragraph(win("Paiement confirmé"), font(20, Font.BOLD, INK));
      title.setSpacingAfter(6);
      document.add(title);

      Paragraph refLine =
          new Paragraph(
              win("Référence " + ref(data.paymentId()) + "  ·  Réservation validée"),
              font(10, Font.NORMAL, MUTED));
      refLine.setSpacingAfter(18);
      document.add(refLine);

      document.add(kvTable(data));

      Paragraph note =
          new Paragraph(
              win(
                  "Votre paiement a bien été reçu. Conservez ce document. "
                      + "Joignez aussi le reçu de votre opérateur (PDF ou image) dans vos visites."),
              font(10, Font.NORMAL, INK));
      note.setLeading(15);
      note.setSpacingBefore(20);
      document.add(note);

      Paragraph footer =
          new Paragraph(
              win("Document généré automatiquement par Maresi. https://ma-resi.com"),
              font(8, Font.NORMAL, MUTED));
      footer.setSpacingBefore(28);
      document.add(footer);

      document.close();
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("Could not generate payment receipt PDF", e);
    }
  }

  private static PdfPTable kvTable(Data data) {
    PdfPTable table = new PdfPTable(new float[] {34, 66});
    table.setWidthPercentage(100);
    row(table, "Client", data.guestName());
    row(table, "Résidence", data.title());
    row(table, "Adresse", data.location());
    row(table, "Arrivée", StayContractPdf.formatDate(data.checkIn()));
    row(table, "Départ", StayContractPdf.formatDate(data.checkOut()));
    row(table, "Montant", amountLine(data.amount(), data.currency()));
    row(table, "Date", StayContractPdf.formatStamp(data.paidAt()));
    row(table, "Référence", data.reference());
    row(table, "Statut", "Payé");
    return table;
  }

  private static void row(PdfPTable table, String label, String value) {
    if (value == null || value.isBlank()) return;
    PdfPCell left = new PdfPCell(new Phrase(win(label), font(9, Font.NORMAL, MUTED)));
    left.setBorderColor(LINE);
    left.setPadding(8);
    PdfPCell right = new PdfPCell(new Phrase(win(value), font(10, Font.BOLD, INK)));
    right.setBorderColor(LINE);
    right.setPadding(8);
    table.addCell(left);
    table.addCell(right);
  }

  private static String amountLine(String amount, String currency) {
    String paid = amount == null || amount.isBlank() ? "—" : amount.trim();
    String unit = currency == null || currency.isBlank() ? "XOF" : currency.trim().toUpperCase(Locale.ROOT);
    return paid + " " + unit;
  }

  private static Font font(int size, int style, Color color) {
    return new Font(Font.HELVETICA, size, style, color);
  }

  private static String ref(UUID id) {
    if (id == null) return "MARESI";
    return id.toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
  }

  private static String win(String raw) {
    if (raw == null) return "";
    return raw.replace('\u2019', '\'')
        .replace('\u2018', '\'')
        .replace('\u201C', '"')
        .replace('\u201D', '"')
        .replace('\u2013', '-')
        .replace('\u2014', '-')
        .replace('\u00A0', ' ')
        .replace("œ", "oe")
        .replace("Œ", "OE");
  }
}
