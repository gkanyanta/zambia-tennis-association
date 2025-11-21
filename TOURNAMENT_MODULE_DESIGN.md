# ZTA Tournament Module Design & Recommendation

## Overview
Comprehensive tournament management system with **age-based junior categories**, automatic eligibility verification, and separate draws per category.

## Junior Categories (10 Categories Total)

### Boys Categories (5)
1. **Boys 10 & Under (B10U)**
2. **Boys 12 & Under (B12U)**
3. **Boys 14 & Under (B14U)**
4. **Boys 16 & Under (B16U)**
5. **Boys 18 & Under (B18U)**

### Girls Categories (5)
6. **Girls 10 & Under (G10U)**
7. **Girls 12 & Under (G12U)**
8. **Girls 14 & Under (G14U)**
9. **Girls 16 & Under (G16U)**
10. **Girls 18 & Under (G18U)**

### Additional Categories
- **Men's Open**
- **Women's Open**
- **Madalas (Veterans/Seniors)**
- **Mixed Doubles** (optional)

## Age Eligibility Rules

### December 31st Rule
**A player's age for tournament eligibility is determined by their age on December 31st of the tournament year.**

**Examples for 2025 Tournament:**
- Born: Jan 15, 2015 → Age on Dec 31, 2025 = 10 years → Eligible for 10U ✅
- Born: Dec 20, 2014 → Age on Dec 31, 2025 = 11 years → NOT eligible for 10U ❌ (must play 12U)
- Born: Jan 5, 2016 → Age on Dec 31, 2025 = 9 years → Eligible for 10U ✅

### Calculation Formula
```javascript
function calculateAgeOnDec31(dateOfBirth, tournamentYear) {
  const dec31 = new Date(tournamentYear, 11, 31) // Dec 31 of tournament year
  const dob = new Date(dateOfBirth)

  let age = dec31.getFullYear() - dob.getFullYear()
  const monthDiff = dec31.getMonth() - dob.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && dec31.getDate() < dob.getDate())) {
    age--
  }

  return age
}

// Player is eligible if: ageOnDec31 <= categoryMaxAge
```

### Multi-Category Eligibility
**Players can play "up" in age but NOT "down".**

