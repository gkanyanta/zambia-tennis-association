# Zambia Tennis Association Website

Official website for the Zambia Tennis Association (ZTA), built with React 18, TypeScript, and modern web technologies.

## 🎾 Features

- **21 Complete Pages**: Home (with slideshow), News, Leagues, Players, Clubs, Membership, Tournaments, Rankings, Play, Calendar, Juniors, Madalas, Coaches, Gallery, Transformation, Rules, About, Contact, Privacy, Terms, and 404
- **League Management System**:
  - Regional leagues (Northern & Southern)
  - Men's and Women's leagues running concurrently
  - League standings/tables with full statistics
  - Fixture management (home & away)
  - Score capture for 2 singles + 1 doubles match format
  - Match results history
  - Automatic points calculation
- **Player Database & ZPIN Management**:
  - Complete player profiles with personal information
  - ZPIN (Zambia Player Identification Number) payment tracking
  - Payment status system (Paid/Pending/Overdue)
  - Search and filter by name, ZPIN, category, or club
  - Payment history with receipt numbers
- **Club Management System**:
  - Tennis club directory with detailed profiles
  - Affiliation fee tracking for each club
  - Club status management (Active/Inactive/Suspended)
  - Payment history with receipts
  - Search and filter by province or club name
- **Image Slideshow**: Auto-playing slideshow on home page with 4 slides
- **Photo Gallery**: Interactive gallery page with category filters and lightbox modal
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Professional UI**: Shadcn UI components with custom tennis-themed design system
- **News Management**: Toggle between view and manage modes with image upload capability
- **Tournament System**: Display upcoming tournaments with registration functionality
- **Rankings Tables**: Real 2025 ZTA rankings data with tabbed interface:
  - Men's Singles: 121 players
  - Women's Singles: 57 players
  - Juniors: 50+ players (combined Boys & Girls from U10 to U18)
  - Display format: Rank, Name, Club, Total Points
- **Membership Tiers**: Three membership options with pricing cards
- **Contact Form**: Functional contact form with validation
- **SEO Optimized**: Proper meta tags and semantic HTML

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe code
- **Vite** - Fast build tool
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Re-usable component library
- **Lucide React** - Beautiful icon set
- **TanStack Query** - Data management (ready to use)

## 🎨 Design System

### Color Scheme (HSL Tokens)
- **Primary**: Tennis Green (`hsl(142 76% 36%)`)
- **Secondary**: Warm Orange (`hsl(27 96% 61%)`)
- **Accent**: Tennis Blue (`hsl(204 70% 53%)`)
- **Background/Foreground**: Semantic tokens for light/dark mode
- **Muted/Destructive**: Supporting colors

### Components
- Custom button variants (primary, secondary, outline)
- Card components with hover effects
- Hero sections with gradient backgrounds
- Responsive navigation with mobile menu
- Professional footer with links and social media

## 📁 Project Structure

```
zambia-tennis-association/
├── public/
│   └── zta-logo.svg          # ZTA logo (placeholder)
├── src/
│   ├── components/
│   │   ├── ui/               # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   └── textarea.tsx
│   │   ├── Header.tsx        # Site header with navigation
│   │   ├── Footer.tsx        # Site footer
│   │   ├── Hero.tsx          # Hero section component
│   │   ├── NewsCard.tsx      # News article card
│   │   ├── TournamentCard.tsx # Tournament card
│   │   └── MembershipCard.tsx # Membership tier card
│   ├── pages/
│   │   ├── Home.tsx          # Landing page
│   │   ├── News.tsx          # News with view/manage toggle
│   │   ├── Membership.tsx    # Membership tiers
│   │   ├── Tournaments.tsx   # Tournament listings
│   │   ├── Rankings.tsx      # Player rankings (tabbed)
│   │   ├── Play.tsx          # Find clubs & book courts
│   │   ├── Calendar.tsx      # Events calendar
│   │   ├── Juniors.tsx       # Junior programs
│   │   ├── Masters.tsx       # Masters programs
│   │   ├── Coaches.tsx       # Coach directory
│   │   ├── Transformation.tsx # ZTA vision
│   │   ├── Rules.tsx         # Tennis rules
│   │   ├── About.tsx         # About ZTA
│   │   ├── Contact.tsx       # Contact form
│   │   ├── Privacy.tsx       # Privacy policy
│   │   ├── Terms.tsx         # Terms of service
│   │   └── NotFound.tsx      # 404 page
│   ├── lib/
│   │   └── utils.ts          # Utility functions (cn)
│   ├── App.tsx               # Main app with routing
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles with design tokens
├── index.html                # HTML entry point
├── tailwind.config.ts        # Tailwind configuration
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies

```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## 📝 Development Notes

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation in `src/components/Header.tsx` (if needed)
4. Update footer links in `src/components/Footer.tsx` (if needed)

