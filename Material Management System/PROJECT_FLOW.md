# Material Management System - Project Flow Diagram

## 🎯 Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LANDS ON APP                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Already Have Account?       │
          └──────┬──────────────┬────────┘
                 │              │
              YES │              │ NO
                 │              │
      ┌──────────▼─┐     ┌──────▼──────────┐
      │    LOGIN   │     │   REGISTER      │
      │ POST token │     │ POST register   │
      └──────┬─────┘     └────┬───────┬────┘
             │                │       │
             │  ════════════  │       │
             ▼                │       │
      ┌────────────────────┐  │       │
      │ GET JWT TOKEN      │  │       │
      │ Store in Memory    │◄─┴───────┘
      │ (Authorization)    │
      └─────────┬──────────┘
                │
                ▼
      ┌──────────────────────────────┐
      │   FIRST TIME SETUP?          │
      └──────┬──────────────┬────────┘
             │              │
          YES │              │ NO
             │              │
      ┌──────▼──┐     ┌─────▼────────┐
      │ CREATE  │     │ GO TO        │
      │ • Sites │     │ Dashboard    │
      │ • Mats  │     └─────┬────────┘
      │ • Vend  │           │
      │ • Labour│           │
      │ • Parties           │
      └──────┬──┘           │
             │              │
             └──────┬───────┘
                    ▼
      ┌──────────────────────────────┐
      │    MAIN DASHBOARD            │
      │ ┌──────────────────────────┐ │
      │ │ Total Expenses           │ │
      │ │ Pending Payments         │ │
      │ │ Labour Costs             │ │
      │ │ Material Costs           │ │
      │ └──────────────────────────┘ │
      └──────────────┬───────────────┘
                     │
              ┌──────┴──────┬──────────┬───────────┬──────────┐
              │             │          │           │          │
              ▼             ▼          ▼           ▼          ▼
          ┌────────┐  ┌────────┐  ┌──────┐  ┌────────┐  ┌────────┐
          │Material│  │Vendor  │  │Labour│  │Finance│  │ Sites  │
          │Module  │  │Module  │  │Module│  │Module │  │Module  │
          └──────┬─┘  └───┬────┘  └──┬───┘  └───┬────┘  └────┬───┘
                 │        │         │         │           │
          ┌──────┴────┐   │         │         │           │
          ▼           ▼   ▼         ▼         ▼           ▼
      ┌────────────────────────────────────────────────────────┐
      │              PERFORM DAILY OPERATIONS                  │
      │  • Record Receipt of Materials                         │
      │  • Record Vendor Purchases                             │
      │  • Mark Labour Attendance                              │
      │  • Record Payments & Receivables                       │
      └────────────────┬─────────────────────────────────────┘
                       │
                       ▼
      ┌──────────────────────────────┐
      │    GENERATE REPORTS          │
      │ ┌──────────────────────────┐ │
      │ │ • Material Report        │ │
      │ │ • Vendor Pending         │ │
      │ │ • Labour Attendance      │ │
      │ │ • Finance Receivables    │ │
      │ └──────────────────────────┘ │
      └─────────────┬────────────────┘
                    │
      ┌─────────────┴────────────┐
      │                          │
      ▼                          ▼
    EXCEL                      PDF
  (Excel Export)           (PDF Export)


```

---

## 📅 Module-Wise Detailed Flows

### 1️⃣ MATERIAL FLOW
```
User wants to track materials
        │
        ▼
    ADD MATERIAL
    POST /materials/
    {"name": "Cement", "unit": "bags"}
        │
        ▼
    RECEIVE AT SITE
    POST /material-stock/
    {"site": 1, "material": 1, "qty": 100, "cost": 250}
        │
        ▼
    USE ON SITE
    PATCH /material-stock/{id}/
    {"quantity_used": 50}
        │
        ├─ View Current Stock
        │  GET /material-stock/ → Shows remaining stock
        │
        ├─ Material-wise Report
        │  GET /material-stock/reports/material-wise/
        │  (Which material costs most? Which is used most?)
        │
        ├─ Site-wise Report
        │  GET /material-stock/reports/site-wise/
        │  (Which site spent most on materials?)
        │
        └─ Export
           GET /material-stock/reports/material-wise/export/
           GET /material-stock/reports/material-wise/pdf/
