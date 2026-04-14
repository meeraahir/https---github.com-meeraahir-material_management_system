# Frontend API Reference

Single-source API reference for frontend integration with the current backend.

## Base URL

```text
http://localhost:8000/api/
```

## Authentication

Use JWT bearer token for all authenticated requests.

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Roles and Permissions

- `admin`: full access
- `manager`: create/update/delete
- `staff`: create/update, no delete
- `viewer`: read-only

## Common Response Shapes

### Paginated list response

All standard list endpoints using DRF `ModelViewSet` return paginated data:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1
    },
    {
      "id": 2
    }
  ]
}
```

### Validation error response

```json
{
  "field_name": [
    "Validation message"
  ]
}
```

### Export endpoints

- Excel endpoints return `.xlsx` binary
- PDF endpoints return `.pdf` binary

Frontend should download them as `blob`.

## Authentication Endpoints

### Register user

`POST /accounts/register/`

Request:

```json
{
  "username": "site_manager",
  "email": "manager@example.com",
  "first_name": "Site",
  "last_name": "Manager",
  "role": "manager",
  "password": "Password123!",
  "password2": "Password123!"
}
```

Response:

```json
{
  "user": {
    "id": 2,
    "username": "site_manager",
    "email": "manager@example.com",
    "first_name": "Site",
    "last_name": "Manager",
    "role": "manager"
  },
  "refresh": "<refresh_token>",
  "access": "<access_token>"
}
```

### Login

Preferred:

`POST /accounts/login/`

Legacy alias also works:

`POST /core/token/`

Request:

```json
{
  "username": "site_manager",
  "password": "Password123!"
}
```

You can also login with email in `username`.

Response:

```json
{
  "refresh": "<refresh_token>",
  "access": "<access_token>"
}
```

### Refresh token

Preferred:

`POST /accounts/token/refresh/`

Legacy alias also works:

`POST /core/token/refresh/`

Request:

```json
{
  "refresh": "<refresh_token>"
}
```

Response:

```json
{
  "access": "<new_access_token>"
}
```

### Current profile

`GET /accounts/profile/`

Response:

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "first_name": "Admin",
  "last_name": "User",
  "role": "admin"
}
```

## Sites Module

### List sites

`GET /sites/`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Project A",
      "location": "Mumbai",
      "description": "Residential tower"
    }
  ]
}
```

### Create site

`POST /sites/`

Request:

```json
{
  "name": "Project A",
  "location": "Mumbai",
  "description": "Residential tower"
}
```

Response:

```json
{
  "id": 1,
  "name": "Project A",
  "location": "Mumbai",
  "description": "Residential tower"
}
```

### Site dashboard

`GET /sites/{site_id}/dashboard/`

Supports optional query params:

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

Response:

```json
{
  "site": {
    "id": 1,
    "name": "Project A",
    "location": "Mumbai",
    "description": "Residential tower"
  },
  "material_summary": [
    {
      "material__id": 1,
      "material__name": "Cement",
      "total_received": 100.0,
      "total_used": 40.0,
      "total_cost": 25500.0,
      "remaining_stock": 60.0
    }
  ],
  "vendor_summary": [
    {
      "vendor_id": 1,
      "vendor_name": "ABC Suppliers",
      "total_amount": 30000.0,
      "paid_amount": 10000.0,
      "pending_amount": 20000.0
    }
  ],
  "labour_summary": [
    {
      "labour_id": 1,
      "labour_name": "Raj Kumar",
      "present_count": 5,
      "total_days": 6,
      "absent_count": 1,
      "total_wage": 2500.0,
      "paid_amount": 1000.0,
      "pending_amount": 1500.0
    }
  ],
  "finance_summary": [
    {
      "party__id": 1,
      "party__name": "Client ABC",
      "total_amount": 50000.0,
      "received_amount": 20000.0,
      "pending_amount": 30000.0
    }
  ]
}
```

### Site dashboard exports

- `GET /sites/{site_id}/dashboard/export/`
- `GET /sites/{site_id}/dashboard/export/pdf/`

## Materials Module

### Material units

Allowed values:

- `bag`
- `kg`
- `ton`
- `meter`
- `litre`
- `piece`

### List materials

`GET /materials/`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Cement",
      "unit": "bag"
    }
  ]
}
```

### Create material

`POST /materials/`

Request:

```json
{
  "name": "Cement",
  "unit": "bag"
}
```

Response:

```json
{
  "id": 1,
  "name": "Cement",
  "unit": "bag"
}
```

### List material stock

`GET /materials/stocks/`

Common filters:

- `site=<site_id>`
- `material=<material_id>`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "site": 1,
      "site_name": "Project A",
      "material": 1,
      "material_name": "Cement",
      "material_unit": "bag",
      "quantity_received": 100.0,
      "quantity_used": 40.0,
      "cost_per_unit": 250.0,
      "transport_cost": 500.0,
      "invoice_number": "INV-1001",
      "notes": "Morning delivery",
      "date": "2026-04-09",
      "total_cost": 25500.0,
      "remaining_stock": 60.0
    }
  ]
}
```

### Create material stock

`POST /materials/stocks/`

Request:

```json
{
  "site": 1,
  "material": 1,
  "quantity_received": 100,
  "quantity_used": 0,
  "cost_per_unit": 250,
  "transport_cost": 500,
  "invoice_number": "INV-1001",
  "notes": "Morning delivery",
  "date": "2026-04-09"
}
```

Response:

```json
{
  "id": 1,
  "site": 1,
  "site_name": "Project A",
  "material": 1,
  "material_name": "Cement",
  "material_unit": "bag",
  "quantity_received": 100.0,
  "quantity_used": 0.0,
  "cost_per_unit": 250.0,
  "transport_cost": 500.0,
  "invoice_number": "INV-1001",
  "notes": "Morning delivery",
  "date": "2026-04-09",
  "total_cost": 25500.0,
  "remaining_stock": 100.0
}
```

### List material usage

`GET /materials/usages/`

Filters:

- `site=<site_id>`
- `material=<material_id>`
- `receipt=<stock_id>`
- `date=YYYY-MM-DD`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "receipt": 1,
      "receipt_date": "2026-04-09",
      "receipt_invoice_number": "INV-1001",
      "site": 1,
      "site_name": "Project A",
      "material": 1,
      "material_name": "Cement",
      "quantity": 40.0,
      "date": "2026-04-10",
      "notes": "Slab work"
    }
  ]
}
```