Example: 10-year-old boy
- ✅ Can enter: B10U, B12U, B14U, B16U, B18U, Men's Open
- ❌ Cannot enter: B8U (doesn't exist), Girls categories

Example: 12-year-old girl
- ✅ Can enter: G12U, G14U, G16U, G18U, Women's Open
- ❌ Cannot enter: G10U (too old)

## Database Structure

### 1. Add Date of Birth to User Model

```javascript
// server/src/models/User.js
{
  dateOfBirth: {
    type: Date,
    required: function() {
      return this.role === 'player'
    }
  },
  // Calculated field for quick reference
  currentAge: {
    type: Number
  }
}
```

### 2. Enhanced Category Schema

```javascript
// server/src/models/Tournament.js - categorySchema
{
  name: String,  // "Boys 10 & Under", "Girls 14 & Under"
  code: String,  // "B10U", "G14U" - for easy reference
  type: {
    type: String,
    enum: ['junior', 'senior', 'madalas', 'mixed'],
    required: true
  },
  gender: {
    type: String,
    enum: ['boys', 'girls', 'mens', 'womens', 'mixed'],
    required: true
  },
  ageGroup: {
    type: String,
    enum: ['U10', 'U12', 'U14', 'U16', 'U18', 'Open'],
    required: true
  },
  maxAge: {
    type: Number,  // 10, 12, 14, 16, 18, null for Open
    required: function() {
      return this.ageGroup !== 'Open'
    }
  },
  // Age is calculated on December 31st of tournament year
  ageCalculationDate: {
    type: Date,  // Dec 31 of tournament year
    required: true
  },
  drawType: {
    type: String,
    enum: ['single_elimination', 'round_robin', 'feed_in'],
    default: 'single_elimination'
  },
  maxEntries: {
    type: Number,
    default: 32
  },
  minEntries: {
    type: Number,
    default: 4  // Minimum to hold the category
  },
  entryFee: {
    type: Number,
    default: 0  // Can be different per category
  },
  entries: [entrySchema],
  draw: drawSchema,
  prizePool: {
    winner: Number,
    runnerUp: Number,
    semifinalists: Number
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'draw_generated', 'in_progress', 'completed'],
    default: 'open'
  }
}
```

### 3. Enhanced Entry Schema

```javascript
// entrySchema with eligibility verification
{
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  playerName: String,
  playerZpin: String,
  dateOfBirth: {
    type: Date,
    required: true
  },
  ageOnDec31: {
    type: Number,  // Calculated age on Dec 31 of tournament year
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  clubName: String,
  ranking: Number,
  seed: Number,
  isEligible: {
    type: Boolean,
    default: false
  },
  eligibilityCheckedAt: Date,
  ineligibilityReason: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  membershipStatus: {
    type: String,  // Copy of player's membership status at entry time
    enum: ['active', 'expired']
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  paymentReference: String
}
```

## Tournament Creation Flow

### Step 1: Create Tournament
```javascript
POST /api/tournaments

{
  "name": "Zambia Junior Open 2025",
  "startDate": "2025-07-15",
  "endDate": "2025-07-20",
  "venue": "Olympic Youth Development Centre",
  "city": "Lusaka",
  "province": "Lusaka",
  "entryDeadline": "2025-07-01",
  "status": "upcoming"
}
```

### Step 2: Add Categories
```javascript
POST /api/tournaments/:tournamentId/categories

// Add multiple categories at once
{
  "categories": [
    {
      "name": "Boys 10 & Under",
      "code": "B10U",
      "type": "junior",
      "gender": "boys",
      "ageGroup": "U10",
      "maxAge": 10,
      "drawType": "single_elimination",
      "maxEntries": 32,
      "entryFee": 50
    },
    {
      "name": "Boys 12 & Under",
      "code": "B12U",
      "type": "junior",
      "gender": "boys",
      "ageGroup": "U12",
      "maxAge": 12,
      "drawType": "single_elimination",
      "maxEntries": 32,
      "entryFee": 50
    },
    // ... add all 10 junior categories
    {
      "name": "Men's Open",
      "code": "MO",
      "type": "senior",
      "gender": "mens",
      "ageGroup": "Open",
      "maxAge": null,
      "drawType": "single_elimination",
      "maxEntries": 64,
      "entryFee": 100
    }
  ]
}
```

### Step 3: Open Entries
```javascript
PATCH /api/tournaments/:tournamentId/status
{
  "status": "entries_open"
}
```

## Player Entry Flow

### Step 1: Check Eligibility
```javascript
GET /api/tournaments/:tournamentId/categories/:categoryId/check-eligibility/:playerId

Response:
{
  "eligible": true,
  "playerAge": 10,
  "ageOnDec31": 10,
  "categoryMaxAge": 10,
  "genderMatch": true,
  "membershipActive": true,
  "message": "Player is eligible for this category"
}

// Or if not eligible:
{
  "eligible": false,
  "reason": "Player will be 11 years old on December 31, 2025. Not eligible for Boys 10 & Under.",
  "playerAge": 10,
  "ageOnDec31": 11,
  "categoryMaxAge": 10,
  "suggestedCategories": ["B12U", "B14U", "B16U", "B18U"]
}
```

### Step 2: Submit Entry
```javascript
POST /api/tournaments/:tournamentId/categories/:categoryId/entries

{
  "playerId": "507f1f77bcf86cd799439011",
  "paymentMethod": "mobile_money",
  "paymentReference": "MM-2025-12345"
}

// System automatically:
// 1. Verifies age eligibility (Dec 31 rule)
// 2. Checks gender match
// 3. Verifies active membership
// 4. Checks if player already entered this category
// 5. Checks if max entries reached
// 6. Creates entry with isEligible flag
```

### Step 3: Admin Reviews Entries
```javascript
PATCH /api/tournaments/:tournamentId/categories/:categoryId/entries/:entryId

{
  "status": "accepted",  // or "rejected"
  "rejectionReason": "Membership expired"  // if rejected
}
```

## Eligibility Validation Logic

### Server-Side Validation Function

```javascript
// server/src/utils/tournamentEligibility.js

export function calculateAgeOnDec31(dateOfBirth, tournamentYear) {
  const dec31 = new Date(tournamentYear, 11, 31)
  const dob = new Date(dateOfBirth)

  let age = dec31.getFullYear() - dob.getFullYear()
  const monthDiff = dec31.getMonth() - dob.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && dec31.getDate() < dob.getDate())) {
    age--
  }

  return age
}

export async function checkCategoryEligibility(player, category, tournament) {
  const tournamentYear = new Date(tournament.startDate).getFullYear()
  const ageOnDec31 = calculateAgeOnDec31(player.dateOfBirth, tournamentYear)

  const validation = {
    eligible: true,
    reasons: []
  }

  // 1. Check date of birth exists
  if (!player.dateOfBirth) {
    validation.eligible = false
    validation.reasons.push('Player date of birth not recorded')
    return validation
  }

  // 2. Check age limit (can play up, but not down)
  if (category.maxAge && ageOnDec31 > category.maxAge) {
    validation.eligible = false
    validation.reasons.push(
      `Player will be ${ageOnDec31} years old on December 31, ${tournamentYear}. ` +
      `Maximum age for ${category.name} is ${category.maxAge}.`
    )
  }

  // 3. Check gender match
  const playerGender = player.gender === 'male' ? 'boys' : 'girls'
  if (category.type === 'junior' && category.gender !== playerGender && category.gender !== 'mixed') {
    validation.eligible = false
    validation.reasons.push(`Gender mismatch: ${category.name} is for ${category.gender}`)
  }

  // 4. Check membership status
  if (player.membershipStatus !== 'active') {
    validation.eligible = false
    validation.reasons.push('Player membership is not active')
  }

  // 5. Check if already entered this category
  const existingEntry = category.entries.find(e =>
    e.playerId.toString() === player._id.toString()
  )
  if (existingEntry) {
    validation.eligible = false
    validation.reasons.push('Player already entered this category')
  }

  // 6. Check if category is full
  if (category.entries.length >= category.maxEntries) {
    validation.eligible = false
    validation.reasons.push('Category is full')
  }

  return validation
}

export function getSuggestedCategories(player, tournament) {
  const tournamentYear = new Date(tournament.startDate).getFullYear()
  const ageOnDec31 = calculateAgeOnDec31(player.dateOfBirth, tournamentYear)
  const playerGender = player.gender === 'male' ? 'boys' : 'girls'

  return tournament.categories.filter(category => {
    // Must match gender (or be mixed/open)
    if (category.gender !== playerGender && category.gender !== 'mixed' && category.ageGroup !== 'Open') {
      return false
    }

    // Must be at or above player's age
    if (category.maxAge && ageOnDec31 > category.maxAge) {
      return false
    }

    // Not full
    if (category.entries.length >= category.maxEntries) {
      return false
    }

    return true
  })
}
```

## Draw Generation Per Category

### Single Elimination Draw
```javascript
POST /api/tournaments/:tournamentId/categories/:categoryId/generate-draw

// System:
// 1. Gets all accepted entries for this category
// 2. Seeds top players based on ranking
// 3. Generates bracket (8, 16, 32, 64 players)
// 4. Adds byes if needed
// 5. Creates match schedule
// 6. Saves draw to category.draw
```

### Draw Structure
```javascript
{
  "type": "single_elimination",
  "bracketSize": 32,
  "numberOfRounds": 5,  // Round of 32, 16, QF, SF, F
  "matches": [
    {
      "matchNumber": 1,
      "round": 1,
      "roundName": "Round of 32",
      "player1": {
        "id": "...",
        "name": "John Banda",
        "seed": 1
      },
      "player2": {
        "id": "...",
        "name": "Peter Mwale",
        "seed": null
      },
      "status": "scheduled"
    }
    // ... more matches
  ]
}
```

## Frontend Components Needed

### 1. Tournament List Page
- Shows all tournaments
- Filter by status (upcoming, entries open, in progress, completed)
- "Enter Tournament" button for open tournaments

### 2. Tournament Detail Page
```tsx
- Tournament info
- List of categories with:
  - Category name
  - Number of entries / max entries
  - Entry fee
  - "Check Eligibility" button
  - "Enter" button (if eligible)
```

### 3. Category Entry Modal
```tsx
<CategoryEntryModal>
  <PlayerInfo>
    Name: John Banda
    ZPIN: ZTAJ0001
    DOB: 2015-05-20
    Age: 10 years (as of Dec 31, 2025)
    Gender: Male
    Club: Lusaka Tennis Club
    Membership: Active ✅
  </PlayerInfo>

  <EligibilityCheck>
    ✅ Age eligible for Boys 10 & Under
    ✅ Gender matches category
    ✅ Membership active
    ✅ Not already entered

    Entry Fee: K50
    Payment Method: [Mobile Money ▼]
    Reference: [________]

    [Submit Entry]
  </EligibilityCheck>
</CategoryEntryModal>
```

### 4. Admin Tournament Management
```tsx
- Create tournament
- Add/remove categories
- Review entries (accept/reject)
- Generate draws
- Enter match results
- View standings
```

## API Endpoints Summary

### Tournaments
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/:id` - Get tournament details
- `PATCH /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Categories
- `POST /api/tournaments/:tournamentId/categories` - Add categories
- `PATCH /api/tournaments/:tournamentId/categories/:categoryId` - Update category
- `DELETE /api/tournaments/:tournamentId/categories/:categoryId` - Delete category

### Entries
- `GET /api/tournaments/:tournamentId/categories/:categoryId/check-eligibility/:playerId` - Check eligibility
- `POST /api/tournaments/:tournamentId/categories/:categoryId/entries` - Submit entry
- `GET /api/tournaments/:tournamentId/categories/:categoryId/entries` - List entries
- `PATCH /api/tournaments/:tournamentId/categories/:categoryId/entries/:entryId` - Update entry status
- `DELETE /api/tournaments/:tournamentId/categories/:categoryId/entries/:entryId` - Withdraw entry

### Draws
- `POST /api/tournaments/:tournamentId/categories/:categoryId/generate-draw` - Generate draw
- `GET /api/tournaments/:tournamentId/categories/:categoryId/draw` - Get draw
- `PATCH /api/tournaments/:tournamentId/categories/:categoryId/matches/:matchId` - Update match result

## Key Benefits

✅ **Automatic Age Verification** - System calculates age on Dec 31st automatically
✅ **Prevents Ineligible Entries** - Real-time eligibility checking before submission
✅ **Multi-Category Support** - Players can enter multiple age groups (playing up)
✅ **Gender-Specific Categories** - Boys and Girls separated automatically
✅ **Separate Draws** - Each category has its own independent draw
✅ **Fair Competition** - Age rules consistently applied
✅ **Audit Trail** - All entries tracked with dates and eligibility status
✅ **Flexible** - Easy to add new categories or change rules

## Implementation Phases

### Phase 1: Database & Core Logic
1. Add dateOfBirth to User model
2. Create eligibility validation functions
3. Update Tournament model with enhanced categories
4. Create category entry endpoints

### Phase 2: Entry System
1. Check eligibility endpoint
2. Submit entry endpoint
3. Admin review system
4. Entry payment tracking

### Phase 3: Draw Generation
1. Single elimination draw generator
2. Seeding system
3. Match scheduling
4. Results entry

### Phase 4: Frontend
1. Tournament list and detail pages
2. Entry forms with eligibility checking
3. Admin tournament management
4. Draw display and match results

## Testing Scenarios

### Age Eligibility Tests
- [ ] Born Jan 1, 2015, tournament in 2025 → Age 10 on Dec 31 → Eligible for 10U
- [ ] Born Dec 31, 2014, tournament in 2025 → Age 11 on Dec 31 → NOT eligible for 10U
- [ ] Born Jan 1, 2016, tournament in 2025 → Age 9 on Dec 31 → Eligible for 10U
- [ ] 10-year-old can enter 12U, 14U, 16U, 18U ✅
- [ ] 12-year-old CANNOT enter 10U ❌

### Gender Tests
- [ ] Boy cannot enter Girls categories
- [ ] Girl cannot enter Boys categories
- [ ] Both can enter Open categories

### Entry Tests
- [ ] Cannot enter if membership expired
- [ ] Cannot enter same category twice
- [ ] Cannot enter if category full
- [ ] Can enter multiple categories if eligible

This design provides a complete, production-ready tournament management system with proper age verification and category management!