```

### 2️⃣ VENDOR FLOW
```
Need to track vendor payments
        │
        ▼
    ADD VENDOR
    POST /vendors/
    {"name": "ABC Suppliers", "phone": "9876543210"}
        │
        ▼
    BUY FROM VENDOR
    POST /vendor-transactions/
    {"vendor": 1, "material": 1, "total": 10000, "paid": 5000}
    → pending = 5000
        │
        ├─ Initial Status
        │  pending_amount = 5000
        │
        ├─ Make Partial Payment
        │  PATCH /vendor-transactions/{id}/
        │  {"paid_amount": 7000}
        │  → pending_amount = 3000
        │
        ├─ Make Full Payment
        │  PATCH /vendor-transactions/{id}/
        │  {"paid_amount": 10000}
        │  → pending_amount = 0
        │
        ├─ Check Pending Bills
        │  GET /vendors/reports/pending/
        │  (Which vendors still owe money?)
        │
        ├─ Vendor Ledger (Full history)
        │  GET /vendors/{vendor_id}/ledger/
        │  (All transactions with vendor 1)
        │
        ├─ Vendor Summary
        │  GET /vendors/reports/summary/
        │  (Total spent per vendor)
        │
        └─ Export
           GET /vendors/{vendor_id}/ledger/export/ (Excel)
           GET /vendors/{vendor_id}/ledger/pdf/ (PDF)
```

### 3️⃣ LABOUR FLOW
```
Track workers and wages
        │
        ▼
    ADD LABOUR
    POST /labour/
    {"name": "Raj Kumar", "per_day_wage": 500}
        │
        ▼
    DAILY ATTENDANCE
    POST /labour-attendance/
    {"labour": 1, "site": 1, "date": "2024-01-15", "present": true}
        │
        ├─ Daily (Every day mark present/absent)
        │
        ├─ Weekly Summary (End of week)
        │  GET /labour/reports/attendance-weekly/
        │  → 5 days present, 1 day absent
        │
        ├─ Monthly Summary (End of month)
        │  GET /labour/reports/attendance-monthly/
        │  → 18 days present out of 20
        │
        ├─ Calculate Wage
        │  total_wage = present_days × per_day_wage
        │  → 18 × 500 = 9000
        │
        ├─ Record Payment
        │  POST /labour-payment/
        │  {"labour": 1, "total": 9000, "paid": 5000}
        │
        ├─ Payment Update
        │  PATCH /labour-payment/{id}/
        │  {"paid_amount": 9000}
        │
        └─ Reports
           GET /labour/reports/wage/            → All labour wage
           GET /labour/reports/attendance-daily/ → Daily who came
           GET /labour/reports/payment-summary/  → Who paid, pending
           GET /labour/reports/attendance-summary/
```

### 4️⃣ FINANCE FLOW
```
Track money from clients
        │
        ▼
    ADD PARTY (Client)
    POST /finance/parties/
    {"name": "Client XYZ", "contact": "9876543210"}
        │
        ▼
    RECORD RECEIVABLE (Invoice issued)
    POST /finance/transactions/
    {
      "party": 1,
      "site": 1,
      "amount": 50000,
      "received": false
    }
        │
        ├─ Status: NOT RECEIVED (received=false)
        │  → Appears in pending_receivables
        │
        ├─ Partial Payment Received
        │  PATCH /finance/transactions/{id}/
        │  (Create new transaction with received=true, 25000)
        │
        ├─ Full Payment Received
        │  PATCH /finance/transactions/{id}/
        │  (Create new transaction or update the existing one)
        │
        ├─ Party Ledger (Full history)
        │  GET /finance/parties/{party_id}/ledger/
        │  (Total: 50000, Received: 25000, Pending: 25000)
        │
        ├─ Receivables Report
        │  GET /finance/parties/reports/receivables/
        │  (Party-wise: who owes how much)
        │
        └─ Export
           GET /finance/parties/{party_id}/ledger/export/
           GET /finance/parties/reports/receivables/pdf/
```

### 5️⃣ SITE FLOW
```
Multi-site project tracking
        │
        ▼
    CREATE SITE
    POST /sites/
    {"name": "Project A", "location": "Mumbai"}
        │
        ├─ All transactions link to sites
        │  • Materials → site 1
        │  • Labour → site 1
        │  • Vendors → site 1
        │  • Finance → site 1
        │
        ├─ Site Dashboard
        │  GET /sites/{site_id}/dashboard/
        │  Shows:
        │  • All materials used at this site
        │  • All vendors supplying this site
        │  • All labour working at this site
        │  • All receivables for this site
        │
        └─ Export
           GET /sites/{site_id}/dashboard/export/
           GET /sites/{site_id}/dashboard/pdf/
```

### 6️⃣ DASHBOARD FLOW
```
Admin wants overview
        │
        ▼
    VISIT DASHBOARD
    GET /core/dashboard/
        │
        ├─ Displays:
        │  • Total 5 Sites
        │  • Total 15 Materials
        │  • Total 8 Vendors
        │  • Total Expense: Rs. 500,000
        │  • Total Labour Cost: Rs. 150,000
        │  • Pending Payments to Vendors: Rs. 80,000
        │  • Pending from Clients: Rs. 100,000
        │
        ├─ Chart View
        │  GET /core/dashboard/chart/
        │  (Same data, formatted for charts)
        │
        └─ Export
           GET /core/dashboard/export/ → Excel
           GET /core/dashboard/export/pdf/ → PDF