### Material reports

Supports optional query params:

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

#### Material-wise

`GET /materials/reports/material-wise/`

Response:

```json
[
  {
    "material_id": 1,
    "material_name": "Cement",
    "total_quantity_received": 500.0,
    "total_quantity_used": 200.0,
    "remaining_stock": 300.0,
    "total_cost": 125000.0
  }
]
```

#### Site-wise

`GET /materials/reports/site-wise/`

#### Site-specific

`GET /materials/reports/site/{site_id}/`

### Material charts

- `GET /materials/chart/material-wise/`
- `GET /materials/chart/site-wise/`

### Material exports

- `GET /materials/reports/material-wise/export/`
- `GET /materials/reports/material-wise/pdf/`
- `GET /materials/reports/site-wise/export/`
- `GET /materials/reports/site-wise/pdf/`
- `GET /materials/reports/site/{site_id}/export/`
- `GET /materials/reports/site/{site_id}/pdf/`

## Vendors Module

### List vendors

`GET /vendors/`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "ABC Suppliers",
      "phone": "+919876543210",
      "email": "abc@example.com",
      "address": "Mumbai",
      "bank_name": null,
      "bank_account_number": null,
      "ifsc_code": null,
      "tax_identifier": null,
      "license_number": null,
      "document_details": null,
      "pan_number": null,
      "aadhar_number": null
    }
  ]
}
```

### Create vendor

`POST /vendors/`

Request:

```json
{
  "name": "ABC Suppliers",
  "phone": "+919876543210",
  "email": "abc@example.com",
  "address": "Mumbai"
}
```

### List vendor transactions

`GET /vendors/transactions/`

Filters:

- `vendor=<vendor_id>`
- `site=<site_id>`
- `material=<material_id>`
- `date=YYYY-MM-DD`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "vendor": 1,
      "vendor_name": "ABC Suppliers",
      "material": 1,
      "material_name": "Cement",
      "site": 1,
      "site_name": "Project A",
      "invoice_number": "PUR-001",
      "description": "100 bags",
      "total_amount": 25000.0,
      "paid_amount": 10000.0,
      "date": "2026-04-09",
      "pending_amount": 15000.0
    }
  ]
}
```

### Create vendor transaction

`POST /vendors/transactions/`

Request:

```json
{
  "vendor": 1,
  "material": 1,
  "site": 1,
  "invoice_number": "PUR-001",
  "description": "100 bags",
  "total_amount": 25000,
  "paid_amount": 10000,
  "date": "2026-04-09"
}
```

### Vendor ledger

`GET /vendors/{vendor_id}/ledger/`

Supports optional:

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

Response:

```json
{
  "vendor": "ABC Suppliers",
  "transactions": [
    {
      "id": "purchase-1",
      "entry_type": "purchase",
      "reference": "PUR-001",
      "description": "100 bags",
      "site": "Project A",
      "material": "Cement",
      "debit": 25000.0,
      "credit": 0,
      "balance": 25000.0,
      "date": "2026-04-09"
    },
    {
      "id": "payment-1",
      "entry_type": "payment",
      "reference": "PUR-001",
      "description": "Auto-created from vendor purchase update.",
      "site": "Project A",
      "material": "Cement",
      "debit": 0,
      "credit": 10000.0,
      "balance": 15000.0,
      "date": "2026-04-09"
    }
  ],
  "totals": {
    "total_amount": 25000.0,
    "paid_amount": 10000.0,
    "pending_amount": 15000.0
  }
}
```

### Vendor reports

- `GET /vendors/reports/pending/`
- `GET /vendors/reports/summary/`
- `GET /vendors/reports/site-wise/`
- `GET /vendors/reports/site/{site_id}/`

Example summary response:

```json
[
  {
    "vendor_id": 1,
    "vendor_name": "ABC Suppliers",
    "total_amount": 50000.0,
    "paid_amount": 20000.0,
    "pending_amount": 30000.0
  }
]
```

### Vendor exports

- `GET /vendors/{vendor_id}/ledger/export/`
- `GET /vendors/{vendor_id}/ledger/pdf/`
- `GET /vendors/reports/pending/export/`
- `GET /vendors/reports/pending/pdf/`
- `GET /vendors/reports/summary/export/`
- `GET /vendors/reports/summary/pdf/`
- `GET /vendors/reports/site-wise/export/`
- `GET /vendors/reports/site-wise/pdf/`
- `GET /vendors/reports/site/{site_id}/export/`
- `GET /vendors/reports/site/{site_id}/pdf/`

## Labour Module

### List labour

`GET /labour/`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Raj Kumar",
      "phone": "9876543210",
      "per_day_wage": 500.0
    }
  ]
}
```

### Create labour

`POST /labour/`

Request:

```json
{
  "name": "Raj Kumar",
  "phone": "9876543210",
  "per_day_wage": 500
}
```

### List attendance

`GET /labour/attendance/`

Filters:

- `labour=<labour_id>`
- `site=<site_id>`
- `date=YYYY-MM-DD`
- `present=true|false`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "labour": 1,
      "site": 1,
      "date": "2026-04-09",
      "present": true
    }
  ]
}
```

