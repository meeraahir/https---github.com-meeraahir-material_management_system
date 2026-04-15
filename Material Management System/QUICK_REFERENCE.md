# Frontend Developer - Quick Reference Guide

## 🔗 Quick API Endpoints Reference

### Authentication

```
POST   /core/token/              → Login
POST   /core/token/refresh/      → Refresh token
POST   /accounts/register/       → Register
```

### Materials

```
GET    /materials/               → List all materials
POST   /materials/               → Create material
GET    /material-stock/          → List stock (all sites)
POST   /material-stock/          → Add stock
PATCH  /material-stock/{id}/     → Update usage

REPORTS:
GET    /material-stock/reports/material-wise/      → By material
GET    /material-stock/reports/site-wise/          → By site
GET    /material-stock/reports/site/{id}/          → For specific site
GET    /material-stock/chart/material-wise/        → Chart data
GET    /material-stock/chart/site-wise/            → Chart data

EXPORT:
GET    /material-stock/reports/material-wise/export/   → Excel
GET    /material-stock/reports/material-wise/pdf/      → PDF
GET    /material-stock/reports/site-wise/export/       → Excel
GET    /material-stock/reports/site-wise/pdf/          → PDF
```

### Vendors

```
GET    /vendors/                 → List vendors
POST   /vendors/                 → Create vendor
GET    /vendor-transactions/     → List transactions
POST   /vendor-transactions/     → Create transaction
PATCH  /vendor-transactions/{id}/ → Update payment

REPORTS:
GET    /vendors/{id}/ledger/                    → Vendor ledger
GET    /vendors/reports/pending/                → Pending bills
GET    /vendors/reports/summary/                → Summary

EXPORT:
GET    /vendors/{id}/ledger/export/             → Excel
GET    /vendors/{id}/ledger/pdf/                → PDF
GET    /vendors/reports/pending/export/         → Excel
GET    /vendors/reports/pending/pdf/            → PDF
GET    /vendors/reports/summary/export/         → Excel
GET    /vendors/reports/summary/pdf/            → PDF
```

### Labour

```
GET    /labour/                  → List labour
POST   /labour/                  → Create labour
GET    /labour-attendance/       → List attendance
POST   /labour-attendance/       → Mark attendance
GET    /labour-payment/          → List payments
POST   /labour-payment/          → Create payment
PATCH  /labour-payment/{id}/     → Update payment

REPORTS:
GET    /labour/reports/wage/                         → Wage
GET    /labour/reports/attendance-summary/           → Summary
GET    /labour/reports/attendance-daily/             → Daily
GET    /labour/reports/attendance-weekly/            → Weekly
GET    /labour/reports/attendance-monthly/           → Monthly
GET    /labour/reports/payment-summary/              → Payment

EXPORT:
GET    /labour/reports/wage/export/                  → Excel
GET    /labour/reports/wage/pdf/                     → PDF
GET    /labour/reports/attendance-daily/export/      → Excel
GET    /labour/reports/attendance-daily/pdf/         → PDF
GET    /labour/reports/attendance-weekly/export/     → Excel
GET    /labour/reports/attendance-weekly/pdf/        → PDF
GET    /labour/reports/attendance-monthly/export/    → Excel
GET    /labour/reports/attendance-monthly/pdf/       → PDF
GET    /labour/reports/payment-summary/export/       → Excel
GET    /labour/reports/payment-summary/pdf/          → PDF
```

### Finance

```
GET    /finance/parties/         → List parties
POST   /finance/parties/         → Create party
GET    /finance/transactions/    → List transactions
POST   /finance/transactions/    → Create transaction
PATCH  /finance/transactions/{id}/ → Update

REPORTS:
GET    /finance/parties/{id}/ledger/          → Party ledger
GET    /finance/parties/reports/receivables/  → Receivables

EXPORT:
GET    /finance/parties/{id}/ledger/export/       → Excel
GET    /finance/parties/{id}/ledger/pdf/          → PDF
GET    /finance/parties/reports/receivables/export/ → Excel
GET    /finance/parties/reports/receivables/pdf/   → PDF
```

