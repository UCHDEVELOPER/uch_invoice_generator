# 🚚 Driver Jobs & Invoice Management System

Complete Backend + Frontend (Next.js + Node.js + Prisma + MongoDB)

A fully automated system for managing driver jobs, weekly wage matching, leftover job handling, job importing, invoice generation, deductions, and bank-ready remittance files.

---

## 📌 **Overview**

This system automates the weekly driver invoicing workflow used by logistics companies like **UCH Logistics**.
It imports job data, assigns jobs to drivers, selects the optimal combination of jobs to match weekly wages, applies deductions, and generates professional invoices and TXT remittance files.

---

## 🎯 **Key Features**

### 🔹 **1. Driver Management**

* Weekly fixed rate OR hourly rate logic
* Stores total hours & total working days
* Automatic snapshot of all old rates at invoice creation
* Smart update rule:

  * If weekly rate is set ⇒ clear hourly rate fields
  * If hourly rate is set ⇒ clear weekly fixed rate

---

### 🔹 **2. Job Import Module**

* Supports **Excel/CSV**
* Converts Excel dates properly
* Ensures driver mapping by call sign
* Automatically sets `is_invoiced = false` when importing
* Detects duplicates
* Supports re-importing sheets

---

### 🔹 **3. Weekly Wage Matching Algorithm**

A highly optimized job-selection engine that:

#### ✔ Always prioritizes **leftover jobs** first

(older jobs that were not invoiced in previous weeks)

#### ✔ Then picks best combination of jobs for the current week

* Fills jobs **in ascending order by date**
* Stops at weekly target threshold
* If still below target, picks the job with the **smallest overshoot**
* Ensures **maximum number of jobs** fit inside one week
* Heavy jobs get automatically carried over

#### ✔ Automatically stores:

* Total number of dockets
* Net amount
* Final total
* Deductions
* All old driver rate snapshots

---

### 🔹 **4. Invoice Generation**

Generates:

#### 🧾 PDF Invoice

#### 📄 TXT Bank Remittance File

Each invoice includes:

* Weekly rate snapshot
* Job list & totals
* Deductions & adjustments
* Driver totals
* Driver bank details
* Invoice number & week range

---

### 🔹 **5. Carry-Forward Logic**

* All non-invoiced jobs from previous weeks automatically carry forward
* Always get invoiced *before* current week’s jobs
* Guaranteed no job gets lost
* In next cycle leftover jobs get highest priority

---

### 🔹 **6. Regeneration Logic**

If weekly rate or deductions changed:
→ Existing invoice is removed
→ All linked jobs are unlinked
→ Fresh invoice is auto-generated

If nothing changed:
→ Existing invoice is returned without regeneration

---

### 🔹 **7. Filters & Reports**

* Filter by date, week, driver, call sign
* Check job list
* Invoice history
* Export reports

---

## 🧱 **Tech Stack**

### **Frontend**

* Next.js
* Tailwind / ShadCN
* Server-side rendering

### **Backend**

* Node.js
* Express.js
* Prisma ORM

### **Database**

* MongoDB (Supabase optional)

### **Job Import**

* XLSX
* BullMQ (optional for queue-based imports)

### **Invoice Generation**

* PDFKit (or any PDF renderer)
* Custom TXT generator for banks

---

## 🗂 **Database Schema (Primary Models)**

### **Driver**

Stores rate information, bank details, and payout rules.

### **Job**

Imported job data from Excel.

### **Invoice**

Stores:

* Weekly invoice summary
* Snapshot of old driver rates
* Link to jobs
* Total dockets
* Final totals

### **InvoiceJob**

Pivot table linking jobs with invoices.

---

## 🧠 **Invoice Generation Logic Overview**

### 1️⃣ Fetch driver

### 2️⃣ Normalize date range

### 3️⃣ Check existing invoice

* If unchanged → return it
* If changed → delete & regenerate

### 4️⃣ Fetch all jobs:

* Leftover jobs (older than start date)
* Current week jobs

### 5️⃣ Select jobs

* Always include leftovers
* Fill current week jobs until weeklyTarget
* If still below target:

  * Pick job with smallest overshoot

### 6️⃣ Create invoice

### 7️⃣ Snapshot old driver rates

### 8️⃣ Mark selected jobs as invoiced

### 9️⃣ Return response

