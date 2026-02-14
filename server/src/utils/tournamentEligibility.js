/**
 * Tournament Eligibility Utilities
 * Handles age-based eligibility calculations for tournament categories
 */

/**
 * Calculate a player's tennis age for a tournament year.
 * Tennis age = tournamentYear - birthYear (age on Dec 31 of that year).
 * No birthday-occurrence adjustment — always simple year subtraction.
 *
 * @param {Date|string} dateOfBirth - Player's date of birth
 * @param {number} tournamentYear - Year of the tournament
 * @returns {number} - Player's tennis age for that year
 */
export const calculateTennisAge = (dateOfBirth, tournamentYear) => {
  const dob = new Date(dateOfBirth);
  return tournamentYear - dob.getFullYear();
};

/**
 * @deprecated Use calculateTennisAge instead. Kept for backward compatibility.
 */
export const calculateAgeOnDec31 = calculateTennisAge;

/**
 * Check if a player is eligible for a specific tournament category
 *
 * @param {Date|string} dateOfBirth - Player's date of birth
 * @param {string} gender - Player's gender ('male' or 'female')
 * @param {string} categoryCode - Tournament category code (e.g., 'B10U', 'G12U')
 * @param {number} tournamentYear - Year of the tournament
 * @returns {Object} - { eligible: boolean, reason: string, ageOnDec31: number }
 */
export const checkCategoryEligibility = (dateOfBirth, gender, categoryCode, tournamentYear) => {
  const ageOnDec31 = calculateTennisAge(dateOfBirth, tournamentYear);

  // Parse category code (e.g., 'B10U' -> { gender: 'B', maxAge: 10 })
  const categoryGender = categoryCode.charAt(0); // 'B' or 'G'
  const maxAge = parseInt(categoryCode.substring(1, categoryCode.length - 1)); // Extract number

  // Check gender match
  if ((categoryGender === 'B' && gender !== 'male') ||
      (categoryGender === 'G' && gender !== 'female')) {
    return {
      eligible: false,
      reason: `Player gender (${gender}) does not match category gender (${categoryGender === 'B' ? 'Boys' : 'Girls'})`,
      ageOnDec31
    };
  }

  // Check age eligibility
  if (ageOnDec31 > maxAge) {
    return {
      eligible: false,
      reason: `Player will be ${ageOnDec31} years old on Dec 31, ${tournamentYear}, which exceeds the ${maxAge} years maximum for this category`,
      ageOnDec31
    };
  }

  return {
    eligible: true,
    reason: `Player will be ${ageOnDec31} years old on Dec 31, ${tournamentYear}, which is eligible for ${categoryCode}`,
    ageOnDec31
  };
};

/**
 * Get all eligible categories for a player
 * Players can play "up" in age (e.g., 10U can play in 12U, 14U, etc.)
 *
 * @param {Date|string} dateOfBirth - Player's date of birth
 * @param {string} gender - Player's gender ('male' or 'female')
 * @param {Array} availableCategories - Array of available category codes
 * @param {number} tournamentYear - Year of the tournament
 * @returns {Array} - Array of { categoryCode, eligible, suggested, ageOnDec31, reason }
 */
export const getEligibleCategories = (dateOfBirth, gender, availableCategories, tournamentYear) => {
  const ageOnDec31 = calculateTennisAge(dateOfBirth, tournamentYear);
  const genderPrefix = gender === 'male' ? 'B' : 'G';

  const categoriesList = [
    { code: `${genderPrefix}10U`, maxAge: 10 },
    { code: `${genderPrefix}12U`, maxAge: 12 },
    { code: `${genderPrefix}14U`, maxAge: 14 },
    { code: `${genderPrefix}16U`, maxAge: 16 },
    { code: `${genderPrefix}18U`, maxAge: 18 }
  ];

  // Find the player's natural category (youngest category they fit into)
  let suggestedCategory = null;
  for (const cat of categoriesList) {
    if (ageOnDec31 <= cat.maxAge) {
      suggestedCategory = cat.code;
      break;
    }
  }

  return categoriesList
    .filter(cat => availableCategories.includes(cat.code))
    .map(cat => {
      const eligible = ageOnDec31 <= cat.maxAge;
      const isSuggested = cat.code === suggestedCategory;

      return {
        categoryCode: cat.code,
        eligible,
        suggested: isSuggested,
        ageOnDec31,
        reason: eligible
          ? (isSuggested
              ? `Recommended category for player's age (${ageOnDec31} years on Dec 31, ${tournamentYear})`
              : `Player can play up in this category (${ageOnDec31} years on Dec 31, ${tournamentYear})`)
          : `Player will be ${ageOnDec31} years old on Dec 31, ${tournamentYear}, which exceeds the ${cat.maxAge} years maximum`
      };
    });
};

