// Generate a human-readable reference number for tournament entries
// Format: TRN-XXXX-XXXX (alphanumeric, no ambiguous characters)
export function generateEntryReference() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // excludes 0/O, 1/I/L
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `TRN-${seg()}-${seg()}`;
}
