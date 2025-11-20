# ZTA Arrears and Payment Tracking System

## Business Rules

### Fixed Expiry Date
**ALL memberships and affiliations expire on December 31st of the year payment is made**, regardless of when during the year the payment was received.

- Payment made in January 2025 → Expires December 31, 2025
- Payment made in July 2025 → Expires December 31, 2025
- Payment made in December 2025 → Expires December 31, 2025

### Arrears Tracking
**Members who don't pay in a particular year accumulate arrears that carry forward indefinitely.**

When a membership expires (after December 31st):
1. System automatically calculates the unpaid amount
2. Adds it to the member's arrears with the year it was due
3. Updates the member's `outstandingBalance`
4. Changes status to 'expired' or 'inactive'

### Payment Allocation
**Payments are automatically allocated to arrears first, then current year.**

Example: Player owes K250 from 2024 and K250 for 2025 (total K500)
- Pays K300:
  - K250 → Clears 2024 arrears
  - K50 → Partial payment for 2025
  - Status remains 'expired' (2025 not fully paid)
- Pays K500:
  - K250 → Clears 2024 arrears
  - K250 → Pays for 2025
  - Status becomes 'active'
  - Expires December 31, 2025

## Database Structure

### User/Player Fields
```javascript
{
  outstandingBalance: 500,  // Total amount owed from previous years
  arrears: [
    {
      year: 2023,
      amount: 100,
      membershipType: 'junior',
      addedOn: '2024-01-01T00:00:00Z'
    },
    {
      year: 2024,
      amount: 250,
      membershipType: 'adult',
      addedOn: '2025-01-01T00:00:00Z'
    }
  ],
  membershipExpiry: '2022-12-31T23:59:59Z',  // Last paid year
  membershipStatus: 'expired',
  lastPaymentDate: '2022-06-15',
  lastPaymentAmount: 100
}
```

### Club Fields
```javascript
{
  outstandingBalance: 1500,  // Total amount owed from previous years
  arrears: [
    {
      year: 2023,
      amount: 500,
      addedOn: '2024-01-01T00:00:00Z'
    },
    {
      year: 2024,
      amount: 1000,
      addedOn: '2025-01-01T00:00:00Z'
    }
  ],
  affiliationExpiry: '2022-12-31T23:59:59Z',
  status: 'inactive',
  lastPaymentDate: '2022-03-20',
  lastPaymentAmount: 500
}
```

## API Endpoints

### Calculate Total Amount Due
Shows full breakdown including arrears.

**GET** `/api/membership-payments/total-due/:entityType/:entityId`

```bash
GET /api/membership-payments/total-due/player/507f1f77bcf86cd799439011

Response:
{
  "success": true,
  "data": {
    "currentYearFee": 250,
    "outstandingBalance": 500,
    "totalAmountDue": 750,
    "membershipType": "adult",
    "currency": "ZMW",
    "arrears": [
      {
        "year": 2023,
        "amount": 100,
        "membershipType": "junior",
        "addedOn": "2024-01-01T00:00:00.000Z"
      },
      {
        "year": 2024,
        "amount": 400,
        "membershipType": "adult",
        "addedOn": "2025-01-01T00:00:00.000Z"
      }
    ],
    "breakdown": {
      "arrears": 500,
      "currentYear": 250
    }
  }
}
```

### Record Payment
Automatically allocates payment to arrears first.

**POST** `/api/membership-payments`

```javascript
{
  "entityType": "player",
  "entityId": "507f1f77bcf86cd799439011",
  "membershipType": "adult",
  "amount": 750,  // Total amount paid
  "paymentMethod": "cash",
  "paymentDate": "2025-01-15"
}

// System automatically:
// 1. Applies K500 to arrears (clears 2023 & 2024)
// 2. Applies K250 to current year (2025)
// 3. Sets expiry to Dec 31, 2025
// 4. Sets status to 'active'
// 5. Clears arrears array
// 6. Sets outstandingBalance to 0
```

## Automatic Status Updates

### Daily Job (Runs at Midnight)
The cron job runs every night and:

1. **Finds expired members** (membershipExpiry < today AND status = 'active')
2. **Calculates arrears**:
   - Gets the expired year from membershipExpiry
   - Calculates the fee for that year
   - Checks if arrears already exist for that year (prevents duplicates)
3. **Adds to arrears array**:
   ```javascript
   arrears.push({
     year: 2024,
     amount: 250,
     membershipType: 'adult',
     addedOn: new Date()
   })
   ```
4. **Updates outstanding balance**: `outstandingBalance += 250`
5. **Changes status**: 'active' → 'expired' (or 'inactive' for clubs)

### Example Scenario

**Timeline for a player who doesn't pay:**

```
Jan 1, 2024:
- Status: active
- Expiry: Dec 31, 2023
- Outstanding: K0
- Arrears: []

Midnight, Jan 1, 2024 (cron job runs):
- Detects: Expired on Dec 31, 2023
- Adds arrears: { year: 2023, amount: K100 }
- Outstanding: K100
- Status: expired

Jan 1, 2025 (cron job runs):
- Detects: Still expired, fee for 2024 not paid
- Adds arrears: { year: 2024, amount: K250 }
- Outstanding: K350
- Status: expired
- Arrears: [
    { year: 2023, amount: K100 },
    { year: 2024, amount: K250 }
  ]

Feb 15, 2025 (player pays K350):
- Payment allocation:
  - K100 → Clears 2023
  - K250 → Clears 2024
  - K0 remaining for 2025
- Outstanding: K0
- Arrears: []
- Status: expired (2025 not paid yet)

Feb 20, 2025 (player pays K250):
- Payment allocation:
  - K0 → No arrears
  - K250 → Pays 2025
- Expiry: Dec 31, 2025
- Status: active
```

