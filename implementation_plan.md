# Donations Feature Implementation Plan

## Goal Description
Implement a donations tracking system to record and manage tithes, offerings, and other financial contributions to the church.

## Proposed Changes

### Backend (`c:\backend\src\server.ts`)

#### Data Model
```typescript
interface Donation {
    id: string;
    amount: number;
    date: string;
    donorName: string;
    memberId: string | null;
    type: 'Tithe' | 'Offering' | 'Special Gift' | 'Other';
    category?: string;
    notes: string;
    createdAt: string;
}
```

#### API Routes
- `GET /api/donations` - Get all donations (with optional query params for filtering by date range, member, type)
- `POST /api/donations` - Create a new donation
- `PUT /api/donations/:id` - Update a donation
- `DELETE /api/donations/:id` - Delete a donation
- `GET /api/donations/summary` - Get summary statistics (total, by type, by date range)

#### Validation
- Zod schema for donation validation
- Ensure amount is positive
- Validate date format

---

### Frontend

#### Types (`c:\backend\frontend\src\types.ts`)
- Add `Donation` interface matching backend

#### Pages
- **`Donations.tsx`** - List view with:
  - Summary cards (total donations, this month, this year)
  - Filterable table of donations
  - Date range filter
  - Type filter
  - Export capability (future)
- **`DonationDetails.tsx`** - Create/Edit form with:
  - Amount input
  - Date picker
  - Donor name input
  - Optional member selection
  - Type dropdown
  - Category field
  - Notes textarea

#### Navigation
- Add "Donations" link to sidebar in `Layout.tsx`
- Add routes in `App.tsx`

---

## Verification Plan

### Automated Tests
- Create `verify_donations.js`:
  - Create several donations with different types
  - Fetch all donations
  - Verify summary calculations
  - Update and delete donations

### Manual Verification
- Record various donation types through the UI
- Verify totals calculate correctly
- Test filtering by date range and type
- Verify member association works
