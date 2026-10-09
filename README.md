# 🏗️ Trident Attendance — Construction Staff Attendance & Tracking App

A fully functional, mobile-friendly **Construction Staff Attendance & Geofence Tracking** web application built for field staff working across multiple remote locations.

---

## ✨ Features

- 📍 **Mandatory GPS Geolocation** — Auto-requests location permission; blocks check-in if denied
- ⏱️ **Real-time Clock** — Precise HH:MM:SS timestamps for every punch
- 🗺️ **Multi-Site Support** — Define construction sites with geofence radius
- 📊 **Manager Dashboard** — KPIs, live roster, man-hours analytics
- 📋 **30-Day Attendance Logs** — Filter by date, site, staff, and status
- 📄 **PDF Export** — Professional payroll-ready reports via jsPDF
- 📷 **Selfie Verification** — Anti-buddy-punch photo capture (optional)
- 🌙 **Dark / High-Contrast Mode** — Sunlight-readable for outdoor use
- 🗄️ **MySQL Backend** — PHP REST API with XAMPP support

---

## 🚀 Quick Start

### Option 1 — Static (No Backend)
Just open `index.html` in a browser — uses localStorage for data.

### Option 2 — Full Stack (XAMPP + MySQL)
1. Copy this project to your `htdocs` folder
2. Import `schema.sql` into MySQL (database: `trident_attendance`)
3. Update `api/db.php` with your credentials
4. Visit `http://localhost/construction-attendance/`

---

## 🗂️ Project Structure

```
construction-attendance/
├── index.html          # Main application shell
├── schema.sql          # MySQL database schema
├── css/
│   └── styles.css      # Rugged industrial design system
├── js/
│   ├── app.js          # Main application controller
│   ├── geo.js          # Geolocation & geofencing engine
│   ├── storage.js      # LocalStorage data engine
│   ├── pdf-export.js   # jsPDF report generator
│   └── camera.js       # Selfie verification module
├── api/
│   ├── db.php          # Database connection
│   ├── attendance.php  # Attendance CRUD endpoints
│   ├── staff.php       # Staff management
│   ├── sites.php       # Site management
│   └── seed.php        # Database seeder
└── assets/
    ├── trident_logo.jpg
    └── sitepulse_field_banner.jpg
```

---

## 🔐 Default Login

| Role  | Username | Password |
|-------|----------|----------|
| Admin | admin    | admin123 |

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JS
- **Maps**: Leaflet.js (OpenStreetMap)
- **PDF**: jsPDF + jsPDF-AutoTable
- **Backend**: PHP 8+, MySQL 8+
- **Dev Server**: XAMPP

---

## 📜 License

© 2026 Trident DAC. All rights reserved.