### Styling Guidelines
- Use semantic color tokens (e.g., `bg-background`, `text-foreground`)
- Avoid direct colors like `bg-white` or `text-black`
- Use utility classes from `index.css` (e.g., `card-elevated-hover`, `gradient-hero`)
- Maintain responsive design with mobile-first approach

### Component Guidelines
- All components use TypeScript interfaces
- Use the `cn()` utility for conditional classNames
- Follow existing patterns for consistency
- Keep components reusable and composable

## 🎯 Features Status

**ALL FEATURES COMPLETED! ✅**

- [x] User authentication system - **COMPLETED**
- [x] Real-time tournament registration - **COMPLETED**
- [x] Payment processing for memberships - **COMPLETED**
- [x] News article CMS integration - **COMPLETED**
- [x] Rankings database integration - **COMPLETED**
- [x] Court booking system - **COMPLETED**
- [x] Email notifications - **COMPLETED**
- [x] Calendar sync functionality - **COMPLETED**
- [x] Search functionality - **COMPLETED**
- [x] Admin dashboard - **COMPLETED**

**See `README_SETUP.md` for complete setup instructions!**

## Fix Missing Ranked Players

Players who appear in the ranking system but don't have a User record (no ZPIN assigned) can be detected, exported, reviewed, and imported using the tools below.

### How to Export

**Via Admin UI:**
1. Go to Admin Dashboard > "Missing Ranked Players"
2. Click "Run Detection" to scan for unmatched players
3. Review the summary counts
4. Click "Download CSV" or "Download XLSX"

**Via CLI:**
```bash
cd server
node src/scripts/exportMissingPlayers.js --output-dir ./exports --format both
```

The export produces a spreadsheet with columns: `action`, `segment`, `status`, `proposed_zpin`, `full_name`, `first_name`, `last_name`, `gender`, `date_of_birth`, `club`, `phone`, `email`, `ranking_source_ids`, `categories`, `matched_player_id`, `current_zpin`, `match_method`, `notes`.

### How to Review the Spreadsheet

1. Open the exported CSV/XLSX
2. For each row check:
   - **action=CREATE**: A new player will be created. Verify the name and proposed ZPIN
   - **action=UPDATE**: An existing player will get a ZPIN assigned
   - **action=SKIP**: No action. Change to CREATE/UPDATE if you want to include it
3. Edit `first_name`/`last_name` if the auto-split is wrong (rankings store full names as "LAST FIRST")
4. Add `date_of_birth`, `phone`, `email`, `club` if you have the data
5. For ambiguous matches, decide whether to CREATE a new record or SKIP

### How to Import

**Via Admin UI:**
1. Go to Admin Dashboard > "Missing Ranked Players"
2. Upload the reviewed file
3. Click "Dry Run" first to validate without changes
4. Click "Import" to apply

**Via CLI:**
```bash
# Validate first (dry run)
node src/scripts/importMissingPlayers.js ./exports/ZTA_Missing_Players_2026-02-18.csv --dry-run

# Apply changes
node src/scripts/importMissingPlayers.js ./exports/ZTA_Missing_Players_2026-02-18.csv
```

### Common Errors

| Error | Fix |
|-------|-----|
| `ZPIN "ZTASXXXX" already assigned to another player` | Another person has that ZPIN. Change `proposed_zpin` in the spreadsheet |
| `full_name is required for CREATE` | The `full_name` column is empty for a CREATE row |
| `Invalid ZPIN format` | ZPIN must match `ZTA[J\|S]NNNN` (e.g., ZTAS0091, ZTAJ0205) |
| `Duplicate proposed_zpin in file` | Two rows have the same ZPIN. Make each unique |
| `Transaction aborted due to duplicate key` | A database constraint was hit. Check for ZPIN/email conflicts |

### API Endpoints

- `GET /api/missing-players/detect` — Run detection (admin/staff)
- `GET /api/missing-players/export/csv` — Download CSV (admin/staff)
- `GET /api/missing-players/export/xlsx` — Download XLSX (admin/staff)
- `POST /api/missing-players/import?dryRun=true` — Import with validation only (admin)
- `POST /api/missing-players/import` — Import and apply changes (admin)

### Running Tests

```bash
cd server
npm test -- --testPathPatterns=missingPlayers
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

Copyright © 2025 Zambia Tennis Association. All rights reserved.

## 👥 Contact

**Zambia Tennis Association**
- Website: [zambiatennis.org](https://zambiatennis.org)
- Email: info@zambiatennis.org
- Phone: +260 211 123 456
- Address: Olympic Youth Development Centre, Lusaka, Zambia

---

Built with ❤️ for Zambian tennis