### Create attendance

`POST /labour/attendance/`

Request:

```json
{
  "labour": 1,
  "site": 1,
  "date": "2026-04-09",
  "present": true
}
```

### List labour payments

`GET /labour/payments/`

Filters:

- `labour=<labour_id>`
- `site=<site_id>`
- `date=YYYY-MM-DD`
- `period_start=YYYY-MM-DD`
- `period_end=YYYY-MM-DD`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "labour": 1,
      "site": 1,
      "total_amount": 1000.0,
      "paid_amount": 400.0,
      "pending_amount": 600.0,
      "calculated_total_amount": 1000.0,
      "attendance_days": 2,
      "date": "2026-04-03",
      "period_start": "2026-04-01",
      "period_end": "2026-04-03",
      "notes": null
    }
  ]
}
```

### Create labour payment

`POST /labour/payments/`

Auto-calculation works if `total_amount` is omitted.

Request:

```json
{
  "labour": 1,
  "site": 1,
  "date": "2026-04-03",
  "period_start": "2026-04-01",
  "period_end": "2026-04-03",
  "paid_amount": 400
}
```

Response:

```json
{
  "id": 1,
  "labour": 1,
  "site": 1,
  "total_amount": 1000.0,
  "paid_amount": 400.0,
  "pending_amount": 600.0,
  "calculated_total_amount": 1000.0,
  "attendance_days": 2,
  "date": "2026-04-03",
  "period_start": "2026-04-01",
  "period_end": "2026-04-03",
  "notes": null
}
```

### Labour payment ledger

`GET /labour/{labour_id}/payment-ledger/`

Supports optional:

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

Response:

```json
{
  "labour": "Raj Kumar",
  "payments": [
    {
      "id": "wage-1",
      "entry_type": "wage",
      "site": "Project A",
      "debit": 1000.0,
      "credit": 0,
      "balance": 1000.0,
      "date": "2026-04-03"
    },
    {
      "id": "payment-1",
      "entry_type": "payment",
      "site": "Project A",
      "debit": 0,
      "credit": 400.0,
      "balance": 600.0,
      "date": "2026-04-03"
    }
  ],
  "totals": {
    "total_amount": 1000.0,
    "paid_amount": 400.0,
    "pending_amount": 600.0
  }
}
```

### Particular labour monthly attendance report

`GET /labour/{labour_id}/attendance-monthly-report/`

Use this API when admin needs one labour's month-wise present/absent report.

Supports optional:

- `year=YYYY`
- `month=1-12` (requires `year`)
- `site=<site_id>`
- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

Example:

`GET /labour/1/attendance-monthly-report/?year=2026&month=4`

Response:

```json
{
  "labour_id": 1,
  "labour_name": "Raj Kumar",
  "per_day_wage": 500.0,
  "filters": {
    "year": 2026,
    "month": 4,
    "site": null,
    "date_from": null,
    "date_to": null
  },
  "totals": {
    "present_days": 5,
    "absent_days": 1,
    "total_days": 6,
    "total_wage": 2500.0
  },
  "months": [
    {
      "month": "2026-04",
      "month_start": "2026-04-01",
      "present_days": 5,
      "absent_days": 1,
      "total_days": 6,
      "total_wage": 2500.0
    }
  ]
}
```

### Labour reports

- `GET /labour/reports/wage/`
- `GET /labour/{labour_id}/attendance-monthly-report/`
- `GET /labour/reports/attendance-summary/`
- `GET /labour/reports/attendance-daily/`
- `GET /labour/reports/attendance-weekly/`
- `GET /labour/reports/attendance-monthly/`
- `GET /labour/reports/payment-summary/`
- `GET /labour/reports/site-wise/`
- `GET /labour/reports/site/{site_id}/`

Example wage report:

```json
[
  {
    "id": 1,
    "name": "Raj Kumar",
    "phone": "9876543210",
    "per_day_wage": 500.0,
    "attendance_count": 6,
    "present_count": 5,
    "total_wage": 2500.0
  }
]
```

### All labour payment summary report

`GET /labour/reports/payment-summary/`

Use this API when admin needs every labour's payment report, including total labour amount, paid amount, and pending amount. For month-wise data, pass that month's start and end dates.

Supports optional:

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

Example monthly report:

`GET /labour/reports/payment-summary/?date_from=2026-04-01&date_to=2026-04-30`

Response:

```json
[
  {
    "labour_id": 1,
    "labour_name": "Raj Kumar",
    "total_amount": 15000.0,
    "paid_amount": 10000.0,
    "pending_amount": 5000.0
  },
  {
    "labour_id": 2,
    "labour_name": "Amit Kumar",
    "total_amount": 12000.0,
    "paid_amount": 12000.0,
    "pending_amount": 0.0
  }
]
```

### Labour exports

- `GET /labour/{labour_id}/payment-ledger/export/`
- `GET /labour/{labour_id}/payment-ledger/pdf/`
- `GET /labour/reports/wage/export/`
- `GET /labour/reports/wage/pdf/`
- `GET /labour/reports/attendance-summary/export/`
- `GET /labour/reports/attendance-daily/export/`
- `GET /labour/reports/attendance-daily/pdf/`
- `GET /labour/reports/attendance-weekly/export/`
- `GET /labour/reports/attendance-weekly/pdf/`
- `GET /labour/reports/attendance-monthly/export/`
- `GET /labour/reports/attendance-monthly/pdf/`
- `GET /labour/reports/payment-summary/export/`
- `GET /labour/reports/payment-summary/pdf/`
- `GET /labour/reports/site-wise/export/`
- `GET /labour/reports/site-wise/pdf/`
- `GET /labour/reports/site/{site_id}/export/`
- `GET /labour/reports/site/{site_id}/pdf/`

## Finance Module

### List parties

`GET /finance/`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Client ABC",
      "contact": "9876543210"
    }
  ]
}
```

