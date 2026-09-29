// Synthetic data only. No real customer/payment information is used.
const MERCHANTS = [
  ['MRC-001', 'Lagos Fresh Mart', 'Lagos'],
  ['MRC-002', 'Greenline Pharmacy', 'Abuja'],
  ['MRC-003', 'Northstar Electronics', 'Kano'],
  ['MRC-004', 'Urban Eats NG', 'Lagos'],
  ['MRC-005', 'Apex Learning Hub', 'Ibadan'],
  ['MRC-006', 'SwiftRide Mobility', 'Port Harcourt'],
  ['MRC-007', 'Harbor Fashion', 'Lagos'],
  ['MRC-008', 'Cedar Home Stores', 'Enugu'],
  ['MRC-009', 'Sunrise Travels', 'Abuja'],
  ['MRC-010', 'PrimeCare Clinic', 'Benin City']
];

const CHANNELS = ['POS', 'WEB', 'TRANSFER', 'API'];
const STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'];
const BASE_DATE = new Date('2026-09-29T10:00:00');

function pseudoRandom(seed) {
  const x = Math.sin(seed * 999.91) * 10000;
  return x - Math.floor(x);
}

function money(n) {
  return Math.round(n * 100) / 100;
}

function formatDate(d) {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

const transactions = [];
const exceptionTemplates = [
  ['AMOUNT_MISMATCH', 'Processor amount differs from internal ledger', 'HIGH'],
  ['MISSING_PROCESSOR', 'Internal ledger record has no processor match', 'HIGH'],
  ['DUPLICATE_REFERENCE', 'Repeated transaction reference detected', 'MEDIUM'],
  ['FEE_MISMATCH', 'Processor fee differs from expected fee rule', 'MEDIUM'],
  ['PENDING_SLA', 'Payment remained pending beyond operational SLA', 'LOW'],
  ['REFUND_MISMATCH', 'Refund status/value does not match internal record', 'HIGH']
];

for (let i = 1; i <= 420; i++) {
  const r = pseudoRandom(i);
  const merchant = MERCHANTS[i % MERCHANTS.length];
  const daysAgo = Math.floor(pseudoRandom(i + 22) * 7);
  const hoursAgo = Math.floor(pseudoRandom(i + 81) * 22);
  const minsAgo = Math.floor(pseudoRandom(i + 141) * 60);
  const created = new Date(BASE_DATE.getTime() - ((daysAgo * 24 + hoursAgo) * 60 + minsAgo) * 60000);
  const amount = money(2500 + pseudoRandom(i + 10) * 245000);
  const channel = CHANNELS[Math.floor(pseudoRandom(i + 30) * CHANNELS.length)];
  const status = STATUSES[Math.floor(pseudoRandom(i + 50) * STATUSES.length)];
  const fee = money(amount * (channel === 'TRANSFER' ? 0.006 : channel === 'POS' ? 0.012 : 0.015));
  const txnId = `TXN-${String(i).padStart(6, '0')}`;

  let recon = status === 'PENDING' ? 'PENDING' : 'MATCHED';
  let exception = null;
  const injected = i % 53 === 0 || i % 71 === 0 || i % 89 === 0 || i % 107 === 0 || i % 131 === 0;
  if (injected) {
    const tpl = exceptionTemplates[i % exceptionTemplates.length];
    exception = tpl[0];
    recon = 'EXCEPTION';
  }

  transactions.push({
    id: txnId,
    reference: `MIR-${2026000 + i}`,
    merchantId: merchant[0], merchant: merchant[1], city: merchant[2],
    amount, currency: 'NGN', fee,
    channel, status, recon,
    created: formatDate(created),
    processor: channel === 'POS' ? 'Processor-A' : channel === 'TRANSFER' ? 'Processor-B' : 'Processor-C',
    customerType: r > .65 ? 'Retail' : 'Business',
    exception,
    owner: exception ? ['Ops Queue', 'Reconciliation', 'Payments Ops'][i % 3] : '—',
    processorAmount: exception === 'AMOUNT_MISMATCH' ? money(amount + 750) : amount,
    ledgerAmount: amount,
    expectedFee: fee,
    processorFee: exception === 'FEE_MISMATCH' ? money(fee + 120) : fee,
    notes: exception ? exceptionTemplates[i % exceptionTemplates.length][1] : 'No reconciliation issue detected.'
  });
}

const auditLog = [
  { time: '2026-09-29 09:52', user: 'ops.bot', event: 'Daily reconciliation batch completed', result: '423 records evaluated', type: 'system' },
  { time: '2026-09-29 09:38', user: 'a.ade', event: 'Exception TXN-000356 assigned to Reconciliation', result: 'AMOUNT_MISMATCH', type: 'assignment' },
  { time: '2026-09-29 09:21', user: 'ops.bot', event: 'Duplicate transaction references scanned', result: '3 flagged', type: 'system' },
  { time: '2026-09-29 08:47', user: 'm.okoh', event: 'SOP: payment-exception-handling updated', result: 'v1.4 published', type: 'change' },
  { time: '2026-09-28 17:14', user: 'ops.bot', event: 'Settlement file imported', result: '1,120 rows', type: 'system' },
  { time: '2026-09-28 16:55', user: 'r.obi', event: 'TXN-000214 marked resolved', result: 'FEE_MISMATCH', type: 'resolution' },
  { time: '2026-09-28 15:10', user: 'ops.bot', event: 'Pending SLA monitor executed', result: '5 alerts created', type: 'system' },
  { time: '2026-09-28 13:32', user: 'j.bello', event: 'Refund mismatch escalated', result: 'HIGH severity', type: 'escalation' },
  { time: '2026-09-28 11:19', user: 'ops.bot', event: 'Merchant transaction report generated', result: '10 merchants', type: 'report' },
  { time: '2026-09-27 18:40', user: 'm.okoh', event: 'Reconciliation matching rule validated', result: 'ID + currency + amount', type: 'control' }
];
