# Material Management System - API Documentation & Project Flow

## 📋 Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vue)                         │
│  Dashboard | Material | Vendor | Labour | Finance | Reports     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              DJANGO REST FRAMEWORK (Backend)                     │
│  ├─ Authentication (JWT)                                        │
│  ├─ Material Management                                         │
│  ├─ Vendor Management                                           │
│  ├─ Labour Management                                           │
│  ├─ Finance Management                                          │
│  ├─ Site Management                                             │
│  └─ Dashboard & Reports                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    DATABASE (SQLite/PostgreSQL)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 AUTHENTICATION FLOW

### Step 1: User Registration
```
POST /api/core/auth/register/
Body: {
  "username": "admin",
  "password": "password123"
}
Response: {
  "id": 1,
  "username": "admin"
}
```

### Step 2: User Login (Get JWT Token)
```
POST /api/core/token/
Body: {
  "username": "admin",
  "password": "password123"
}
Response: {
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Step 3: Use Token in All Subsequent Requests
```
Header: Authorization: Bearer {access_token}
```

### Step 4: Refresh Token (When Access Expires)
```
POST /api/core/token/refresh/
Body: {
  "refresh": "{refresh_token}"
}
Response: {
  "access": "new_access_token"
}
```

---

## 📊 PROJECT WORKFLOW

### 1️⃣ ADMIN SETUP (First Time)
1. **Create Sites** - Add construction sites
2. **Add Materials** - Create material catalog (Cement, Sand, Steel, etc.)
3. **Add Vendors** - Register suppliers
4. **Add Labour** - Register workers
5. **Add Finance Parties** - Register clients/parties for receivables

### 2️⃣ DAILY OPERATIONS
1. **Record Material Stock** - When materials arrive at site
2. **Record Labour Attendance** - Daily worker attendance
3. **Record Vendor Transactions** - Purchases from vendors
4. **Record Labour Payments** - Pay workers
5. **Record Finance Transactions** - Money received from clients

### 3️⃣ REPORTING & ANALYSIS
1. **View Dashboard** - Get overview of all expenses
2. **Generate Material Reports** - By material or by site
3. **Generate Vendor Reports** - Vendor-wise or pending payments
4. **Generate Labour Reports** - Daily/Weekly/Monthly attendance & wages
5. **Generate Finance Reports** - Receivables status
6. **Export Reports** - PDF or Excel format

---

## 🔌 COMPLETE API REFERENCE

### BASE URL
```
http://localhost:8000/api/
```

---

## 🔑 AUTHENTICATION ENDPOINTS

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| POST | `/core/token/` | Login - Get JWT token | ❌ No |
| POST | `/core/token/refresh/` | Refresh JWT token | ❌ No |
| POST | `/accounts/register/` | Register new user | ❌ No |

---

## 🏢 SITE MANAGEMENT

### List All Sites
```
GET /sites/
Response: [
  {
    "id": 1,
    "name": "Project A",
    "location": "Mumbai",
    "description": "High-rise building"
  }
]
```

### Create Site
```
POST /sites/
Body: {
  "name": "Project B",
  "location": "Bangalore",
  "description": "Commercial complex"
}
```

### Get Site Details
```
GET /sites/{site_id}/
```

### Update Site
```
PUT /sites/{site_id}/
Body: { "name": "Updated name", ... }
```

### Delete Site
```
DELETE /sites/{site_id}/
```

---

## 📦 MATERIAL MANAGEMENT

### Material CRUD Operations

#### List All Materials
```
GET /materials/
```

#### Create Material
```
POST /materials/
Body: {
  "name": "Cement",
  "unit": "bags"
}
```

#### Get Material Details
```
GET /materials/{material_id}/
```

### Material Stock Tracking

#### List Material Stock (All Sites)
```
GET /material-stock/
```

#### Add Material Stock (Purchase)
```
POST /material-stock/
Body: {
  "site": 1,
  "material": 1,
  "quantity_received": 100,
  "quantity_used": 0,
  "cost_per_unit": 250,
  "transport_cost": 500
}
Response: {
  "id": 1,
  "site": 1,
  "material": 1,
  "quantity_received": 100,
  "quantity_used": 0,
  "remaining_stock": 100,
  "total_cost": 25500
}
```

#### Update Material Stock (Usage)
```
PATCH /material-stock/{stock_id}/
Body: {
  "quantity_used": 50
}
```

### Material Reports

#### Material-wise Report (All data aggregated by material)
```
GET /material-stock/reports/material-wise/
Response: [
  {
    "material_id": 1,
    "material_name": "Cement",
    "total_quantity_received": 500,
    "total_quantity_used": 200,
    "remaining_stock": 300,
    "total_cost": 125000
  }
]
```

#### Site-wise Report (All data aggregated by site)
```
GET /material-stock/reports/site-wise/
Response: [
  {
    "site_id": 1,
    "site_name": "Project A",
    "total_quantity_received": 1000,
    "total_quantity_used": 400,
    "remaining_stock": 600,
    "total_cost": 250000
  }
]
```

#### Site-Specific Material Report
```
GET /material-stock/reports/site/{site_id}/
Response: [material data for that site only]
```

### Material Chart Endpoints (For Dashboard)
```
GET /material-stock/chart/material-wise/
GET /material-stock/chart/site-wise/
```

### Material Export

#### Export Material Report (Excel)
```
GET /material-stock/reports/material-wise/export/
Returns: .xlsx file
```

#### Export Material Report (PDF)
```
GET /material-stock/reports/material-wise/pdf/
Returns: .pdf file
```

#### Export Site Report (Excel/PDF)
```
GET /material-stock/reports/site-wise/export/
GET /material-stock/reports/site-wise/pdf/
```

#### Export Site-Specific Material Report (Excel/PDF)
```
GET /material-stock/reports/site/{site_id}/export/
GET /material-stock/reports/site/{site_id}/pdf/
```

---

## 👥 VENDOR MANAGEMENT

### Vendor CRUD

#### List All Vendors
```
GET /vendors/
```

#### Create Vendor
```
POST /vendors/
Body: {
  "name": "ABC Cement Suppliers",
  "phone": "9876543210",
  "address": "123 Vendor St, City"
}
```

#### Get Vendor Details
```
GET /vendors/{vendor_id}/
```

### Vendor Transactions

#### Record Purchase from Vendor
```
POST /vendor-transactions/
Body: {
  "vendor": 1,
  "material": 1,
  "site": 1,
  "total_amount": 10000,
  "paid_amount": 5000
}
Response: {
  "id": 1,
  "vendor": 1,
  "total_amount": 10000,
  "paid_amount": 5000,
  "pending_amount": 5000
}
```

#### Update Payment for Transaction
```
PATCH /vendor-transactions/{transaction_id}/
Body: {
  "paid_amount": 7000
}
```

#### List Vendor Transactions
```
GET /vendor-transactions/
```

### Vendor Reports

#### Vendor Ledger (Individual vendor details)
```
GET /vendors/{vendor_id}/ledger/
Response: {
  "vendor": "ABC Suppliers",
  "transactions": [
    {
      "id": 1,
      "site": "Project A",
      "material": "Cement",
      "total_amount": 10000,
      "paid_amount": 5000,
      "pending_amount": 5000,
      "date": "2024-01-15"
    }
  ],
  "totals": {
    "total_amount": 30000,
    "paid_amount": 15000,
    "pending_amount": 15000
  }
}
```

#### Pending Transactions (All unpaid vendor bills)
```
GET /vendors/reports/pending/
Response: [
  {
    "id": 1,
    "vendor": "ABC Suppliers",
    "site": "Project A",
    "total_amount": 10000,
    "paid_amount": 5000,
    "pending_amount": 5000
  }
]
```

#### Vendor Summary (Vendor-wise totals)
```
GET /vendors/reports/summary/
Response: [
  {
    "vendor_id": 1,
    "vendor_name": "ABC Suppliers",
    "total_amount": 50000,
    "paid_amount": 30000,
    "pending_amount": 20000
  }
]
```

### Vendor Export

#### Export Vendor Ledger (Excel/PDF)
```
GET /vendors/{vendor_id}/ledger/export/
GET /vendors/{vendor_id}/ledger/pdf/
```

#### Export Pending Report (Excel/PDF)
```
GET /vendors/reports/pending/export/
GET /vendors/reports/pending/pdf/
```

#### Export Summary Report (Excel/PDF)
```
GET /vendors/reports/summary/export/
GET /vendors/reports/summary/pdf/
```

---

## 👷 LABOUR MANAGEMENT

### Labour CRUD

#### List All Labour
```
GET /labour/
```

#### Create Labour
```
POST /labour/
Body: {
  "name": "Raj Kumar",
  "phone": "9876543210",
  "per_day_wage": 500
}
```

### Labour Attendance

#### Record Daily Attendance
```
POST /labour-attendance/
Body: {
  "labour": 1,
  "site": 1,
  "date": "2024-01-15",
  "present": true
}
```

#### List Attendance
```
GET /labour-attendance/
```

#### Filter by Labour & Date
```
GET /labour-attendance/?labour=1&date=2024-01-15
```

### Labour Payment

#### Record Labour Payment
```
POST /labour-payment/
Body: {
  "labour": 1,
  "total_amount": 5000,
  "paid_amount": 0
}
```

#### Update Payment
```
PATCH /labour-payment/{payment_id}/
Body: {
  "paid_amount": 3000
}
```

### Labour Reports

#### Wage Report (Labour-wise total wages)
```
GET /labour/reports/wage/
Response: [
  {
    "id": 1,
    "name": "Raj Kumar",
    "phone": "9876543210",
    "per_day_wage": 500,
    "attendance_count": 20,
    "present_count": 18,
    "total_wage": 9000
  }
]
```

#### Attendance Summary (Labour-wise attendance)
```
GET /labour/reports/attendance-summary/
Response: [
  {
    "labour_id": 1,
    "labour_name": "Raj Kumar",
    "present_count": 18,
    "total_days": 20,
    "absent_count": 2
  }
]
```

#### Daily Attendance Report
```
GET /labour/reports/attendance-daily/
Response: [
  {
    "date": "2024-01-15",
    "present_count": 15,
    "absent_count": 2,
    "total_workers": 17
  }
]
```

#### Weekly Attendance Report
```
GET /labour/reports/attendance-weekly/
Response: [
  {
    "week": "2024-01-08",
    "present_count": 100,
    "absent_count": 15,
    "total_workers": 115
  }
]
```

#### Monthly Attendance Report
```
GET /labour/reports/attendance-monthly/
Response: [
  {
    "month": "2024-01-01",
    "present_count": 400,
    "absent_count": 60,
    "total_workers": 460
  }
]
```

#### Payment Summary (Labour-wise payment)
```
GET /labour/reports/payment-summary/
Response: [
  {
    "labour_id": 1,
    "labour_name": "Raj Kumar",
    "total_amount": 10000,
    "paid_amount": 5000,
    "pending_amount": 5000
  }
]
```

### Labour Export

#### Export Reports (Excel/PDF)
```
GET /labour/reports/wage/export/
GET /labour/reports/wage/export/ (Excel) or /pdf (PDF)
GET /labour/reports/attendance-summary/export/
GET /labour/reports/attendance-daily/export/
GET /labour/reports/attendance-weekly/export/
GET /labour/reports/attendance-monthly/export/
GET /labour/reports/payment-summary/export/
GET /labour/reports/payment-summary/pdf/
GET /labour/{labour_id}/payment-ledger/export/
GET /labour/{labour_id}/payment-ledger/pdf/
```

---

## 💰 FINANCE MANAGEMENT

### Finance Parties

#### List All Parties
```
GET /finance/parties/
```

#### Create Party
```
POST /finance/parties/
Body: {
  "name": "Client ABC",
  "contact": "9876543210"
}
```

### Finance Transactions

#### Record Receivable (Money to be received)
```
POST /finance/transactions/
Body: {
  "party": 1,
  "site": 1,
  "amount": 50000,
  "received": false
}
```

#### Update Transaction (Mark as received)
```
PATCH /finance/transactions/{transaction_id}/
Body: {
  "received": true
}
```

#### List Transactions
```
GET /finance/transactions/
```

### Finance Reports

#### Party Ledger (Transaction history per party)
```
GET /finance/parties/{party_id}/ledger/
Response: {
  "party": "Client ABC",
  "transactions": [
    {
      "id": 1,
      "site": "Project A",
      "amount": 50000,
      "received": false,
      "date": "2024-01-15"
    }
  ],
  "totals": {
    "total_amount": 100000,
    "received_amount": 50000,
    "pending_amount": 50000
  }
}
```

#### Receivables Report (Party-wise summary)
```
GET /finance/parties/reports/receivables/
Response: [
  {
    "party_id": 1,
    "party_name": "Client ABC",
    "total_amount": 100000,
    "received_amount": 50000,
    "pending_amount": 50000
  }
]
```

### Finance Export

#### Export Party Ledger (Excel/PDF)
```
GET /finance/parties/{party_id}/ledger/export/
GET /finance/parties/{party_id}/ledger/pdf/
```

#### Export Receivables Report (Excel/PDF)
```
GET /finance/parties/reports/receivables/export/
GET /finance/parties/reports/receivables/pdf/
```

---

## 📈 DASHBOARD

### Core Dashboard (System Overview)
```
GET /core/dashboard/
Response: {
  "total_sites": 5,
  "total_materials": 15,
  "total_vendors": 8,
  "total_material_cost": 500000,
  "total_vendor_cost": 300000,
  "total_labour_cost": 150000,
  "total_receivables": 200000,
  "total_received": 100000,
  "pending_receivables": 100000,
  "pending_vendor_amounts": 80000,
  "pending_labour_amounts": 40000,
  "recent_sites": [...],
  "recent_materials": [...],
  "recent_vendors": [...]
}
```

### Dashboard Chart (Same as dashboard - for charts)
```
GET /core/dashboard/chart/
```

### Dashboard Export (Excel/PDF)
```
GET /core/dashboard/export/
GET /core/dashboard/export/pdf/
```

### Site-Specific Dashboard
```
GET /sites/{site_id}/dashboard/
Response: {
  "site": {...},
  "material_summary": [...],
  "vendor_summary": [...],
  "labour_summary": [...],
  "finance_summary": [...]
}
```

### Site Dashboard Export (Excel/PDF)
```
GET /sites/{site_id}/dashboard/export/
GET /sites/{site_id}/dashboard/export/pdf/
```

---

## 🔍 FILTERING & SEARCH

Most list endpoints support filtering and searching:

```
GET /vendors/?name=ABC
GET /labour/?phone=9876
GET /material-stock/?site=1&material=1
GET /labour-attendance/?date=2024-01-15&present=true
```

---

## 📋 TYPICAL FRONTEND WORKFLOW

### Day 1: Initial Setup
1. **Admin Registration**: POST `/accounts/register/`
2. **Admin Login**: POST `/core/token/` (Get JWT token)
3. **Create Sites**: POST `/sites/`
4. **Create Materials**: POST `/materials/`
5. **Create Vendors**: POST `/vendors/`
6. **Create Labour**: POST `/labour/`
7. **Create Finance Parties**: POST `/finance/parties/`

### Day 2+: Daily Operations (Use JWT token in all requests)
1. **Check Dashboard**: GET `/core/dashboard/`
2. **Record Material Stock**: POST `/material-stock/`
3. **Record Labour Attendance**: POST `/labour-attendance/`
4. **Record Vendor Transactions**: POST `/vendor-transactions/`
5. **Record Labour Payment**: POST `/labour-payment/`
6. **Record Finance Transaction**: POST `/finance/transactions/`

### Reporting
1. **Get Specific Report**: GET `/vendors/reports/summary/`
2. **Export Report**: GET `/vendors/reports/summary/export/` or `/pdf/`
3. **View Dashboard**: GET `/core/dashboard/`
4. **View Site Dashboard**: GET `/sites/{site_id}/dashboard/`

---

## ✅ Response Format

### Success Response (200 OK)
```json
{
  "id": 1,
  "name": "Project A",
  "location": "Mumbai"
}
```

### List Response (200 OK)
```json
[
  {"id": 1, "name": "Project A"},
  {"id": 2, "name": "Project B"}
]
```

### Error Response (400/401/404/500)
```json
{
  "detail": "Error message here"
}
```

### Authentication Error (401)
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 🛠️ Headers for All Requests

```
Content-Type: application/json
Authorization: Bearer {access_token}  (except for /token/ and /register/)
```

---

## 🚀 Frontend Implementation Steps

1. **Setup Authentication UI**
   - Login form → POST `/core/token/`
   - Store JWT token in localStorage

2. **Build Dashboard Page**
   - GET `/core/dashboard/`
   - Display summaries & charts

3. **Build Material Module**
   - List: GET `/materials/`
   - Add: POST `/materials/`
   - Track Stock: POST `/material-stock/`
   - Reports: GET `/material-stock/reports/material-wise/`

4. **Build Vendor Module**
   - Similar flow as materials

5. **Build Labour Module**
   - Attendance daily
   - Mark present/absent
   - Weekly/monthly reports

6. **Build Finance Module**
   - Track receivables
   - Mark when received

7. **Build Reports Page**
   - Fetch all reports
   - Export options (Excel/PDF)

---

**All API responses are in JSON format. Use the access token in Authorization header for all authenticated requests.**

