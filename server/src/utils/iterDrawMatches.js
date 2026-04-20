/**
 * Iterate every match embedded in a tournament category's draw exactly once.
 *
 * Round-robin draws intentionally store each match twice — once in
 * draw.matches and once in draw.roundRobinGroups[].matches — so the PDF
 * export (reads groups) and scoring UI (reads draw.matches) can each read
 * their preferred path, with the backend keeping the two copies in sync
 * (see tournamentController.updateMatchResult).
 *
 * Any backend code that aggregates, counts, filters, or statistics-over
 * matches should use this helper to avoid double-counting round-robin
 * results.
 *
 * Yields { match, stage, groupName? } where stage is:
 *   - "main"               for single-elim / feed-in matches in draw.matches
 *   - "group:<groupName>"  for round-robin group-stage matches
 *   - "knockout"           for the post-group knockout bracket
 */
export function* iterDrawMatches(draw) {
  if (!draw) return;

  if (draw.type === 'round_robin') {
    for (const group of draw.roundRobinGroups || []) {
      for (const m of group.matches || []) {
        yield { match: m, stage: `group:${group.groupName || ''}`, groupName: group.groupName };
      }
    }
  } else {
    for (const m of draw.matches || []) {
      yield { match: m, stage: 'main' };
    }
  }

  if (draw.knockoutStage && draw.knockoutStage.matches) {
    for (const m of draw.knockoutStage.matches) {
      yield { match: m, stage: 'knockout' };
    }
  }
}
