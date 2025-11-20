# Payment System Implementation - Phase 1 Complete

## Overview
Phase 1 of the membership payment tracking system has been successfully implemented. This document describes what has been created and how to use it.

## ✅ What Has Been Implemented

### Backend (Complete)

#### 1. Database Models
- **Settings Model** (`server/src/models/Settings.js`)
  - Stores configurable membership fees (junior, adult, international)
  - Club affiliation fee
  - Validity period and grace period settings
  - Auto-update schedule configuration
  - Singleton pattern - only one settings document exists

- **Payment Model** (`server/src/models/Payment.js`)
  - Complete payment transaction history
  - Tracks payments for both players and clubs
  - Payment methods, dates, validity periods
  - Links to entities and admin who recorded payment
  - Status tracking (completed, pending, refunded, cancelled)

- **User Model Updates** (`server/src/models/User.js`)
  - Added `isInternational` flag to distinguish international players
  - Added `lastPaymentDate`, `lastPaymentAmount`, `lastPaymentId`
  - Existing `membershipExpiry` and `membershipStatus` fields utilized

- **Club Model Updates** (`server/src/models/Club.js`)
  - Added `affiliationFee`, `lastPaymentDate`, `lastPaymentAmount`
  - Added `lastPaymentId` and `affiliationExpiry`
  - Existing `status` field utilized

#### 2. API Endpoints

**Settings API** (`/api/settings`)
- `GET /api/settings` - Get all settings (admin only)
- `PUT /api/settings` - Update settings (admin only)
- `GET /api/settings/fees` - Get membership fees (public)
- `POST /api/settings/update-status` - Manually trigger status update (admin)

**Membership Payments API** (`/api/membership-payments`)
- `POST /` - Record a new payment (admin/staff)
- `GET /` - Get all payments with filters (admin/staff)
- `GET /stats` - Get payment statistics (admin/staff)
- `GET /expiring` - Get expiring memberships (admin/staff)
- `GET /calculate-amount/:entityType/:entityId` - Calculate suggested amount
- `GET /entity/:entityType/:entityId` - Get payments for specific entity
- `GET /:id` - Get payment by ID

#### 3. Automated Status Updates
- **Cron Job** (`server/src/jobs/updateMembershipStatus.js`)
  - Runs daily at midnight (configurable in settings)
  - Automatically updates player membership status from 'active' to 'expired'
  - Automatically updates club status from 'active' to 'inactive'
  - Logs all updates with timestamps
  - Can be manually triggered via API

### Frontend (Complete)

#### 1. TypeScript Services
- **membershipPaymentService.ts** - Full payment management API client
- **settingsService.ts** - Settings management API client

## 🎯 How The System Works

### Payment Recording Flow

1. Admin selects player or club
2. System calculates suggested payment amount based on:
   - For players: Check if `isInternational` → K500, else check `membershipType` (junior → K100, adult → K250)
   - For clubs: Use `clubAffiliationFee` from settings
3. Admin can override amount if needed
4. Admin enters payment details (method, reference, date, notes)
5. System creates payment record and:
   - Updates entity's payment fields
   - Sets expiry date (1 year from payment date by default)
   - Sets status to 'active'
6. Full audit trail maintained

### Automatic Status Updates

**Daily at Midnight:**
```
1. Job checks all players where:
   - membershipStatus = 'active'
   - membershipExpiry < today
   → Updates to 'expired'

2. Job checks all clubs where:
   - status = 'active'
   - affiliationExpiry < today
   → Updates to 'inactive'

3. Logs results
```

### Configurable Amounts

Admins can change membership fees via Settings:
```json
{
  "membershipFees": {
    "junior": 100,      // Changeable
    "adult": 250,       // Changeable
    "international": 500 // Changeable
  },
  "clubAffiliationFee": 500,  // Changeable
  "membershipValidityDays": 365,  // 1 year, changeable
  "gracePeriodDays": 30,  // Optional grace period
  "autoUpdateStatus": {
    "enabled": true,
    "scheduleTime": "00:00"  // Changeable
  }
}
```