### Create party

`POST /finance/`

Request:

```json
{
  "name": "Client ABC",
  "contact": "9876543210"
}
```

### List finance transactions

`GET /finance/transactions/`

Filters:

- `party=<party_id>`
- `site=<site_id>`
- `received=true|false`
- `date=YYYY-MM-DD`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "party": 1,
      "site": 1,
      "amount": 50000.0,
      "phase_name": "Plaster Work",
      "description": "Second floor wall plaster pending bill",
      "received": false,
      "date": "2026-04-09",
      "current_received_amount": 20000.0,
      "pending_amount": 30000.0
    }
  ]
}
```

### Create finance transaction

`POST /finance/transactions/`

Request:

```json
{
  "party": 1,
  "site": 1,
  "amount": 50000,
  "phase_name": "Plaster Work",
  "description": "Second floor wall plaster pending bill",
  "received": false,
  "date": "2026-04-09"
}
```

Optional direct received amount during create/update:

```json
{
  "party": 1,
  "site": 1,
  "amount": 50000,
  "phase_name": "Plaster Work",
  "description": "Second floor wall plaster pending bill",
  "received_amount": 20000,
  "date": "2026-04-09"
}
```

### Receive payment against invoice

`POST /finance/transactions/{transaction_id}/receive-payment/`

Request:

```json
{
  "amount": 25000,
  "date": "2026-04-10",
  "reference_number": "RCPT-1001",
  "notes": "Part payment"
}
```

Response:

```json
{
  "id": 1,
  "party": 1,
  "site": 1,
  "amount": 50000.0,
  "phase_name": "Plaster Work",
  "description": "Second floor wall plaster pending bill",
  "received": false,
  "date": "2026-04-09",
  "current_received_amount": 25000.0,
  "pending_amount": 25000.0,
  "receipt_id": 1
}
```

### Party ledger

`GET /finance/{party_id}/ledger/`

Supports optional:

- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

Response:

```json
{
  "party": "Client ABC",
  "transactions": [
    {
      "id": "invoice-1",
      "entry_type": "invoice",
      "site": "Project A",
      "debit": 50000.0,
      "credit": 0,
      "balance": 50000.0,
      "date": "2026-04-09"
    },
    {
      "id": "receipt-1",
      "entry_type": "receipt",
      "site": "Project A",
      "debit": 0,
      "credit": 25000.0,
      "balance": 25000.0,
      "date": "2026-04-10"
    }
  ],
  "totals": {
    "total_amount": 50000.0,
    "received_amount": 25000.0,
    "pending_amount": 25000.0
  }
}
```

### Finance reports

- `GET /finance/reports/receivables/`
- `GET /finance/reports/site-wise/`
- `GET /finance/reports/site/{site_id}/`

Example receivables response:

```json
[
  {
    "party_id": 1,
    "party_name": "Client ABC",
    "total_amount": 50000.0,
    "received_amount": 20000.0,
    "pending_amount": 30000.0
  }
]
```

### Finance exports

- `GET /finance/{party_id}/ledger/export/`
- `GET /finance/{party_id}/ledger/pdf/`
- `GET /finance/reports/receivables/export/`
- `GET /finance/reports/receivables/pdf/`
- `GET /finance/reports/site-wise/export/`
- `GET /finance/reports/site-wise/pdf/`
- `GET /finance/reports/site/{site_id}/export/`
- `GET /finance/reports/site/{site_id}/pdf/`

## Core Dashboard

### Dashboard

`GET /core/dashboard/`

Response:

```json
{
  "total_sites": 3,
  "total_materials": 8,
  "total_vendors": 4,
  "total_expenses": 175000.0,
  "total_material_cost": 90000.0,
  "total_vendor_cost": 60000.0,
  "total_labour_cost": 35000.0,
  "total_receivables": 250000.0,
  "total_received": 100000.0,
  "pending_receivables": 150000.0,
  "pending_vendor_amounts": 20000.0,
  "pending_labour_amounts": 8000.0,
  "recent_sites": [
    {
      "id": 1,
      "name": "Project A",
      "location": "Mumbai",
      "description": "Residential tower"
    }
  ],
  "recent_materials": [
    {
      "id": 1,
      "name": "Cement",
      "unit": "bag"
    }
  ],
  "recent_vendors": [
    {
      "id": 1,
      "name": "ABC Suppliers",
      "phone": "+919876543210",
      "address": "Mumbai"
    }
  ],
  "total_labour": 12,
  "total_finance_parties": 5,
  "total_finance_transactions": 14,
  "total_material_stock": 1200.0,
  "total_vendor_transactions": 20,
  "recent_labour": [
    {
      "id": 1,
      "name": "Raj Kumar",
      "phone": "9876543210"
    }
  ],
  "recent_transactions": [
    {
      "id": 1,
      "amount": 50000.0,
      "received": false,
      "date": "2026-04-09"
    }
  ]
}
```

### Dashboard chart and exports

- `GET /core/dashboard/chart/`
- `GET /core/dashboard/export/`
- `GET /core/dashboard/export/pdf/`

### Owner dashboard

`GET /core/dashboard/owner/`

Supports optional:

- `date=YYYY-MM-DD`

Use this API for owner summary cards like:

- total sites
- active sites
- payment pending from clients
- payment pending to vendors
- payment pending to employees
- total cash received
- total cash outflow
- available cash balance
- negative cash balance notification

Response:

```json
{
  "user_id": 1,
  "user_name": "Admin User",
  "title": "Owner Dashboard",
  "site_activity_date": "2026-04-13",
  "summary": {
    "total_sites": 2,
    "active_sites": 1,
    "inactive_sites": 1,
    "payment_pending_from_clients": 800.0,
    "payment_pending_to_vendors": 480.0,
    "payment_pending_to_employees": 150.0,
    "total_cash_received": 600.0,
    "cash_paid_to_vendors": 200.0,
    "cash_paid_to_employees": 100.0,
    "cash_paid_to_casual_labour": 50.0,
    "cash_paid_for_miscellaneous_expenses": 25.0,
    "total_cash_outflow": 375.0,
    "cash_available": 225.0,
    "has_negative_cash_balance": false
  },
  "notifications": [],
  "site_overview": [
    {
      "site_id": 1,
      "site_name": "Alpha Site",
      "location": "Noida",
      "is_active": true,
      "payment_pending_from_clients": 400.0,
      "payment_pending_to_vendors": 300.0,
      "payment_pending_to_employees": 150.0
    },
    {
      "site_id": 2,
      "site_name": "Beta Site",
      "location": "Delhi",
      "is_active": false,
      "payment_pending_from_clients": 400.0,
      "payment_pending_to_vendors": 180.0,
      "payment_pending_to_employees": 0.0
    }
  ]
}
```

Negative cash example:

```json
{
  "summary": {
    "cash_available": -175.0,
    "has_negative_cash_balance": true
  },
  "notifications": [
    {
      "type": "negative_cash_balance",
      "severity": "high",
      "message": "Your cash balance is -175.00.",
      "cash_available": -175.0
    }
  ]
}
```

## Suggested Frontend Service Map

- Auth service:
  - `/accounts/register/`
  - `/accounts/login/`
  - `/accounts/token/refresh/`
  - `/accounts/profile/`
- Sites service:
  - `/sites/`
  - `/sites/{id}/dashboard/`
- Materials service:
  - `/materials/`
  - `/materials/stocks/`
  - `/materials/usages/`
  - `/materials/reports/...`
- Vendors service:
  - `/vendors/`
  - `/vendors/transactions/`
  - `/vendors/{id}/ledger/`
  - `/vendors/reports/...`
- Labour service:
  - `/labour/`
  - `/labour/attendance/`
  - `/labour/payments/`
  - `/labour/{id}/payment-ledger/`
  - `/labour/reports/...`
- Finance service:
  - `/finance/`
  - `/finance/transactions/`
  - `/finance/{id}/ledger/`
  - `/finance/transactions/{id}/receive-payment/`
  - `/finance/reports/...`
- Dashboard service:
  - `/core/dashboard/`

## Frontend Notes

- For all list pages, read from `response.results`.
- For all report endpoints, expect a plain JSON array.
- For dashboard endpoints, expect a plain JSON object.
- For export endpoints, handle response as `blob`.
- For 401 responses, refresh token and retry once.
- For finance and labour modules, prefer the dedicated action endpoints and computed fields instead of reproducing totals on the frontend.

## Backend Coverage Addendum

This section adds backend APIs currently available but not listed above. Existing content above is unchanged.

## Additional Common Responses

### Detail, update, and delete behavior

- `GET /resource/{id}/` returns the same serializer object used by list/create for that resource.
- `PUT /resource/{id}/` and `PATCH /resource/{id}/` return the updated object.
- `DELETE /resource/{id}/` returns `204 No Content`.

### Common error detail response

```json
{
  "detail": "You do not have permission to perform this action."
}
```

## Additional Site APIs

### Get site detail

`GET /sites/{site_id}/`

Response:

```json
{
  "id": 1,
  "name": "Project A",
  "location": "Mumbai",
  "description": "Residential tower"
}
```

### Update site

- `PUT /sites/{site_id}/`
- `PATCH /sites/{site_id}/`

Response shape is the same as `GET /sites/{site_id}/`.

### Delete site

`DELETE /sites/{site_id}/`

Response:

```text
204 No Content
```

### Site dashboard chart

`GET /sites/{site_id}/dashboard/chart/`

Response shape is the same as `GET /sites/{site_id}/dashboard/`.

## Additional Materials APIs

### Additional material unit value

Backend also allows:

- `other`

### Get, update, and delete material

- `GET /materials/{material_id}/`
- `PUT /materials/{material_id}/`
- `PATCH /materials/{material_id}/`
- `DELETE /materials/{material_id}/`

Detail/update response:

```json
{
  "id": 1,
  "name": "Cement",
  "unit": "bag",
  "variants": []
}
```

### Material variants

#### List variants

`GET /materials/variants/`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "material": 1,
      "material_name": "Steel",
      "material_unit": "kg",
      "label": "8mm",
      "size_mm": 8.0,
      "unit_weight": 0.395,
      "is_active": true,
      "current_price": 72.5,
      "current_price_date": "2026-04-09"
    }
  ]
}
```