### Sites

```
GET    /sites/                   → List sites
POST   /sites/                   → Create site
GET    /sites/{id}/              → Get site
PATCH  /sites/{id}/              → Update site
DELETE /sites/{id}/              → Delete site

DASHBOARD:
GET    /sites/{id}/dashboard/           → Site dashboard
GET    /sites/{id}/dashboard/chart/      → Chart data
GET    /sites/{id}/dashboard/export/     → Export Excel
GET    /sites/{id}/dashboard/export/pdf/ → Export PDF
```

### Dashboard

```
GET    /core/dashboard/              → Main dashboard
GET    /core/dashboard/chart/        → Chart data
GET    /core/dashboard/export/       → Export Excel
GET    /core/dashboard/export/pdf/   → Export PDF
```

---

## 💡 Common Code Examples

### 1. Login & Store Token

```javascript
async function login(username, password) {
  const response = await fetch("http://localhost:8000/api/core/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}
```

### 2. API Request with Token

```javascript
async function fetchAPI(endpoint, method = "GET", body = null) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  };

  const config = {
    method,
    headers,
  };

  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`http://localhost:8000/api${endpoint}`, config);

  if (response.status === 401) {
    // Token expired - refresh it
    const newToken = await refreshToken();
    headers["Authorization"] = `Bearer ${newToken}`;
    // Retry request
    return fetch(`http://localhost:8000/api${endpoint}`, config);
  }

  return response.json();
}
```

### 3. Create Material

```javascript
function createMaterial() {
  const material = {
    name: "Cement",
    unit: "bags",
  };

  return fetchAPI("/materials/", "POST", material);
}
```

### 4. Record Material Stock

```javascript
function recordStock(siteId, materialId) {
  const stock = {
    site: siteId,
    material: materialId,
    quantity_received: 100,
    quantity_used: 0,
    cost_per_unit: 250,
    transport_cost: 500,
  };

  return fetchAPI("/material-stock/", "POST", stock);
}
```

### 5. Mark Labour Attendance

```javascript
function markAttendance(labourId, siteId, isPresent) {
  const today = new Date().toISOString().split("T")[0];

  const attendance = {
    labour: labourId,
    site: siteId,
    date: today,
    present: isPresent,
  };

  return fetchAPI("/labour-attendance/", "POST", attendance);
}
```

### 6. Get Dashboard Data

```javascript
async function getDashboard() {
  const dashboard = await fetchAPI("/core/dashboard/");

  // Use data:
  console.log("Total Sites:", dashboard.total_sites);
  console.log("Total Cost:", dashboard.total_material_cost);
  console.log("Pending:", dashboard.pending_receivables);

  return dashboard;
}
```

### 7. Get Reports

```javascript
async function getMaterialReport() {
  return await fetchAPI("/material-stock/reports/material-wise/");
}

async function getVendorPending() {
  return await fetchAPI("/vendors/reports/pending/");
}

