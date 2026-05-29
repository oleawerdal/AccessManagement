import { format } from "date-fns";
import { nb } from "date-fns/locale";

export type ExpiredItem = {
  personName: string;
  personEmail: string;
  systemName: string;
  roleName: string;
  expiresAt: Date | null;
};

function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:560px;margin:0 auto">
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;color:#64748b">Sendt automatisk fra Tilgangsstyring.</p>
  </div>`;
}

function itemsTable(items: ExpiredItem[]): string {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${i.personName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${i.systemName} / ${i.roleName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${
          i.expiresAt ? format(i.expiresAt, "dd.MM.yyyy", { locale: nb }) : "—"
        }</td>
      </tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr>
      <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #cbd5e1">Person</th>
      <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #cbd5e1">System / rolle</th>
      <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #cbd5e1">Utløp</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function expiryDigestEmail(items: ExpiredItem[], scope: string) {
  const subject = `Tilgangsstyring: ${items.length} utløpt${
    items.length === 1 ? " tilgang" : "e tilganger"
  } krever revisjon`;
  const html = layout(
    "Utløpte tilganger",
    `<p style="font-size:14px">Følgende tilganger ${scope} har utløpt og krever revisjon (forny eller revoker):</p>${itemsTable(
      items,
    )}`,
  );
  return { subject, html };
}

export function passwordResetEmail(name: string, link: string, isNew: boolean) {
  const subject = isNew
    ? "Sett passord for Tilgangsstyring"
    : "Tilbakestill passord for Tilgangsstyring";
  const intro = isNew
    ? `Hei ${name}, en konto er opprettet for deg i Tilgangsstyring. Klikk for å sette passordet ditt:`
    : `Hei ${name}, klikk for å tilbakestille passordet ditt:`;
  const html = layout(
    subject,
    `<p style="font-size:14px">${intro}</p>
     <p style="margin:20px 0">
       <a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;display:inline-block">
         ${isNew ? "Sett passord" : "Tilbakestill passord"}
       </a>
     </p>
     <p style="font-size:13px;color:#64748b">Lenken er gyldig i 24 timer og kan brukes én gang. Hvis du ikke ba om dette, kan du se bort fra e-posten.</p>
     <p style="font-size:12px;color:#94a3b8;word-break:break-all">${link}</p>`,
  );
  return { subject, html };
}

export function testEmail() {
  return {
    subject: "Test fra Tilgangsstyring",
    html: layout(
      "SMTP fungerer ✓",
      `<p style="font-size:14px">Dette er en test-e-post. SMTP-oppsettet ditt fungerer.</p>`,
    ),
  };
}
