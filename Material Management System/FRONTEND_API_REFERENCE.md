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

### Labour reports

- `GET /labour/reports/wage/`
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