#### Create variant

`POST /materials/variants/`

Request:

```json
{
  "material": 1,
  "label": "8mm",
  "size_mm": 8,
  "unit_weight": 0.395,
  "is_active": true
}
```

Response shape is the same as the variant object above.

#### Variant detail, update, delete

- `GET /materials/variants/{variant_id}/`
- `PUT /materials/variants/{variant_id}/`
- `PATCH /materials/variants/{variant_id}/`
- `DELETE /materials/variants/{variant_id}/`

### Material variant daily prices

#### List variant prices

`GET /materials/variant-prices/`

Common filters:

- `variant=<variant_id>`
- `date=YYYY-MM-DD`
- `variant__material=<material_id>`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "variant": 1,
      "variant_label": "8mm",
      "variant_size_mm": 8.0,
      "material_id": 1,
      "material_name": "Steel",
      "date": "2026-04-09",
      "price_per_unit": 72.5,
      "notes": "Market rate"
    }
  ]
}
```

#### Create variant price

`POST /materials/variant-prices/`

Request:

```json
{
  "variant": 1,
  "date": "2026-04-09",
  "price_per_unit": 72.5,
  "notes": "Market rate"
}
```

Response shape is the same as the variant price object above.

#### Variant price detail, update, delete

- `GET /materials/variant-prices/{price_id}/`
- `PUT /materials/variant-prices/{price_id}/`
- `PATCH /materials/variant-prices/{price_id}/`
- `DELETE /materials/variant-prices/{price_id}/`

### Material stock detail, update, and delete

- `GET /materials/stocks/{stock_id}/`
- `PUT /materials/stocks/{stock_id}/`
- `PATCH /materials/stocks/{stock_id}/`
- `DELETE /materials/stocks/{stock_id}/`

Actual stock serializer fields also include variant metadata and formatted date:

```json
{
  "id": 1,
  "site": 1,
  "site_name": "Project A",
  "material": 1,
  "material_name": "Steel",
  "material_unit": "kg",
  "material_variant": 1,
  "material_variant_label": "8mm",
  "material_variant_size_mm": 8.0,
  "material_variant_unit_weight": 0.395,
  "quantity_received": 100.0,
  "quantity_used": 20.0,
  "cost_per_unit": 72.5,
  "transport_cost": 500.0,
  "invoice_number": "INV-1002",
  "notes": "Steel delivery",
  "date": "2026-04-09",
  "date_display": "9 April 2026",
  "total_cost": 7750.0,
  "remaining_stock": 80.0
}
```

### Create material usage

`POST /materials/usages/`

Request:

```json
{
  "receipt": 1,
  "site": 1,
  "material": 1,
  "quantity": 20,
  "date": "2026-04-10",
  "notes": "Column work"
}
```

Response:

```json
{
  "id": 1,
  "receipt": 1,
  "receipt_date": "2026-04-09",
  "receipt_invoice_number": "INV-1002",
  "receipt_material_variant_label": "8mm",
  "receipt_material_variant_size_mm": 8.0,
  "site": 1,
  "site_name": "Project A",
  "material": 1,
  "material_name": "Steel",
  "quantity": 20.0,
  "date": "2026-04-10",
  "notes": "Column work"
}
```

### Material usage detail, update, delete

- `GET /materials/usages/{usage_id}/`
- `PUT /materials/usages/{usage_id}/`
- `PATCH /materials/usages/{usage_id}/`
- `DELETE /materials/usages/{usage_id}/`

### Actual material-wise report item shape

Backend report rows also include variant and cost breakdown fields:

```json
[
  {
    "material_id": 1,
    "material_name": "Steel",
    "material_unit": "kg",
    "material_variant_id": 1,
    "material_variant_label": "8mm",
    "material_variant_size_mm": 8.0,
    "cost_per_unit": 72.5,
    "transport_cost": 500.0,
    "total_quantity_received": 100.0,
    "total_quantity_used": 20.0,
    "remaining_stock": 80.0,
    "total_cost": 7750.0
  }
]
```

### Site-wise material report response

`GET /materials/reports/site-wise/`

Response:

```json
[
  {
    "site_id": 1,
    "site_name": "Project A",
    "total_quantity_received": 100.0,
    "total_quantity_used": 20.0,
    "remaining_stock": 80.0,
    "total_cost": 7750.0
  }
]
```

### Site-specific material report response

`GET /materials/reports/site/{site_id}/`

Response shape is the same as the material-wise report item shape above.

## Additional Vendors APIs

### Vendor transaction payment modes

Allowed values:

- `cash`
- `check`
- `bank_transfer`
- `upi`
- `other`

### Get, update, and delete vendor

- `GET /vendors/{vendor_id}/`
- `PUT /vendors/{vendor_id}/`
- `PATCH /vendors/{vendor_id}/`
- `DELETE /vendors/{vendor_id}/`

Response shape is the same as the vendor object used in `GET /vendors/`.

### Vendor transaction detail, update, delete

- `GET /vendors/transactions/{transaction_id}/`
- `PUT /vendors/transactions/{transaction_id}/`
- `PATCH /vendors/transactions/{transaction_id}/`
- `DELETE /vendors/transactions/{transaction_id}/`

Response shape is the same as the transaction object used in `GET /vendors/transactions/`.

### Vendor payments

#### List vendor payments

`GET /vendors/payments/`

Common filters:

- `purchase=<transaction_id>`
- `vendor=<vendor_id>`
- `site=<site_id>`
- `date=YYYY-MM-DD`
- `payment_mode=cash|check|bank_transfer|upi|other`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "purchase": 1,
      "purchase_invoice_number": "PUR-001",
      "purchase_total_amount": 25000.0,
      "purchase_pending_amount": 15000.0,
      "pending_after_payment": 15000.0,
      "vendor": 1,
      "vendor_name": "ABC Suppliers",
      "site": 1,
      "site_name": "Project A",
      "amount": 10000.0,
      "date": "2026-04-09",
      "payment_mode": "cash",
      "sender_name": "Admin User",
      "receiver_name": "ABC Suppliers",
      "cheque_number": null,
      "reference_number": "PAY-1001",
      "remarks": "Advance payment"
    }
  ]
}
```