async function getAttendanceWeekly() {
  return await fetchAPI("/labour/reports/attendance-weekly/");
}
```

### 8. Download Excel Report

```javascript
function downloadExcel(endpoint) {
  const token = localStorage.getItem("access_token");
  const url = `http://localhost:8000/api${endpoint}`;

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  xhr.responseType = "blob";

  xhr.onload = () => {
    const blob = new Blob([xhr.response], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "report.xlsx";
    link.click();
  };

  xhr.send();
}

// Usage:
downloadExcel("/material-stock/reports/material-wise/export/");
```

### 9. Download PDF Report

```javascript
function downloadPDF(endpoint) {
  const token = localStorage.getItem("access_token");
  const url = `http://localhost:8000/api${endpoint}`;

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  xhr.responseType = "blob";

  xhr.onload = () => {
    const blob = new Blob([xhr.response], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "report.pdf";
    link.click();
  };

  xhr.send();
}

// Usage:
downloadPDF("/material-stock/reports/material-wise/pdf/");
```

### 10. Update Payment Status

```javascript
function updateVendorPayment(transactionId, newPaidAmount) {
  const update = {
    paid_amount: newPaidAmount,
  };

  return fetchAPI(`/vendor-transactions/${transactionId}/`, "PATCH", update);
}
```

---

## 🎨 Display Data in Tables

### Material Table

```javascript
async function displayMaterialList() {
  const materials = await fetchAPI("/materials/");

  const table = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Unit</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${materials
          .map(
            (m) => `
          <tr>
            <td>${m.id}</td>
            <td>${m.name}</td>
            <td>${m.unit}</td>
            <td><button onclick="editMaterial(${m.id})">Edit</button></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  document.getElementById("materials-container").innerHTML = table;
}
```

### Material Stock Table

```javascript
async function displayMaterialStock() {
  const stocks = await fetchAPI("/material-stock/");

  const table = `
    <table>
      <thead>
        <tr>
          <th>Site</th>
          <th>Material</th>
          <th>Received</th>
          <th>Used</th>
          <th>Remaining</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${stocks
          .map(
            (s) => `
          <tr>
            <td>${s.site_name}</td>
            <td>${s.material_name}</td>
            <td>${s.quantity_received}</td>
            <td>${s.quantity_used}</td>
            <td>${s.remaining_stock}</td>
            <td>₹${s.total_cost}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  document.getElementById("stock-container").innerHTML = table;
}
```

---

## 📊 Chart Data Mapping

### For Charts (Using Chart.js / ApexCharts)

```javascript
async function materialChart() {
  const data = await fetchAPI("/material-stock/reports/material-wise/");

  const labels = data.map((d) => d.material_name);
  const costs = data.map((d) => d.total_cost);

  // Chart.js
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Material Cost",
          data: costs,
        },
      ],
    },
  });
}
```

---

## 🔍 Filtering Examples

```javascript
// Filter material stock by site
GET /material-stock/?site=1

// Filter labour attendance by date
GET /labour-attendance/?date=2024-01-15

// Filter vendor transactions by vendor
GET /vendor-transactions/?vendor=1

// Search vendors by name
GET /vendors/?search=ABC

// Get pending payments only
GET /finance/transactions/?received=false
```

---

## ⚡ Performance Tips

1. **Lazy Load Reports** - Don't load all reports on page load
2. **Cache Dashboard Data** - Refresh every 5 minutes
3. **Paginate Lists** - Don't load 10,000 items at once
4. **Debounce Search** - Wait 300ms after user stops typing before API call
5. **Show Loading States** - Show spinner while fetching

---

## 🛠️ Environment Setup

```javascript
// config.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// .env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## ✅ Testing Checklist

- [ ] Login works with correct credentials
- [ ] Token is stored and used in requests
- [ ] Can create and list materials
- [ ] Can record material stock
- [ ] Can create vendors and record transactions
- [ ] Can mark labour attendance
- [ ] Can view all reports
- [ ] Can export to Excel
- [ ] Can export to PDF
- [ ] Can view dashboard
- [ ] Can view site-specific dashboard
- [ ] Token refresh works on expiry
- [ ] Error messages show correctly
- [ ] Unauthorized access shows error

---

## 🐛 Common Issues & Solutions

| Issue              | Solution                                       |
| ------------------ | ---------------------------------------------- |
| 401 Unauthorized   | Check token in localStorage, refresh if needed |
| CORS Error         | Backend must have CORS enabled (already done)  |
| 404 Not Found      | Wrong endpoint - check spelling                |
| 400 Bad Request    | Invalid data - check required fields           |
| Empty response     | Check if you have data in database             |
| Export not working | Check Authorization header in request          |

---

## 📞 Support Information

**Backend running on:** `http://localhost:8000`
**API base URL:** `http://localhost:8000/api/`
**Admin panel:** `http://localhost:8000/admin/`
