// Doubles draws store one player per team (the entrant). For display, each
// team is shown as "Player / Partner", looked up from the category's entries.

const isDoublesFormat = (format?: string) => format === 'doubles' || format === 'mixed_doubles'

/**
 * Return `draw` with doubles team names filled in from `entries`.
 * Non-doubles formats (or a missing draw) are returned unchanged. Safe to
 * apply twice: a name that already ends with the partner is left alone.
 */
export function withPartnerNames<T>(draw: T, format: string | undefined, entries: any[] | undefined): T {
  if (!draw || !isDoublesFormat(format)) return draw

  const partnerMap: Record<string, string> = {}
  // Withdrawn/rejected entries first so a live entry for the same player wins
  const dead = (e: any) => e?.status === 'withdrawn' || e?.status === 'rejected'
  const ordered = [...(entries || [])].sort((a, b) => Number(dead(b)) - Number(dead(a)))
  for (const entry of ordered) {
    if (!entry?.partnerName) continue
    if (entry.playerId) partnerMap[String(entry.playerId)] = entry.partnerName
    // Also map by playerZpin for entries that use zpin as id
    if (entry.playerZpin) partnerMap[entry.playerZpin] = entry.partnerName
  }
  if (Object.keys(partnerMap).length === 0) return draw

  const enrichPlayer = (p: any) => {
    if (!p || !p.id || p.isBye || p.isQualifierPlaceholder) return p
    const partner = partnerMap[String(p.id)]
    if (!partner || String(p.name || '').endsWith(` / ${partner}`)) return p
    return { ...p, name: `${p.name} / ${partner}` }
  }
  const enrichMatches = (matches: any[] | undefined) =>
    (matches || []).map((m: any) => ({ ...m, player1: enrichPlayer(m.player1), player2: enrichPlayer(m.player2) }))

  const d = draw as any
  return {
    ...d,
    matches: enrichMatches(d.matches),
    roundRobinGroups: d.roundRobinGroups?.map((g: any) => ({
      ...g,
      players: g.players?.map(enrichPlayer),
      matches: enrichMatches(g.matches)
    })),
    knockoutStage: d.knockoutStage ? { ...d.knockoutStage, matches: enrichMatches(d.knockoutStage.matches) } : d.knockoutStage,
    qualifyingStage: d.qualifyingStage ? { ...d.qualifyingStage, matches: enrichMatches(d.qualifyingStage.matches) } : d.qualifyingStage,
    standings: d.standings ? {
      ...d.standings,
      champion: enrichPlayer(d.standings.champion),
      runnerUp: enrichPlayer(d.standings.runnerUp),
      semiFinalists: d.standings.semiFinalists?.map(enrichPlayer)
    } : d.standings
  } as T
}