```

---

## 🔄 Daily Workflow Example

### MONDAY MORNING (Admin checks status)
```
1. GET /core/dashboard/
   → Sees all current expenses & pending
   
2. GET /sites/1/dashboard/
   → Checks specific site status
```

### MONDAY (Vendor delivers materials)
```
1. POST /material-stock/
   → Record: 100 bags cement received for Rs. 25,000
   
2. POST /vendor-transactions/
   → Record: Paid Rs. 12,500 to vendor ABC
   → Pending: Rs. 12,500
```

### MONDAY (Record attendance)
```
1. Post /labour-attendance/
   → Raj Kumar - Present
   → Mohan - Absent
   → Priya - Present
   → ... (for 15 workers)
```

### TUESDAY (Payment cycle)
```
1. PATCH /labour-payment/{id}/
   → Pay 5 incomplete workers pending wages
   
2. PATCH /vendor-transactions/{id}/
   → Pay partial vendor payment
   
3. PATCH /finance/transactions/{id}/
   → Receive payment from client
```

### FRIDAY (Generate Reports)
```
1. GET /labour/reports/attendance-weekly/
   → See weekly attendance
   
2. GET /labour/reports/payment-summary/
   → See pending labour payments
   
3. GET /vendors/reports/pending/
   → See pending vendor bills
   
4. GET /finance/parties/reports/receivables/
   → See pending client receivables
   
5. Export all reports to PDF/Excel
```

### WEEKEND (Review & Analysis)
```
1. GET /material-stock/reports/site-wise/
   → Which site spent most on materials?
   
2. GET /material-stock/reports/material-wise/
   → Which material is most expensive?
   
3. GET /labour/reports/wage/
   → Total labour cost
   
4. GET /core/dashboard/
   → Final weekly overview
```

---

## 📱 Frontend Page Structure

```
FRONTEND APP
├── Authentication Page
│   ├── Login
│   └── Register
│
├── Dashboard Page
│   ├── Summary Cards (Total expenses, pending, etc.)
│   ├── Charts (Pie, Bar, Line)
│   └── Quick Actions
│
├── Material Page
│   ├── Material List
│   ├── Add Material
│   ├── Material Stock Table
│   ├── Material-wise Report
│   ├── Site-wise Report
│   └── Export Button
│
├── Vendor Page
│   ├── Vendor List
│   ├── Add Vendor
│   ├── Vendor Transactions
│   ├── Vendor Ledger
│   ├── Pending Bills Report
│   └── Export Button
│
├── Labour Page
│   ├── Labour List
│   ├── Add Labour
│   ├── Daily Attendance Marking
│   ├── Weekly/Monthly Reports
│   ├── Payment Tracking
│   └── Export Button
│
├── Finance Page
│   ├── Party List
│   ├── Add Party
│   ├── Receivables Tracking
│   ├── Party Ledger
│   ├── Export Button
│
├── Sites Page
│   ├── Site List
│   ├── Add Site
│   ├── Site Dashboard
│   ├── Site Reports
│   └── Export Button
│
└── Reports & Export Page
    ├── All Reports
    └── Export Options (Excel/PDF)
```

---

## ⚡ Response Time Expectations

| Operation | Time |
|-----------|------|
| Login | < 1 second |
| Dashboard Load | < 2 seconds |
| List (50 items) | < 1 second |
| Create Record | < 1 second |
| Generate Report | 1-3 seconds |
| Export to Excel | 2-5 seconds |
| Export to PDF | 2-5 seconds |

---

## 🛡️ Error Scenarios

```
Scenario 1: User forgets login
→ Redirect to login page
→ POST /core/token/ with credentials

Scenario 2: Token expires
→ Catch 401 error
→ POST /core/token/refresh/ to get new token
→ Retry original request

Scenario 3: User tries unauthorized action
→ Catch 403 error
→ Show: "You don't have permission"

Scenario 4: Invalid data
→ Catch 400 error
→ Show validation error message

Scenario 5: Server error
→ Catch 500 error
→ Show: "Server error, please try again later"
```

---

## 🚀 Frontend Development Checklist

- [ ] Setup project with React/Vue
- [ ] Setup API axios/fetch client with JWT interceptor
- [ ] Create Login/Register pages
- [ ] Redirect to dashboard on successful login
- [ ] Build dashboard page with summary cards
- [ ] Build Material module (CRUD + Reports)
- [ ] Build Vendor module (Ledger + Reports)
- [ ] Build Labour module (Attendance + Reports)
- [ ] Build Finance module (Receivables + Reports)
- [ ] Build Sites module
- [ ] Implement Excel/PDF export
- [ ] Add charts and visualizations
- [ ] Test all API integrations
- [ ] Handle errors and loading states
- [ ] Add success/error notifications