/**
 * Validate tournament entry eligibility
 * Comprehensive check for tournament entry with detailed feedback
 *
 * @param {Object} player - Player object with dateOfBirth and gender
 * @param {string} categoryCode - Category code player wants to enter
 * @param {Date} tournamentDate - Tournament date
 * @returns {Object} - { eligible: boolean, errors: Array, warnings: Array, info: Object }
 */
export const validateTournamentEntry = (player, categoryCode, tournamentDate) => {
  const errors = [];
  const warnings = [];
  const tournamentYear = new Date(tournamentDate).getFullYear();

  // Check if player has date of birth
  if (!player.dateOfBirth) {
    errors.push('Player date of birth is required for tournament eligibility');
    return { eligible: false, errors, warnings, info: {} };
  }

  // Check if player has gender
  if (!player.gender) {
    errors.push('Player gender is required for tournament eligibility');
    return { eligible: false, errors, warnings, info: {} };
  }

  // Calculate tennis age (year subtraction)
  const ageOnDec31 = calculateTennisAge(player.dateOfBirth, tournamentYear);

  // Check category eligibility
  const eligibility = checkCategoryEligibility(
    player.dateOfBirth,
    player.gender,
    categoryCode,
    tournamentYear
  );

  if (!eligibility.eligible) {
    errors.push(eligibility.reason);
  }

  // Add info
  const info = {
    playerAge: ageOnDec31,
    tournamentYear,
    categoryCode,
    ageCalculationDate: `December 31, ${tournamentYear}`
  };

  // Check if player is playing up
  const categoryMaxAge = parseInt(categoryCode.substring(1, categoryCode.length - 1));
  const genderPrefix = player.gender === 'male' ? 'B' : 'G';

  // Find natural category
  const categories = [10, 12, 14, 16, 18];
  let naturalCategory = null;
  for (const age of categories) {
    if (ageOnDec31 <= age) {
      naturalCategory = `${genderPrefix}${age}U`;
      break;
    }
  }

  if (naturalCategory && naturalCategory !== categoryCode && eligibility.eligible) {
    warnings.push(`Player's recommended category is ${naturalCategory}, but they are eligible to play up in ${categoryCode}`);
    info.suggestedCategory = naturalCategory;
  }

  return {
    eligible: eligibility.eligible,
    errors,
    warnings,
    info
  };
};

/**
 * Get category details from category code
 *
 * @param {string} categoryCode - Category code (e.g., 'B10U')
 * @returns {Object} - { code, name, gender, maxAge, genderLabel }
 */
export const getCategoryDetails = (categoryCode) => {
  const genderCode = categoryCode.charAt(0);
  const maxAge = parseInt(categoryCode.substring(1, categoryCode.length - 1));

  return {
    code: categoryCode,
    name: `${genderCode === 'B' ? 'Boys' : 'Girls'} ${maxAge} & Under`,
    gender: genderCode === 'B' ? 'male' : 'female',
    maxAge,
    genderLabel: genderCode === 'B' ? 'Boys' : 'Girls'
  };
};

/**
 * Get all standard junior categories
 *
 * @returns {Array} - Array of category objects
 */
export const getAllJuniorCategories = () => {
  const ages = [10, 12, 14, 16, 18];
  const categories = [];

  for (const age of ages) {
    categories.push({
      code: `B${age}U`,
      name: `Boys ${age} & Under`,
      gender: 'male',
      maxAge: age
    });
    categories.push({
      code: `G${age}U`,
      name: `Girls ${age} & Under`,
      gender: 'female',
      maxAge: age
    });
  }

  return categories;
};
