// Validate league start/end dates
export const validateLeagueDates = (req, res, next) => {
  const { startDate, endDate } = req.body;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, error: 'End date must be after start date' });
    }
  }

  next();
};

// Validate rubber set scores in request body
export const validateRubberScores = (req, res, next) => {
  const { sets } = req.body;

  if (!sets || !Array.isArray(sets)) {
    return next();
  }

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const { homeGames, awayGames } = set;

    if (typeof homeGames !== 'number' || typeof awayGames !== 'number') {
      return res.status(400).json({ success: false, error: `Set ${i + 1}: scores must be numbers` });
    }

    if (homeGames < 0 || awayGames < 0 || homeGames > 7 || awayGames > 7) {
      return res.status(400).json({ success: false, error: `Set ${i + 1}: games must be between 0 and 7` });
    }
  }

  next();
};
