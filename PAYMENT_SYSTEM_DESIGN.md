# ZTA Membership Payment Tracking System

## Overview
Comprehensive payment tracking system for ZTA memberships with automatic status updates.

## Membership Types & Pricing

### Players (Domestic)
- **Junior** (18 and below): K100/year
- **Senior** (19 and above): K250/year

### International Players
- **International**: K500/year (regardless of age)

### Clubs
- **Annual Affiliation Fee**: TBD (to be configured by admin)

## Database Design

### 1. Payment Model (New)
Tracks all payment transactions for audit trail and history.

```javascript
{
  _id: ObjectId,
  entityType: 'player' | 'club',           // Who paid
  entityId: ObjectId,                       // Reference to User or Club
  entityName: String,                       // Name for easy lookup
  amount: Number,                           // Amount paid (K100, K250, K500, etc)
  membershipType: String,                   // 'junior', 'adult', 'international', 'club_affiliation'
  paymentMethod: String,                    // 'cash', 'bank_transfer', 'mobile_money', 'other'
  transactionReference: String,             // Bank ref, receipt #, etc
  paymentDate: Date,                        // When payment was made
  validFrom: Date,                          // Subscription start date
  validUntil: Date,                         // Subscription end date (1 year from start)
  recordedBy: ObjectId,                     // Admin who recorded payment
  notes: String,                            // Optional notes
  status: 'completed' | 'pending' | 'refunded',
  createdAt: Date,
  updatedAt: Date
}
```

### 2. User Model Updates
Add fields to track player payment status.

```javascript
// New fields to add:
{
  isInternational: {
    type: Boolean,
    default: false                          // Distinguish international players
  },
  lastPaymentDate: Date,                    // Most recent payment
  lastPaymentAmount: Number,                // Amount of last payment
  membershipExpiry: Date,                   // Already exists, but ensure it's used
  membershipStatus: String,                 // Already exists: 'active', 'expired', 'pending'
}
```

### 3. Club Model Updates
Add fields to track club affiliation status.

```javascript
// New fields to add:
{
  affiliationFee: {
    type: Number,
    default: 0                              // Annual affiliation fee amount
  },
  lastPaymentDate: Date,                    // Most recent affiliation payment
  lastPaymentAmount: Number,                // Amount of last payment
  affiliationExpiry: Date,                  // When affiliation expires
  status: String,                           // Already exists: 'active', 'inactive'
}
```

## Key Features

### 1. Payment Recording
**Admin Interface:**
- Select player/club from dropdown
- Automatically suggest payment amount based on membership type
- Enter payment details (method, reference, date)
- Calculate expiry date (1 year from payment date)
- Save payment record and update entity status

**What happens when payment is recorded:**
1. Create new Payment record
2. Update player/club with:
   - lastPaymentDate
   - lastPaymentAmount
   - membershipExpiry/affiliationExpiry (1 year from payment)
   - status = 'active'

### 2. Automatic Status Updates
**Daily Scheduled Job:**
- Runs every day at midnight (configurable)
- Checks all players and clubs
- Updates status to 'expired' if expiry date has passed
- Optionally send expiration notifications

**Logic:**
```javascript
// For Players
if (user.membershipExpiry < today && user.membershipStatus === 'active') {
  user.membershipStatus = 'expired'
  user.save()
}

// For Clubs
if (club.affiliationExpiry < today && club.status === 'active') {
  club.status = 'inactive'
  club.save()
}
```

### 3. Payment Amount Calculation
**Automatic pricing based on player type:**
- Check if `isInternational` = true → K500
- Else check `membershipType`:
  - 'junior' → K100
  - 'adult' → K250

### 4. Payment History & Reports
**Admin can view:**
- Complete payment history with filters
- Payments by date range
- Total revenue by period
- Upcoming expirations (next 30 days, 60 days, 90 days)
- Expired memberships needing renewal
- Payment status by club

## Implementation Phases

### Phase 1: Database Setup (Essential)
1. Create Payment model
2. Add payment tracking fields to User model
3. Add payment tracking fields to Club model
4. Create database migration/update script

### Phase 2: Payment Recording (Essential)
1. Create payment recording API endpoints
2. Build admin payment recording interface
3. Implement payment amount calculation logic
4. Add payment history view

### Phase 3: Automatic Status Updates (Essential)
1. Implement scheduled job using node-cron
2. Create status update logic
3. Add logging for audit trail
4. Test expiration scenarios

### Phase 4: Reporting & Analytics (Nice-to-have)
1. Payment reports dashboard
2. Revenue analytics
3. Expiration alerts
4. Export to Excel/CSV

### Phase 5: Enhancements (Future)
1. Email notifications for expiring memberships
2. Online payment gateway integration
3. Renewal reminders
4. Payment receipts (PDF generation)
5. Multi-year subscriptions

## Technical Implementation

### Node Cron for Scheduled Jobs
```bash
npm install node-cron
```

### File Structure
```
server/src/
├── models/
│   ├── Payment.js              (NEW)
│   ├── User.js                 (UPDATE)
│   └── Club.js                 (UPDATE)
├── controllers/
│   └── paymentController.js    (NEW)
├── routes/
│   └── payments.js             (NEW)
├── jobs/
│   └── updateMembershipStatus.js (NEW)
└── server.js                   (UPDATE - add cron job)
```

### Frontend Structure
```
src/
├── pages/
│   ├── PaymentManagement.tsx   (NEW)
│   ├── PaymentHistory.tsx      (NEW)
│   └── Admin.tsx               (UPDATE - add payment card)
├── services/
│   └── paymentService.ts       (NEW)
```

## Security Considerations

1. **Authorization**: Only admin/staff can record payments
2. **Audit Trail**: All payments logged with who recorded them
3. **Validation**: Verify payment amounts match membership types
4. **Data Integrity**: Transaction references for bank reconciliation

## Advantages of This Approach

✅ **Complete Audit Trail** - Every payment is recorded with full details
✅ **Automatic Status Management** - No manual intervention needed
✅ **Flexible** - Easy to add new membership types or change pricing
✅ **Reporting Ready** - Full payment history for financial reports
✅ **Scalable** - Can add online payments in the future
✅ **Compliance** - Proper record keeping for accounting
✅ **User-Friendly** - Admins can easily record and track payments

## Migration Strategy

### For Existing Data
1. Run migration script to add new fields to existing records
2. Set default values (status based on membershipExpiry if it exists)
3. Optionally create "historical" payment records for active members
4. Set all international players manually or via import

## Testing Checklist

- [ ] Record junior player payment → status = active, expiry = +1 year
- [ ] Record senior player payment → status = active, expiry = +1 year
- [ ] Record international player payment → status = active, expiry = +1 year
- [ ] Record club affiliation → status = active, expiry = +1 year
- [ ] Run status update job → expired memberships updated
- [ ] View payment history → all payments visible
- [ ] Filter payments by date/type
- [ ] Generate revenue report

## Recommendations

**Start with Phase 1-3** (Essential features):
1. Database setup
2. Manual payment recording interface
3. Automatic status updates

This will give you a functional system immediately. Phase 4-5 can be added later based on needs.

**Priority Order:**
1. ✅ Payment Model + Database updates
2. ✅ Payment recording interface for admins
3. ✅ Automatic daily status updates
4. Later: Reports and analytics
5. Later: Email notifications and online payments
