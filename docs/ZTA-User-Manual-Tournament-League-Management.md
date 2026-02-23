# ZTA System User Manual
## Tournament & League Management

**Zambia Tennis Association**
Version 1.0 | February 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Tournament Management](#2-tournament-management)
   - 2.1 Creating a Tournament
   - 2.2 Managing Entries
   - 2.3 Generating Draws
   - 2.4 Order of Play & Scheduling
   - 2.5 Umpire Pool
   - 2.6 Live Scoring
   - 2.7 Results & Finalization
   - 2.8 Finance
3. [League Management](#3-league-management)
   - 3.1 Creating a League
   - 3.2 Club Registration & Approval
   - 3.3 Generating Fixtures
   - 3.4 Entering Match Scores
   - 3.5 Standings
   - 3.6 Playoffs
4. [Rankings Management](#4-rankings-management)
5. [Public Registration (No Login Required)](#5-public-registration)
6. [Umpire Guide](#6-umpire-guide)
7. [Live Scoreboard](#7-live-scoreboard)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Getting Started

### Logging In

1. Go to **zambiatennisassociation.com/login**
2. Enter your email and password
3. Click **Sign In**

### User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access to all features |
| **Staff** | Same as Admin (except deleting tournaments/leagues) |
| **Club Official** | Register club for leagues, enter scores for own club's matches |
| **Player** | View tournaments, register, view rankings |
| **Public (no login)** | Browse tournaments, register players, view live scores |

### Navigation

After logging in as Admin/Staff, go to:
- **Admin Dashboard** > **Manage Tournaments** for tournament management
- **Admin Dashboard** > **Manage Leagues** for league management
- **Admin Dashboard** > **Manage Rankings** for rankings

---

## 2. Tournament Management

### 2.1 Creating a Tournament

**Path:** Admin Dashboard > Manage Tournaments > **Create Tournament**

#### Step 1: Basic Information

Fill in the required fields:

| Field | Description |
|-------|-------------|
| Tournament Name | e.g. "2026 Lusaka Open" |
| Description | Brief tournament overview |
| Start Date / End Date | Tournament dates |
| Venue | e.g. "Olympic Youth Development Centre" |
| City / Province | Location details |
| Entry Deadline | Last date players can enter |
| Entry Fee | Amount in Kwacha (set 0 for free) |
| Tournament Level | Club, Regional, National, or International |
| Organizer | Defaults to "ZTA" |
| Contact Email / Phone | For enquiries |

#### Step 2: Tournament Type & Categories

1. Choose tournament type: **Junior**, **Senior**, **Madalas**, or **Mixed**
2. Select categories using the checkboxes:
   - **Junior:** Boys/Girls U10, U12, U14, U16, U18
   - **Senior:** Men's/Women's Singles, Doubles, Mixed Doubles
   - **Madalas:** 35+, 45+, 55+, 65+ Singles & Doubles
3. Use quick-select buttons: "Select All Boys", "Select All Girls", etc.
4. For each category, set:
   - **Draw type:** Single Elimination, Round Robin, Feed-in, or Mixer
   - **Max entries:** Default is 32

#### Step 3: Registration Settings

| Setting | What it does |
|---------|--------------|
| Allow Public Registration | Anyone can register without logging in |
| Allow Multiple Categories | Players can enter more than one category |
| Require Payment Upfront | Entry not accepted until paid |

#### Step 4: Courts

Add the names of available courts (e.g. "Court 1", "Court 2", "Centre Court"). These are used later for scheduling and live scoring.

Click **Create Tournament** to save.

---

### 2.2 Managing Entries

**Path:** Admin > Tournament > **Entries** tab

#### Viewing Entries

1. Select a category from the dropdown
2. Entries are listed with: player name, ZPIN, age, club, entry fee, status
3. Filter by status: All, Pending Payment, Pending Approval, Accepted, Rejected

#### Entry Statuses

| Status | Meaning |
|--------|---------|
| **Pending Payment** | Player registered but hasn't paid |
| **Pending** | Payment confirmed, awaiting admin approval |
| **Accepted** | Approved and included in draw |
| **Rejected** | Entry rejected (with reason) |

#### Processing Individual Entries

Click the action buttons next to each entry:

- **Confirm Payment** -- Mark as paid (moves to Pending Approval)
- **Waive Payment** -- Remove payment requirement
- **Waive Surcharge** -- Remove the 50% surcharge for non-ZPIN players
- **Accept** -- Approve the entry for the draw
- **Reject** -- Reject with a reason

#### Bulk Actions

1. Select multiple entries using the checkboxes
2. Choose a bulk action from the dropdown:
   - **Bulk Approve** -- Accept all selected entries
   - **Bulk Confirm Payment** -- Mark all as paid
   - **Bulk Waive Payment** -- Waive fees for all selected
   - **Bulk Waive Surcharge** -- Remove surcharges for all selected

#### Seeding

- **Manual seeding:** Click the seed number field next to an accepted entry and assign a number (1, 2, 3...)
- **Auto-seed:** Click **Auto Seed** to automatically seed based on player rankings
- **Bulk seed update:** Assign seeds to multiple players at once

> **Note:** Only accepted entries can be seeded. Seed 1 is the highest-ranked player.

---

### 2.3 Generating Draws

**Path:** Admin > Tournament > **Draws** tab

#### Prerequisites
- At least 4 accepted entries in the category
- Seeding recommended (top players get favorable positions and BYEs)

#### Generating a Single Elimination Draw

1. Select the category
2. Click **Generate Draw**
3. The system automatically:
   - Calculates bracket size (8, 16, 32, or 64)
   - Places seeded players in ITF standard positions
   - Assigns BYEs to top seeds when entries don't fill the bracket
   - Advances BYE winners to Round 2
4. Review the bracket preview
5. Click **Confirm** to save

#### Generating a Round Robin Draw

1. Select the category (must have Round Robin as draw type)
2. Click **Generate Draw**
3. Players are distributed into groups (typically 3-6 per group)
4. All matches within each group are generated

#### Generating a Mixer Draw (Madalas Social Doubles)

1. Go to the category with Mixer draw type
2. **Assign A/B ratings** to all players:
   - **A-rated:** Stronger players
   - **B-rated:** Developing players
   - Ratings should be roughly equal in count
3. Click **Generate Draw**
4. The system creates rounds using the circle rotation method:
   - Each round has courts with 2 pairs (4 players) per court
   - A-rated players stay; B-rated players rotate each round
   - Number of rounds = number of pairs - 1

> **Warning:** Regenerating a draw will erase all existing results for that category.

---

### 2.4 Order of Play & Scheduling

**Path:** Admin > Tournament > **Order of Play** tab

#### Adding Courts

1. Type a court name in the input field (e.g. "Court 1")
2. Click **Add Court**
3. Repeat for all available courts

#### Scheduling Matches

1. View the match list (filterable: All, Unscheduled, Scheduled)
2. For each match, assign:
   - **Court** -- Select from the tournament's court list
   - **Date** -- Match date
   - **Time** -- Match start time
3. Click **Save Schedule** to save all changes

#### Bulk Scheduling

Select multiple matches and assign them the same court and time slot.

#### Preview Mode

Click **Preview** to see the schedule in a read-only display format, organized by date and court -- useful for printing or sharing.

> **Tip:** The public can see the Order of Play on the tournament page once matches are scheduled.

---

### 2.5 Umpire Pool

**Path:** Admin > Tournament > **Umpires** tab

The umpire pool lets you pre-select which players will help umpire matches at the tournament. When starting a live match, only pool members appear in the Chair Umpire dropdown.

#### Adding Umpires

1. Type a player's name in the search box
2. Search results appear after 2+ characters
3. Click a player to add them to the pool
4. Click **Save** to persist changes

#### Removing Umpires

1. Click the **X** button next to an umpire's name
2. Click **Save**

> **Note:** If the pool is empty, the Chair Umpire dropdown when starting a live match will show all registered players as a fallback.

---

### 2.6 Live Scoring

Live scoring allows point-by-point match tracking with real-time updates on the public scoreboard.

#### Starting a Live Match (Admin)

**Path:** Admin > Tournament > **Results** tab

1. Find the match in the draw
2. Click **Live Score**
3. Configure match settings:

| Setting | Options |
|---------|---------|
| Best of | 3 sets or 5 sets |
| Short sets | First to 4 games (for U10) |
| Deciding set | Super Tiebreak (first to 10) or Full Set |
| No-Ad scoring | Sudden death at deuce |
| Court | Court assignment |
| Chair Umpire | Select from umpire pool |

4. Click **Start Match**
5. You are taken to the scoring interface, OR the assigned umpire scores from their device

#### How the Umpire Scores a Match

See [Section 6: Umpire Guide](#6-umpire-guide) for the full umpire workflow.

#### What the Public Sees

- The match appears on the **Live Scoreboard** at `/live-scores`
- Scores update in real-time as points are awarded
- Match status shows: Warmup, LIVE, Suspended, or Completed

---

### 2.7 Results & Finalization

**Path:** Admin > Tournament > **Results** tab

#### Entering Results Manually

For matches not scored live:

1. Select the category
2. Find the match
3. Click **Enter Score**
4. Select the **Winner**
5. Enter the **Score** (e.g. "6-4 6-3" or "6-7(5) 6-4 10-8")
6. Click **Save**
7. The winner automatically advances to the next round

#### Finalizing Results

Once all matches in a category are completed:

1. Click **Finalize Results**
2. Confirm the action
3. The system:
   - Locks all match results (no further edits)
   - Computes final standings (Champion, Runner-up, Semi-finalists)
   - For round robin: computes group standings
   - For mixer: ranks players by total games won
4. Results are displayed publicly

> **Warning:** Finalization cannot be undone. Make sure all results are correct before finalizing.

---

### 2.8 Finance

**Path:** Admin > Tournament > **Finance** tab

#### Budget Planning

Create budget line items before the tournament:

1. Click **Add Budget Line**
2. Select type: **Income** or **Expense**
3. Choose a category:
   - Income: Entry Fees, Sponsorship, Food Sales, Merchandise, Other
   - Expense: Venue, Balls, Trophies, Umpires, Transport, Meals, Accommodation, Printing, Medical, Equipment, Marketing, Administration, Other
4. Enter description, budgeted amount, and notes
5. Click **Save**

#### Recording Expenses

During or after the tournament:

1. Click **Add Expense**
2. Fill in: category, description, amount, date, paid to, payment method, receipt reference
3. Click **Save**

#### Recording Additional Income

For income beyond entry fees (sponsorships, food sales, etc.):

1. Click **Add Income**
2. Fill in: category, description, amount, date, received from, payment method
3. Click **Save**

#### Entry Fee Income

Entry fee income is calculated automatically from paid entries. The summary shows:
- Paid entries and total collected
- Waived entries
- Unpaid entries
- Surcharges waived

#### Financial Summary Dashboard

The dashboard shows:

| Metric | Description |
|--------|-------------|
| Budgeted Income | Total planned income |
| Budgeted Expenses | Total planned expenses |
| Projected Profit | Budget income minus budget expenses |
| Actual Income | Entry fees collected + manual income |
| Actual Expenses | All recorded expenses |
| Actual Profit | Actual income minus actual expenses |
| Variance | Difference between budgeted and actual |

#### Export Reports

- **Export Budget PDF** -- Budget plan document
- **Export Finance Report PDF** -- Full income/expense report with variance analysis

---

## 3. League Management

### 3.1 Creating a League

**Path:** Admin Dashboard > Manage Leagues > **Create League**

Fill in the league details:

| Field | Description |
|-------|-------------|
| Name | e.g. "2026 Northern Region Men's League" |
| Season | e.g. "2026" |
| Year | League year |
| Region | Northern or Southern |
| Gender | Men or Women |
| Start Date / End Date | League season dates |
| Status | Upcoming, Active, Completed, or Cancelled |
| Teams | Select clubs to include (checkbox list) |
| Description | Optional notes |

#### Match Format

Choose one of three formats:

| Format | Structure |
|--------|-----------|
| **2 Singles + 1 Doubles (2s1d)** | Standard format: 3 rubbers per tie |
| **3 Singles + 2 Doubles (3s2d)** | Extended format: 5 rubbers per tie |
| **4 Singles + 1 Doubles (4s1d)** | Full singles format: 5 rubbers per tie |

#### Advanced Settings

| Setting | Options |
|---------|---------|
| Best of | 3 sets or 5 sets |
| Match tiebreak | 10-point tiebreak in deciding set (yes/no) |
| No-Ad scoring | Sudden death at deuce (yes/no) |
| Points for Win | Default: 3 |
| Points for Draw | Default: 1 |
| Points for Loss | Default: 0 |
| Number of rounds | Round-robin count |

Click **Create League** to save.

---

### 3.2 Club Registration & Approval

#### How Clubs Register

1. A Club Official logs in and goes to the **Leagues** page
2. They see a banner for upcoming leagues
3. They click **Register Club** for the relevant league
4. Registration is submitted for admin approval

#### Approving Registrations (Admin)

1. Go to **Admin > Leagues**
2. Click **View Registrations** on the league card
3. For each registration:
   - **Approve** -- Adds the club to the league's team list automatically
   - **Reject** -- Provide an optional rejection reason

---

### 3.3 Generating Fixtures (Ties)

**Path:** Admin > Leagues > Select League > **Generate Ties**

1. Click **Generate Ties**
2. The system creates a round-robin schedule:
   - Every team plays every other team
   - Fixtures are assigned dates from the ZTA Calendar (if "League Match Day" events exist) or at weekly intervals from the league start date
   - Home and away are alternated
3. For coordinated scheduling, the system mirrors fixtures from the opposite-gender league in the same region (e.g. Northern Men mirrors Northern Women)
4. Review the generated fixtures
5. Ties appear on the public Leagues page under **Fixtures**

> **Tip:** Add "League Match Day" events to the ZTA Calendar before generating ties for accurate scheduling.

---

### 3.4 Entering Match Scores

Scores can be entered by **Admins**, **Staff**, or the **Club Official** of either team in the tie.

#### Step 1: Assign Players

1. Go to **Leagues** > select the league > **Fixtures** tab
2. Find the tie and click **Enter Scores**
3. For each rubber (Singles 1, Singles 2, Doubles, etc.):
   - Select the **home player(s)** from the home team roster
   - Select the **away player(s)** from the away team roster
   - For doubles: select two players per side

#### Step 2: Enter Scores

For each rubber:

1. Enter the **games won** for each set (e.g. Home 6, Away 4)
2. If a set goes to 7-6, enter the **tiebreak score** (e.g. 7-5)
3. If a deciding-set tiebreak is configured, enter the match tiebreak score (first to 10, win by 2)
4. The system automatically:
   - Validates scores follow tennis rules
   - Determines the rubber winner
   - Adds additional sets as needed
5. Click **Save** after each rubber

#### Completing a Tie

When all rubbers are scored, the tie is automatically marked as **Completed**. The overall tie score (e.g. "2-1") is calculated from rubber wins.

#### Walkovers

If a team cannot play:

1. Admin clicks **Walkover** on the tie
2. Select which team forfeits
3. Enter a reason
4. All rubbers are awarded to the opposing team

---

### 3.5 Standings

**Path:** Leagues > Select League > **Standings** tab

Standings are calculated automatically and update after each completed tie.

#### Standings Table Columns

| Column | Meaning |
|--------|---------|
| P | Matches (ties) played |
| W | Ties won |
| D | Ties drawn |
| L | Ties lost |
| RF | Rubbers for (won) |
| RA | Rubbers against (lost) |
| Pts | League points |

#### Tiebreaker Rules (ITF-Aligned)

When teams are level on points, tiebreakers are applied in this order:

1. **Head-to-head** record between tied teams
2. **Rubber difference** (rubbers for minus rubbers against)
3. **Total rubbers for**
4. **Set difference**
5. **Total sets for**
6. **Game difference**
7. **Total games for**

---

### 3.6 Playoffs

**Path:** Admin > Leagues > **Generate Playoffs**

#### Prerequisites
- Both the Northern and Southern leagues for the same gender must have standings
- At least 2 teams per region with results

#### Generating Playoffs

1. Click **Generate Playoffs** on the league
2. The system creates:
   - **Semi-Final 1:** Region 1 Winner vs Region 2 Runner-up
   - **Semi-Final 2:** Region 2 Winner vs Region 1 Runner-up
   - **Final:** Winner of SF1 vs Winner of SF2
3. If playoff dates exist in the ZTA Calendar, they are assigned automatically
4. Scores are entered the same way as regular ties

#### Viewing Playoffs

The public can see the playoff bracket on the **Leagues** page under the **Playoffs** tab, showing the national championship bracket with results.

---

## 4. Rankings Management

### Viewing Rankings

**Path:** Public menu > **Rankings**

Rankings are organized into 18 categories:

| Group | Categories |
|-------|-----------|
| **Senior** | Men's Senior, Women's Senior |
| **Junior Boys** | U10, U12, U14, U16, U18 |
| **Junior Girls** | U10, U12, U14, U16, U18 |
| **Doubles** | Men's Doubles, Women's Doubles, Mixed Doubles |
| **Madalas** | Overall (35+), Ladies (35+) |

### Adding Rankings Manually (Admin)

1. Go to the Rankings page
2. Use the admin form at the top:
   - Enter Rank, Player Name, Club, Total Points
3. Click **Add**

### Importing Rankings from CSV (Admin)

**Path:** Rankings > **Import from CSV**

1. Click **Download Template** to get the CSV format
2. Fill in the spreadsheet with columns:
   - Rank, Player Name, Club, Total Points, ZPIN (optional)
3. Upload the CSV file
4. Select the **Category** (e.g. "Men's Senior")
5. Enter the **Ranking Period** (e.g. "2026")
6. Preview the data (first 100 rows shown)
7. Click **Import**
8. Results show: records created, updated, and any errors

### Automatic Ranking Updates

Madalas rankings update automatically when mixer tournament results are finalized. The system:
- Adds tournament results to each player's record
- Recalculates total points
- Re-ranks all players in the category

---

## 5. Public Registration

Players or their parents/coaches can register for tournaments **without logging in**.

### Registration Steps

1. Go to the tournament page
2. Click **Register Players**
3. **Search for existing players** by name or ZPIN
   - OR click **Add New Player** and enter: first name, last name, date of birth, gender, club
4. Select an eligible category for each player
   - The system checks age eligibility automatically for junior categories
5. Review the entry summary:
   - Player names and categories
   - Entry fees (includes 50% surcharge for players without a paid ZPIN)
6. Enter **payer information**: name, email, phone
7. Choose payment option:
   - **Pay Now** -- Opens online payment (card or mobile money)
   - **Pay Later** -- Receives a payment link by email (expires in 72 hours)
8. Confirmation email is sent with registration details

---

## 6. Umpire Guide

### Accessing Your Matches

1. Log in to the ZTA website
2. If you have been assigned matches, a banner appears on the home page
3. Click **Go to Umpire Dashboard** or navigate to `/umpire`
4. Your assigned matches are listed with status

### Scoring a Match

#### Step 1: Select First Server

When you open an assigned match for the first time:

1. You see **"Who serves first?"** with both player names
2. Tap the player who won the toss and chose to serve
3. The selected player is highlighted
4. Tap **Start Scoring** to proceed

#### Step 2: Award Points

The scoring screen shows:
- **Score display** at the top (sets, games, current point)
- **Two large buttons** -- one for each player
- **Undo button** at the bottom left
- **Menu button** at the bottom right

To score:
1. Tap the **name of the player who won the point**
2. The score updates automatically
3. Games, sets, and tiebreaks are tracked by the system
4. The match ends automatically when a player wins the required sets

#### Step 3: Match Controls

- **Undo** -- Reverses the last point (can undo multiple times)
- **Suspend Match** -- Pauses the match (for rain delays, etc.)
- **Resume Match** -- Continues a suspended match
- **End Match** -- Ends the match early:
  - Select the winner
  - Choose a reason: Retirement, Walkover, or Default

> **Tip:** Your phone will vibrate slightly with each point tap for haptic feedback.

---

## 7. Live Scoreboard

### For Spectators

Go to **zambiatennisassociation.com/live-scores** to see all matches currently in progress.

Each match card shows:
- Tournament name and category
- Player names and seeds
- Current score (sets, games, points)
- Match status (Warmup, LIVE, Suspended, Final)
- Court assignment
- Match duration

Scores update **in real-time** -- no need to refresh the page.

### For Tournament Organizers

- Share the scoreboard link on social media during tournaments
- The scoreboard works on phones, tablets, and large screens
- Consider displaying it on a TV at the venue

---

## 8. Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Can't generate a draw | Ensure at least 4 entries are **Accepted** in the category |
| Player not showing in search | Check they are registered in the system with role "player" |
| Entry fee showing surcharge | Player doesn't have a paid-up ZPIN membership. Admin can waive the surcharge |
| Umpire can't see assigned match | Ensure the match was started with the correct umpire selected from the pool |
| Live scores not updating | Check internet connection. The scoreboard uses WebSocket for real-time updates |
| Can't finalize results | All matches in the category must be completed first |
| League standings not showing | At least one tie must be completed for standings to calculate |
| Playoff generation fails | Both regional leagues (Northern & Southern) need completed standings |
| CSV import errors | Ensure columns match the template: Rank, Player Name, Club, Total Points |
| Payment link expired | Pay-later links expire after 72 hours. Admin can manually confirm payment |

### Getting Help

For technical support or to report issues:
- Email: support@zambiatennisassociation.com
- Visit: https://github.com/anthropics/claude-code/issues (for system bugs)

---

*This manual covers the ZTA Tournament & League Management System. For questions about specific features, contact the ZTA administration team.*