#### Create vendor payment

`POST /vendors/payments/`

Request:

```json
{
  "purchase": 1,
  "amount": 10000,
  "date": "2026-04-09",
  "payment_mode": "cash",
  "sender_name": "Admin User",
  "receiver_name": "ABC Suppliers",
  "reference_number": "PAY-1001",
  "remarks": "Advance payment"
}
```

Response shape is the same as the vendor payment object above.

#### Vendor payment detail, update, delete

- `GET /vendors/payments/{payment_id}/`
- `PUT /vendors/payments/{payment_id}/`
- `PATCH /vendors/payments/{payment_id}/`
- `DELETE /vendors/payments/{payment_id}/`

### Vendor site-wise report response

`GET /vendors/reports/site-wise/`

Response:

```json
[
  {
    "site_id": 1,
    "site_name": "Project A",
    "total_amount": 50000.0,
    "paid_amount": 20000.0,
    "pending_amount": 30000.0
  }
]
```

### Vendor site-specific report response

`GET /vendors/reports/site/{site_id}/`

Response shape is the same as the summary report item:

```json
[
  {
    "vendor_id": 1,
    "vendor_name": "ABC Suppliers",
    "total_amount": 50000.0,
    "paid_amount": 20000.0,
    "pending_amount": 30000.0
  }
]
```

