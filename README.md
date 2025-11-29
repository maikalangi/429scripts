# FSM Demo Server

A lightweight, dependency-free prototype API for a field service management (FSM) platform. It offers in-memory data for customers, technicians, quotes, jobs, and invoices so you can quickly exercise the scheduling and dispatch flow end-to-end.

## Prerequisites
- Node.js 18+ (uses the built-in HTTP server and `crypto.randomUUID`).

## Installation
No external packages are required. Clone the repo and you're ready to go.

## Running the server
```bash
node src/index.js
```
The server listens on port `3000` by default. Override with `PORT=4000 node src/index.js`.

## Quickstart: sample workflow
Use `curl` (or Postman) to walk through the flow:

```bash
# 1) Confirm the server is reachable
curl http://localhost:3000/health

# 2) List seeded customers and technicians
curl http://localhost:3000/api/customers
curl http://localhost:3000/api/technicians

# 3) Create a job for the first customer (replace IDs as needed)
CUSTOMER_ID="<existing-customer-id>"
TECH_ID="<existing-technician-id>"
curl -X POST http://localhost:3000/api/jobs \
  -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"technicianId\":\"$TECH_ID\",\"title\":\"Tune-up\",\"scheduledStart\":\"2025-12-01T15:00:00Z\"}"

# 4) Mark the job complete
JOB_ID="<job-id-from-previous-response>"
curl -X POST http://localhost:3000/api/jobs/$JOB_ID/complete \
  -H 'Content-Type: application/json' \
  -d '{"resolutionNotes":"Completed tune-up and filter replacement"}'

# 5) Generate an invoice for the job
curl -X POST http://localhost:3000/api/jobs/$JOB_ID/invoice
```

## API surface
- `GET /health` – service check
- `GET/POST /api/customers` – manage customers
- `GET/POST /api/technicians` – manage technicians
- `GET/POST /api/quotes` – create and list quotes, approve (`POST /api/quotes/:id/approve`), convert to job (`POST /api/quotes/:id/convert`)
- `GET/POST /api/jobs` – create and list jobs
- `GET /api/jobs/:id` – view a job
- `POST /api/jobs/:id/assign` – assign a technician
- `POST /api/jobs/:id/complete` – close a job with notes
- `POST /api/jobs/:id/invoice` – generate an invoice
- `GET /api/invoices` – list invoices

## Notes
- Data is stored in-memory and resets on restart; no external database is required.
- The server is intentionally minimal to make it easy to extend with authentication, persistence, or richer business rules.
