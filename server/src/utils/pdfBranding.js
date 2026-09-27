// Tournament branding shared by the exported PDFs (draws, order of play):
// co-organiser / sponsor logos and the technical team line.

// Most logo tiles any PDF header has room for (the tournament form allows the same)
export const MAX_PARTNER_LOGOS = 3;

// Fetch partner logos for the PDF header. PDFKit only embeds PNG and JPEG, so
// anything else (or a logo that fails to download) is skipped.
export async function loadPartnerLogos(partnerLogos = []) {
  const loaded = [];
  for (const logo of partnerLogos.slice(0, MAX_PARTNER_LOGOS)) {
    try {
      // Only fetch from our image host (logos are uploaded there), never arbitrary URLs
      const url = new URL(logo.url);
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') continue;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const isPng = buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
      if (isPng || isJpeg) loaded.push({ name: logo.name, buffer });
    } catch (e) {
      console.error(`Partner logo not loaded (${logo.url}):`, e.message);
    }
  }
  return loaded;
}

// "Tournament Director: … | Tournament Referee: …", or '' when neither is set.
export function technicalTeamLine(tournament) {
  const parts = [];
  if (tournament.tournamentDirector) parts.push(`Tournament Director: ${tournament.tournamentDirector}`);
  if (tournament.tournamentReferee) parts.push(`Tournament Referee: ${tournament.tournamentReferee}`);
  return parts.join('      |      ');
}