## Additional Labour APIs

### Get, update, and delete labour

- `GET /labour/{labour_id}/`
- `PUT /labour/{labour_id}/`
- `PATCH /labour/{labour_id}/`
- `DELETE /labour/{labour_id}/`

Response:

```json
{
  "id": 1,
  "name": "Raj Kumar",
  "phone": "9876543210",
  "per_day_wage": 500.0,
  "labour_type": "Mason"
}
```

### Attendance detail, update, delete

- `GET /labour/attendance/{attendance_id}/`
- `PUT /labour/attendance/{attendance_id}/`
- `PATCH /labour/attendance/{attendance_id}/`
- `DELETE /labour/attendance/{attendance_id}/`

Response shape is the same as the attendance object used in `GET /labour/attendance/`.

### Casual labour entries

#### List casual labour entries

`GET /labour/casual-labour/`

Filters:

- `site=<site_id>`
- `date=YYYY-MM-DD`
- `labour_type=<type>`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "labour_name": "Ramesh",
      "labour_type": "Helper",
      "site": 1,
      "site_name": "Project A",
      "date": "2026-04-09",
      "paid_amount": 900.0
    }
  ]
}
```

#### Create casual labour entry

`POST /labour/casual-labour/`

Request:

```json
{
  "labour_name": "Ramesh",
  "labour_type": "Helper",
  "site": 1,
  "date": "2026-04-09",
  "paid_amount": 900
}
```

Response shape is the same as the casual labour object above.

#### Casual labour detail, update, delete

- `GET /labour/casual-labour/{entry_id}/`
- `PUT /labour/casual-labour/{entry_id}/`
- `PATCH /labour/casual-labour/{entry_id}/`
- `DELETE /labour/casual-labour/{entry_id}/`

### Labour payment detail, update, delete

- `GET /labour/payments/{payment_id}/`
- `PUT /labour/payments/{payment_id}/`
- `PATCH /labour/payments/{payment_id}/`
- `DELETE /labour/payments/{payment_id}/`

Response shape is the same as the labour payment object used in `GET /labour/payments/`.

### Labour site-wise report response

`GET /labour/reports/site-wise/`

Response:

```json
[
  {
    "site_id": 1,
    "site_name": "Project A",
    "present_count": 5,
    "total_days": 6,
    "absent_count": 1,
    "total_wage": 2500.0,
    "paid_amount": 1000.0,
    "pending_amount": 1500.0
  }
]
```

### Labour site-specific report response

`GET /labour/reports/site/{site_id}/`

Response:

```json
[
  {
    "labour_id": 1,
    "labour_name": "Raj Kumar",
    "present_count": 5,
    "total_days": 6,
    "absent_count": 1,
    "total_wage": 2500.0,
    "paid_amount": 1000.0,
    "pending_amount": 1500.0
  }
]
```

## Additional Finance APIs

### Finance payment modes

Allowed values:

- `cash`
- `check`
- `bank_transfer`
- `upi`
- `other`

### Get, update, and delete party

- `GET /finance/{party_id}/`
- `PUT /finance/{party_id}/`
- `PATCH /finance/{party_id}/`
- `DELETE /finance/{party_id}/`

Response:

```json
{
  "id": 1,
  "name": "Client ABC",
  "contact": "9876543210"
}
```

### Finance transaction detail, update, delete

- `GET /finance/transactions/{transaction_id}/`
- `PUT /finance/transactions/{transaction_id}/`
- `PATCH /finance/transactions/{transaction_id}/`
- `DELETE /finance/transactions/{transaction_id}/`

Response shape is the same as the transaction object used in `GET /finance/transactions/`.

### Receive payment additional supported fields

`POST /finance/transactions/{transaction_id}/receive-payment/`

Backend also supports:

- `payment_mode`
- `sender_name`
- `receiver_name`
- `cheque_number`

Extended request example:

```json
{
  "amount": 25000,
  "date": "2026-04-10",
  "payment_mode": "check",
  "sender_name": "Client ABC",
  "receiver_name": "Admin User",
  "cheque_number": "CHK-0091",
  "reference_number": "RCPT-1001",
  "notes": "Part payment"
}
```

### Miscellaneous expenses

#### List miscellaneous expenses

`GET /finance/miscellaneous-expenses/`

Filters:

- `site=<site_id>`
- `labour=<labour_id>`
- `date=YYYY-MM-DD`
- `payment_mode=cash|check|bank_transfer|upi|other`

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Diesel",
      "site": 1,
      "site_name": "Project A",
      "labour": null,
      "labour_name": null,
      "paid_to_name": "Fuel Station",
      "amount": 3500.0,
      "date": "2026-04-09",
      "payment_mode": "cash",
      "notes": "Generator diesel"
    }
  ]
}
```