## 📝 API Usage Examples

### Record a Player Payment

```bash
POST /api/membership-payments
Headers: Authorization: Bearer <admin_token>

Body:
{
  "entityType": "player",
  "entityId": "507f1f77bcf86cd799439011",
  "membershipType": "junior",
  "amount": 100,
  "paymentMethod": "cash",
  "transactionReference": "REC-2025-001",
  "paymentDate": "2025-01-20",
  "notes": "Paid in full"
}
```

### Record a Club Affiliation Payment

```bash
POST /api/membership-payments
Headers: Authorization: Bearer <admin_token>

Body:
{
  "entityType": "club",
  "entityId": "507f1f77bcf86cd799439012",
  "membershipType": "club_affiliation",
  "amount": 500,
  "paymentMethod": "bank_transfer",
  "transactionReference": "BT-2025-100",
  "paymentDate": "2025-01-20"
}
```

### Get Payment Statistics

```bash
GET /api/membership-payments/stats?startDate=2025-01-01&endDate=2025-12-31
Headers: Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "totalRevenue": 45200,
    "totalPayments": 245,
    "revenueByType": [
      { "_id": "junior", "total": 10000, "count": 100 },
      { "_id": "adult", "total": 25000, "count": 100 },
      { "_id": "international", "total": 5000, "count": 10 },
      { "_id": "club_affiliation", "total": 5200, "count": 35 }
    ],
    "expiringSoon": 25,
    "expired": 10
  }
}
```

### Update Membership Fees

```bash
PUT /api/settings
Headers: Authorization: Bearer <admin_token>

Body:
{
  "membershipFees": {
    "junior": 150,          // Increased from 100
    "adult": 300,           // Increased from 250
    "international": 600    // Increased from 500
  },
  "clubAffiliationFee": 750  // Increased from 500
}
```

### Manually Trigger Status Update

```bash
POST /api/settings/update-status
Headers: Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "playersUpdated": 15,
    "clubsUpdated": 3,
    "timestamp": "2025-01-20T10:30:00.000Z"
  }
}
```

## 🚀 Testing the System

### 1. Test Settings Initialization
```bash
# Server will auto-create settings on first run
# Check logs: "Scheduling membership status update job: 00 00 * * *"
```

### 2. Test Payment Recording
```javascript
// Use membershipPaymentService in frontend
import { membershipPaymentService } from '@/services/membershipPaymentService'

// Calculate suggested amount
const suggestion = await membershipPaymentService.calculatePaymentAmount('player', playerId)
console.log(suggestion) // { amount: 100, membershipType: 'junior', currency: 'ZMW' }

// Record payment
const payment = await membershipPaymentService.recordPayment({
  entityType: 'player',
  entityId: playerId,
  membershipType: 'junior',
  amount: 100,
  paymentMethod: 'cash',
  paymentDate: new Date().toISOString()
})
```

### 3. Test Automatic Status Update
```bash
# Wait for midnight OR manually trigger:
curl -X POST http://localhost:5000/api/settings/update-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Test Payment History
```javascript
// Get player's payment history
const payments = await membershipPaymentService.getEntityPayments('player', playerId)

// Get all payments with filters
const allPayments = await membershipPaymentService.getPayments({
  entityType: 'player',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  page: 1,
  limit: 50
})
```

## 📋 Next Steps: Building the Admin UI

To complete the system, you need to create React components for the admin interface. Here's what's needed:

### 1. Settings Management Page
**Path:** `/admin/settings`

**Components to create:**
- `src/pages/SettingsManagement.tsx`
- Form to update membership fees
- Toggle for auto-update status
- Schedule time picker
- Save button

**Example structure:**
```tsx
import { settingsService } from '@/services/settingsService'

// Load settings
const settings = await settingsService.getSettings()