## Payment Scenarios

### Scenario 1: Full Payment with Arrears
```
Player owes:
- 2023: K100 (arrears)
- 2024: K250 (arrears)
- 2025: K250 (current year)
Total: K600

Pays K600:
Result:
- All arrears cleared
- 2025 paid in full
- Status: active
- Expiry: Dec 31, 2025
- Outstanding: K0
```

### Scenario 2: Partial Payment
```
Player owes:
- 2024: K250 (arrears)
- 2025: K250 (current year)
Total: K500

Pays K300:
Result:
- 2024 arrears cleared (K250)
- 2025 partially paid (K50)
- Status: expired (current year not fully paid)
- Outstanding: K0 (arrears cleared)
- Still owes K200 for 2025
```

### Scenario 3: Multiple Years of Non-Payment
```
Player hasn't paid since 2021:

Outstanding Balance: K750
Arrears:
- 2022: K100 (junior)
- 2023: K100 (junior)
- 2024: K250 (adult - turned 19)
- 2025: K250 (adult)
Total Due: K1000

Pays K1000:
Result:
- All historical arrears cleared
- 2025 paid in full
- Status: active
- Expiry: Dec 31, 2025
```

## Frontend Integration

### Display Total Amount Due
```typescript
import { membershipPaymentService } from '@/services/membershipPaymentService'

// Get complete billing information
const billing = await membershipPaymentService.calculateTotalAmountDue('player', playerId)

console.log(`
  Current Year Fee: K${billing.currentYearFee}
  Outstanding Arrears: K${billing.outstandingBalance}
  TOTAL DUE: K${billing.totalAmountDue}

  Arrears Breakdown:
  ${billing.arrears.map(a => `- ${a.year}: K${a.amount}`).join('\n  ')}
`)
```

### Record Payment with Arrears
```typescript
// First, show total due
const billing = await membershipPaymentService.calculateTotalAmountDue('player', playerId)

// Display to user:
// "Outstanding: K500 (from 2023-2024)"
// "Current Year: K250"
// "Total Due: K750"

// Record payment
await membershipPaymentService.recordPayment({
  entityType: 'player',
  entityId: playerId,
  membershipType: 'adult',
  amount: 750,  // User enters amount (can be full or partial)
  paymentMethod: 'cash'
})

// System automatically allocates K500 to arrears, K250 to current year
```

## Reports & Analytics

### Outstanding Balances Report
```typescript
// Get all members with outstanding balances
const allPlayers = await userService.getPlayers()
const membersWithArrears = allPlayers.filter(p => p.outstandingBalance > 0)

const report = membersWithArrears.map(player => ({
  name: `${player.firstName} ${player.lastName}`,
  zpin: player.zpin,
  outstanding: player.outstandingBalance,
  yearsOwed: player.arrears.map(a => a.year),
  status: player.membershipStatus
}))

// Example output:
// Name: John Banda
// ZPIN: ZTAS0001
// Outstanding: K500
// Years Owed: 2023, 2024
// Status: expired
```

## Key Benefits

✅ **Transparent Debt Tracking**: Members know exactly what years they owe for
✅ **Automatic Allocation**: Payments intelligently applied to oldest debts first
✅ **Historical Record**: Complete history of missed payments
✅ **No Manual Calculation**: System automatically calculates and tracks arrears
✅ **Fair System**: Fixed December 31st expiry prevents confusion
✅ **Flexible Payments**: Members can pay partial amounts, full arrears, or everything
✅ **Audit Trail**: Every year's debt is recorded with dates

## Migration Notes

### For Existing Members
If you have existing members with active memberships:
1. Their current `membershipExpiry` will be used as-is
2. New payments will expire on December 31st of the payment year
3. If they're already expired, arrears will be calculated on next cron job run

### Initializing Arrears for Historical Non-Payment
If you want to add historical arrears for members who haven't paid in years:

```javascript
// Manual script example
const player = await User.findById(playerId)
const currentYear = new Date().getFullYear()

// Add arrears for each unpaid year
for (let year = 2022; year < current Year; year++) {
  player.arrears.push({
    year,
    amount: year <= 2023 ? 100 : 250,  // Based on when they were junior/adult
    membershipType: year <= 2023 ? 'junior' : 'adult',
    addedOn: new Date(`${year + 1}-01-01`)
  })
}

player.outstandingBalance = player.arrears.reduce((sum, a) => sum + a.amount, 0)
await player.save()
```

## Testing Checklist

- [ ] Record payment for player with no arrears → expires Dec 31 of payment year
- [ ] Let membership expire → arrears automatically added next day
- [ ] Record partial payment → arrears partially cleared, status still expired
- [ ] Record full payment → all arrears cleared, status active
- [ ] Calculate total due → shows correct breakdown
- [ ] Multiple years of non-payment → multiple arrears entries
- [ ] Partial payment across multiple arrears years → oldest cleared first
- [ ] Club affiliation with same logic → works correctly