#### Create miscellaneous expense

`POST /finance/miscellaneous-expenses/`

Request:

```json
{
  "title": "Diesel",
  "site": 1,
  "labour": null,
  "paid_to_name": "Fuel Station",
  "amount": 3500,
  "date": "2026-04-09",
  "payment_mode": "cash",
  "notes": "Generator diesel"
}
```

Response shape is the same as the miscellaneous expense object above.

#### Miscellaneous expense detail, update, delete

- `GET /finance/miscellaneous-expenses/{expense_id}/`
- `PUT /finance/miscellaneous-expenses/{expense_id}/`
- `PATCH /finance/miscellaneous-expenses/{expense_id}/`
- `DELETE /finance/miscellaneous-expenses/{expense_id}/`

### Finance site-wise report response

`GET /finance/reports/site-wise/`

Response:

```json
[
  {
    "site_id": 1,
    "site_name": "Project A",
    "total_amount": 50000.0,
    "received_amount": 20000.0,
    "pending_amount": 30000.0
  }
]
```

### Finance site-specific report response

`GET /finance/reports/site/{site_id}/`

Response shape is the same as the receivables report item:

```json
[
  {
    "party_id": 1,
    "party_name": "Client ABC",
    "total_amount": 50000.0,
    "received_amount": 20000.0,
    "pending_amount": 30000.0
  }
]
```

## Additional Core Dashboard APIs

### Personal admin dashboard

`GET /core/dashboard/personal-admin/`

Supports optional:

- `date=YYYY-MM-DD`

Response:

```json
{
  "user_id": 1,
  "user_name": "Admin User",
  "title": "Personal Admin Dashboard",
  "selected_date": "2026-04-14",
  "summary": {
    "total_sites": 2,
    "currently_working_sites": 1,
    "receivable_from_parties": 50000.0,
    "payment_received": 20000.0,
    "payment_pending": 30000.0,
    "vendor_payment_paid": 15000.0,
    "vendor_payment_pending": 10000.0,
    "employee_payment_paid": 8000.0,
    "employee_payment_pending": 4000.0,
    "miscellaneous_expense_paid": 3500.0,
    "cash_receipts": 12000.0,
    "check_receipts": 8000.0,
    "bank_transfer_receipts": 0.0,
    "upi_receipts": 0.0,
    "other_receipts": 0.0,
    "cash_receipts_on_selected_date": 5000.0,
    "check_receipts_on_selected_date": 0.0,
    "receipt_payment_mode_breakdown": {
      "cash": 12000.0,
      "check": 8000.0,
      "bank_transfer": 0.0,
      "upi": 0.0,
      "other": 0.0
    },
    "total_cash_payment": 26500.0,
    "total_outgoing_payment": 26500.0,
    "cash_payment_on_selected_date": 4500.0,
    "outgoing_payment_on_selected_date": 4500.0,
    "employee_payment_on_selected_date": 1000.0,
    "miscellaneous_expense_on_selected_date": 500.0
  },
  "site_overview": [
    {
      "site_id": 1,
      "site_name": "Project A",
      "location": "Mumbai",
      "is_currently_working": true,
      "present_workers_on_selected_date": 5,
      "total_receivable": 50000.0,
      "received_amount": 20000.0,
      "pending_amount": 30000.0,
      "cash_received_amount": 12000.0,
      "check_received_amount": 8000.0,
      "bank_transfer_received_amount": 0.0,
      "upi_received_amount": 0.0,
      "other_received_amount": 0.0,
      "vendor_paid_amount": 15000.0,
      "employee_paid_amount": 8000.0,
      "employee_pending_amount": 4000.0,
      "miscellaneous_expense_amount": 3500.0
    }
  ],
  "party_receivables": [
    {
      "party_id": 1,
      "party_name": "Client ABC",
      "total_receivable": 50000.0,
      "received_amount": 20000.0,
      "pending_amount": 30000.0
    }
  ],
  "employee_payments_on_selected_date": [],
  "miscellaneous_expenses_on_selected_date": [],
  "recent_receipts": [],
  "recent_vendor_payments": [],
  "recent_employee_payments": [],
  "recent_miscellaneous_expenses": []
}
```

## Additional Router-Exposed Backend Aliases

These endpoints are also currently exposed by the backend router and return the same payload as the mapped report endpoints.

- `GET /vendors/vendors/chart/summary/` -> same as `GET /vendors/reports/summary/`
- `GET /vendors/vendors/chart/pending/` -> same as `GET /vendors/reports/pending/`
- `GET /labour/labours/chart/wage/` -> same as `GET /labour/reports/wage/`
- `GET /labour/labours/chart/attendance/` -> same as `GET /labour/reports/attendance-summary/`
- `GET /labour/labours/chart/payment/` -> same as `GET /labour/reports/payment-summary/`
- `GET /finance/parties/chart/receivables/` -> same as `GET /finance/reports/receivables/`

### Labour attendance quick summary alias

`GET /labour/labours/{labour_id}/attendance-report/`

Response:

```json
{
  "labour": "Raj Kumar",
  "total_days": 6,
  "present": 5,
  "absent": 1,
  "per_day_wage": 500.0,
  "total_wage": 2500.0
}
```
