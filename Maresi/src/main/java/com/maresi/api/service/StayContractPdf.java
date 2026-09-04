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
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class StayContractPdf {
  private static final Color BRAND = new Color(13, 148, 136);
  private static final Color INK = new Color(15, 23, 42);
  private static final Color MUTED = new Color(100, 116, 139);
  private static final Color LINE = new Color(226, 232, 240);
  private static final ZoneId ABIDJAN = ZoneId.of("Africa/Abidjan");
  private static final DateTimeFormatter DATE_FR =
      DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRANCE);
  private static final DateTimeFormatter STAMP_FR =
      DateTimeFormatter.ofPattern("d MMMM yyyy, HH:mm", Locale.FRANCE);

  public record Data(
      UUID visitId,
      String title,
      String location,
      String checkIn,
      String checkOut,
      String guestName,
      String guestSignedAt,
      String hostName,
      String hostSignedAt) {}

  private StayContractPdf() {}

  public static String filename(UUID visitId) {
    String ref = ref(visitId).toLowerCase(Locale.ROOT);
    return "contrat-sejour-maresi-" + ref + ".pdf";
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

      Paragraph kicker = new Paragraph(win("Copie du contrat de séjour"), font(10, Font.NORMAL, MUTED));
      kicker.setSpacingAfter(14);
      document.add(kicker);

      Paragraph title = new Paragraph(win("Contrat de séjour"), font(20, Font.BOLD, INK));
      title.setSpacingAfter(6);
      document.add(title);

      Paragraph refLine =
          new Paragraph(
              win("Référence " + ref(data.visitId()) + "  ·  Signé par les deux parties"),
              font(10, Font.NORMAL, MUTED));
      refLine.setSpacingAfter(18);
      document.add(refLine);

      document.add(kvTable(data));

      Paragraph articlesTitle = new Paragraph(win("Articles"), font(13, Font.BOLD, INK));
      articlesTitle.setSpacingBefore(18);
      articlesTitle.setSpacingAfter(8);
      document.add(articlesTitle);

      List<String> articles = StayAgreementText.articles();
      for (int i = 0; i < articles.size(); i++) {
        Paragraph article =
            new Paragraph(
                win("Article " + (i + 1) + " — " + articles.get(i)), font(10, Font.NORMAL, INK));
        article.setLeading(15);
        article.setSpacingAfter(8);
        document.add(article);
      }

      Paragraph signTitle = new Paragraph(win("Signatures"), font(13, Font.BOLD, INK));
      signTitle.setSpacingBefore(10);
      signTitle.setSpacingAfter(8);
      document.add(signTitle);
      document.add(signatures(data));

      Paragraph footer =
          new Paragraph(
              win(
                  "Document généré automatiquement par Maresi. Conservez cette copie. "
                      + "Elle atteste que le client et le propriétaire ont accepté les mêmes conditions."),
              font(8, Font.NORMAL, MUTED));
      footer.setSpacingBefore(22);
      document.add(footer);

      document.close();
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("Could not generate stay contract PDF", e);
    }
  }

  private static PdfPTable kvTable(Data data) {
    PdfPTable table = new PdfPTable(new float[] {34, 66});
    table.setWidthPercentage(100);
    row(table, "Résidence", data.title());
    row(table, "Adresse", data.location());
    row(table, "Arrivée", formatDate(data.checkIn()));
    row(table, "Départ", formatDate(data.checkOut()));
    row(table, "Client", data.guestName());
    row(table, "Propriétaire", data.hostName());
    return table;
  }

  private static PdfPTable signatures(Data data) {
    PdfPTable table = new PdfPTable(2);
    table.setWidthPercentage(100);
    table.setSpacingBefore(4);
    table.addCell(signCell("Signature client", data.guestName(), data.guestSignedAt()));
    table.addCell(signCell("Signature propriétaire", data.hostName(), data.hostSignedAt()));
    return table;
  }

  private static PdfPCell signCell(String label, String name, String signedAt) {
    PdfPCell cell = new PdfPCell();
    cell.setBorderColor(LINE);
    cell.setPadding(12);
    cell.setPaddingBottom(16);
    Paragraph head = new Paragraph(win(label), font(9, Font.NORMAL, MUTED));
    head.setSpacingAfter(6);
    cell.addElement(head);
    Paragraph who = new Paragraph(win(blank(name, "—")), font(12, Font.BOLD, INK));
    who.setSpacingAfter(4);
    cell.addElement(who);
    cell.addElement(new Paragraph(win(formatStamp(signedAt)), font(9, Font.NORMAL, MUTED)));
    return cell;
  }

  private static void row(PdfPTable table, String label, String value) {
    PdfPCell left = new PdfPCell(new Phrase(win(label), font(9, Font.NORMAL, MUTED)));
    left.setBorderColor(LINE);
    left.setPadding(8);
    PdfPCell right = new PdfPCell(new Phrase(win(blank(value, "—")), font(10, Font.BOLD, INK)));
    right.setBorderColor(LINE);
    right.setPadding(8);
    table.addCell(left);
    table.addCell(right);
  }

  private static Font font(int size, int style, Color color) {
    return new Font(Font.HELVETICA, size, style, color);
  }

  private static String ref(UUID visitId) {
    if (visitId == null) return "MARESI";
    return visitId.toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
  }

  static String formatDate(String raw) {
    if (raw == null || raw.isBlank()) return "—";
    String value = raw.trim();
    try {
      return LocalDate.parse(value.substring(0, Math.min(10, value.length()))).format(DATE_FR);
    } catch (DateTimeParseException e) {
      return value;
    }
  }

  static String formatStamp(String raw) {
    if (raw == null || raw.isBlank()) return "—";
    String value = raw.trim();
    ZonedDateTime zoned = parseStamp(value);
    if (zoned == null) return value;
    return zoned.withZoneSameInstant(ABIDJAN).format(STAMP_FR);
  }

  private static ZonedDateTime parseStamp(String value) {
    try {
      return Instant.parse(value).atZone(ABIDJAN);
    } catch (DateTimeParseException ignored) {
    }
    try {
      return OffsetDateTime.parse(value).atZoneSameInstant(ABIDJAN);
    } catch (DateTimeParseException ignored) {
    }
    for (DateTimeFormatter formatter :
        List.of(
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))) {
      try {
        return java.time.LocalDateTime.parse(value, formatter).atZone(ABIDJAN);
      } catch (DateTimeParseException ignored) {
      }
    }
    return null;
  }

  private static String blank(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value.trim();
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