// Update settings
await settingsService.updateSettings({
  membershipFees: {
    junior: 150,
    adult: 300,
    international: 600
  }
})
```

### 2. Payment Recording Page
**Path:** `/admin/payments/record`

**Components to create:**
- `src/pages/PaymentRecording.tsx`
- Entity type selector (Player/Club)
- Entity search/dropdown
- Auto-calculated amount display (with override option)
- Payment method selector
- Transaction reference input
- Payment date picker
- Notes textarea
- Submit button

### 3. Payment History Page
**Path:** `/admin/payments/history`

**Components to create:**
- `src/pages/PaymentHistory.tsx`
- Filterable table (by entity type, date range, membership type)
- Pagination
- Export to CSV button
- View payment details modal

### 4. Payment Statistics Dashboard
**Path:** `/admin/payments/stats`

**Components to create:**
- `src/pages/PaymentStats.tsx`
- Revenue cards (total, by type)
- Charts (revenue over time, breakdown by type)
- Expiring memberships alert
- Date range filter

### 5. Update Admin Dashboard
**File:** `src/pages/Admin.tsx`

Add new cards:
```tsx
{
  title: 'Payment Settings',
  description: 'Configure membership fees and billing',
  icon: Settings,
  action: () => navigate('/admin/settings'),
  color: 'text-blue-500'
},
{
  title: 'Record Payment',
  description: 'Record membership or affiliation payments',
  icon: DollarSign,
  action: () => navigate('/admin/payments/record'),
  color: 'text-green-500'
},
{
  title: 'Payment History',
  description: 'View all payment transactions',
  icon: Receipt,
  action: () => navigate('/admin/payments/history'),
  color: 'text-purple-500'
}
```

### 6. Update App.tsx Routes

```tsx
import { SettingsManagement } from '@/pages/SettingsManagement'
import { PaymentRecording } from '@/pages/PaymentRecording'
import { PaymentHistory } from '@/pages/PaymentHistory'
import { PaymentStats } from '@/pages/PaymentStats'

// Add routes:
<Route path="/admin/settings" element={<SettingsManagement />} />
<Route path="/admin/payments/record" element={<PaymentRecording />} />
<Route path="/admin/payments/history" element={<PaymentHistory />} />
<Route path="/admin/payments/stats" element={<PaymentStats />} />
```

## 🔧 Configuration Options

### Change Auto-Update Schedule
Update settings to run at different time:
```json
{
  "autoUpdateStatus": {
    "enabled": true,
    "scheduleTime": "02:00"  // Run at 2:00 AM instead
  }
}
```

### Change Membership Validity Period
```json
{
  "membershipValidityDays": 180  // 6 months instead of 1 year
}
```

### Disable Auto-Updates
```json
{
  "autoUpdateStatus": {
    "enabled": false
  }
}
```

## 🛡️ Security

- All payment endpoints require authentication
- Only admin/staff can record payments
- Only admin can update settings
- Full audit trail - every payment records who created it
- Settings track who last modified them

## 📊 Database Indexes

The Payment model has indexes for optimal query performance:
- `{ entityType: 1, entityId: 1 }` - Fast entity lookup
- `{ paymentDate: -1 }` - Fast date-based queries
- `{ status: 1 }` - Fast status filtering
- `{ membershipType: 1 }` - Fast type-based queries
- `{ validUntil: 1 }` - Fast expiration checks

## 🎉 Summary

**What Works Now:**
✅ Configurable membership fees (no hardcoded amounts)
✅ Complete payment history tracking
✅ Automatic daily status updates
✅ Manual status update trigger
✅ Payment statistics and reporting
✅ Full API with TypeScript services
✅ Audit trail for all operations

**What's Next:**
- Build React admin UI components (examples provided above)
- Add payment receipt PDF generation (future enhancement)
- Add email notifications for expiring memberships (future enhancement)
- Integrate online payment gateway (future enhancement)

The foundation is complete and production-ready. You can now build the admin UI using the provided services and API endpoints!
