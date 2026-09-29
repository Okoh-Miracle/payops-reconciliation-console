# PayOps Reconciliation Console

**Fintech Systems Lab — synthetic portfolio project by Miracle Okoh**

A browser-based payment operations console that demonstrates how a fintech operations team could monitor transaction health, reconcile processor records against an internal ledger, manage exceptions, and maintain an audit trail.

It demonstrates:

- Transaction lifecycle thinking
- Processor ↔ internal ledger reconciliation
- Exception detection and prioritization
- Data-quality controls
- Operational dashboards and KPI reporting
- Auditability and traceability
- Workflow-oriented problem solving
- Practical use of synthetic financial data

Reconciliation is a core operational control in payment systems: payment records, fees, transfers, balances and exceptions need to be matched and investigated when records disagree. See Stripe's payment reconciliation guidance and Adyen's reconciliation use cases for industry context.

## Important scope note

All transactions, merchants, amounts, identifiers and audit events in this project are **synthetic**. This is not a production payment system and does not process real money or real customer information.

## Core workflow

```text
Payment / Processor Record
          ↓
Transaction Validation
          ↓
Internal Ledger Record
          ↓
Matching Rule
  ID + Currency + Amount
          ↓
 ┌────────┴─────────┐
 ↓                  ↓
MATCHED          EXCEPTION
                   ↓
          Exception Queue
                   ↓
             Review / Resolve
                   ↓
               Audit Log
```

## Exceptions simulated

- Amount mismatch
- Missing processor record
- Duplicate reference
- Fee mismatch
- Pending beyond SLA
- Refund mismatch

## Run locally

No build step is required.

1. Download or clone the project.
2. Open `index.html` in a browser.
3. Use the left navigation to explore Overview, Transactions, Exceptions, Reconciliation and Audit Log.

For a local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Next production-style extension

A future version could add a backend API, PostgreSQL storage, authenticated roles, scheduled reconciliation jobs, webhook ingestion, idempotency keys, configurable fee rules, automated notifications, and a full exception-resolution workflow.
