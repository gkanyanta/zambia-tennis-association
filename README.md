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
