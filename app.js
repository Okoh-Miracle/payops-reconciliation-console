const els = id => document.getElementById(id);
const nf = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
const ngn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

function pct(a, b) { return b ? `${((a / b) * 100).toFixed(1)}%` : '0.0%'; }
function badge(text) {
  const cls = ['SUCCESS','MATCHED','RESOLVED'].includes(text) ? 'success' : ['FAILED','EXCEPTION','HIGH'].includes(text) ? 'danger' : ['PENDING','MEDIUM','LOW'].includes(text) ? 'warn' : 'neutral';
  return `<span class="badge ${cls}">${text}</span>`;
}

function exceptionRecords() { return transactions.filter(t => t.recon === 'EXCEPTION'); }

function renderOverview() {
  const total = transactions.length;
  const gross = transactions.reduce((s,t) => s + t.amount, 0);
  const success = transactions.filter(t => t.status === 'SUCCESS').length;
  const open = exceptionRecords().length;
  const matched = transactions.filter(t => t.recon === 'MATCHED').length;
  const pending = transactions.filter(t => t.status === 'PENDING').length;
  els('kpis').innerHTML = [
    ['Transactions', nf.format(total), 'Synthetic records'],
    ['Gross volume', ngn.format(gross), 'Across all channels'],
    ['Success rate', pct(success, total), `${success} successful`],
    ['Open exceptions', nf.format(open), `${pct(open,total)} of records`],
    ['Reconciled', pct(matched, total - pending), `${matched} matched`]
  ].map(x => `<div class="kpi"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${x[1]}</div><div class="kpi-meta">${x[2]}</div></div>`).join('');

  const byDay = Array.from({length:7}, (_, idx) => {
    const day = new Date(BASE_DATE); day.setDate(day.getDate() - (6-idx));
    const key = day.toISOString().slice(0,10);
    const count = transactions.filter(t => t.created.startsWith(key)).length;
    return { label: day.toLocaleDateString('en-NG',{weekday:'short'}), count };
  });
  const max = Math.max(...byDay.map(x=>x.count), 1);
  els('volumeChart').innerHTML = byDay.map(x => `<div class="bar-col"><span class="bar-value">${x.count}</span><div class="bar" style="height:${Math.max(6, x.count/max*145)}px"></div><span class="bar-label">${x.label}</span></div>`).join('');

  const counts = {};
  exceptionRecords().forEach(t => counts[t.exception] = (counts[t.exception] || 0) + 1);
  const mix = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const maxEx = Math.max(...mix.map(x=>x[1]), 1);
  els('exceptionMix').innerHTML = mix.map(([k,v]) => `<div class="mix-row"><div>${k.replaceAll('_',' ')}</div><div class="mix-track"><div class="mix-fill" style="width:${v/maxEx*100}%"></div></div><strong>${v}</strong></div>`).join('');

  els('openExceptions').innerHTML = exceptionRecords().slice(0,5).map(t => `<div class="compact-item"><div><div class="compact-title">${t.id} · ${t.merchant}</div><div class="compact-sub">${t.exception.replaceAll('_',' ')} · ${ngn.format(t.amount)}</div></div>${badge(t.exception === 'AMOUNT_MISMATCH' || t.exception === 'REFUND_MISMATCH' || t.exception === 'MISSING_PROCESSOR' ? 'HIGH' : 'MEDIUM')}</div>`).join('');
  els('recentAudit').innerHTML = auditLog.slice(0,5).map(a => `<div class="compact-item"><div><div class="compact-title">${a.event}</div><div class="compact-sub">${a.time} · ${a.user}</div></div>${badge(a.type.toUpperCase())}</div>`).join('');
}

function renderTransactions() {
  const search = (els('txnSearch').value || '').toLowerCase();
  const status = els('statusFilter').value;
  const channel = els('channelFilter').value;
  const recon = els('reconFilter').value;
  const rows = transactions.filter(t => {
    const matchSearch = !search || [t.id,t.reference,t.merchant].some(v => v.toLowerCase().includes(search));
    return matchSearch && (status==='all'||t.status===status) && (channel==='all'||t.channel===channel) && (recon==='all'||t.recon===recon);
  }).slice(0, 120);
  els('txnTable').innerHTML = rows.map(t => `<tr>
    <td><button class="txn-link" data-id="${t.id}">${t.id}</button><div class="muted">${t.reference}</div></td>
    <td>${t.merchant}<div class="muted">${t.city}</div></td>
    <td>${ngn.format(t.amount)}</td>
    <td>${t.channel}</td>
    <td>${badge(t.status)}</td>
    <td>${badge(t.recon)}</td>
    <td>${t.created}</td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#667085;padding:30px">No records match the current filters.</td></tr>`;
  document.querySelectorAll('.txn-link').forEach(btn => btn.addEventListener('click', () => openDetail(btn.dataset.id)));
}

function renderExceptions() {
  const ex = exceptionRecords();
  const counts = { HIGH:0, MEDIUM:0, LOW:0 };
  ex.forEach(t => {
    const high = ['AMOUNT_MISMATCH','MISSING_PROCESSOR','REFUND_MISMATCH'].includes(t.exception) ? 'HIGH' : t.exception === 'PENDING_SLA' ? 'LOW' : 'MEDIUM';
    counts[high]++;
  });
  els('exceptionSummary').innerHTML = Object.entries(counts).map(([k,v]) => badge(`${k} ${v}`)).join('');
  els('exceptionTable').innerHTML = ex.map((t,i)=>{
    const severity = ['AMOUNT_MISMATCH','MISSING_PROCESSOR','REFUND_MISMATCH'].includes(t.exception) ? 'HIGH' : t.exception === 'PENDING_SLA' ? 'LOW' : 'MEDIUM';
    const age = Math.max(1, Math.round((new Date(BASE_DATE)-new Date(t.created))/(1000*60*60)));
    return `<tr><td>EX-${String(i+1).padStart(4,'0')}</td><td><button class="txn-link" data-id="${t.id}">${t.id}</button></td><td>${t.exception.replaceAll('_',' ')}</td><td>${badge(severity)}</td><td>${age}h</td><td>${t.owner}</td><td><button class="text-btn resolve-btn" data-id="${t.id}">Mark resolved</button></td></tr>`;
  }).join('');
  document.querySelectorAll('#exceptionTable .txn-link').forEach(btn => btn.addEventListener('click', () => openDetail(btn.dataset.id)));
  document.querySelectorAll('.resolve-btn').forEach(btn => btn.addEventListener('click', () => resolveException(btn.dataset.id)));
}

function renderReconciliation() {
  const active = transactions.filter(t=>t.status !== 'PENDING');
  const matched = active.filter(t=>t.recon === 'MATCHED').length;
  const ex = active.filter(t=>t.recon === 'EXCEPTION').length;
  const pending = transactions.filter(t=>t.status === 'PENDING').length;
  const gross = transactions.reduce((s,t)=>s+t.amount,0);
  els('reconKpis').innerHTML = [
    ['Records in scope', nf.format(active.length), 'Exclude pending lifecycle records'],
    ['Matched', pct(matched, active.length), `${matched} records`],
    ['Exceptions', pct(ex, active.length), `${ex} records require review`],
    ['Pending', nf.format(pending), 'Awaiting final status']
  ].map(x=>`<div class="kpi"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${x[1]}</div><div class="kpi-meta">${x[2]}</div></div>`).join('');

  const amountMismatch = transactions.filter(t=>t.exception==='AMOUNT_MISMATCH').length;
  const missing = transactions.filter(t=>t.exception==='MISSING_PROCESSOR').length;
  const fee = transactions.filter(t=>t.exception==='FEE_MISMATCH').length;
  const refund = transactions.filter(t=>t.exception==='REFUND_MISMATCH').length;
  els('reconBreakdown').innerHTML = [
    ['Matching rule', 'ID + Currency + Amount', 'Primary record-level match'],
    ['Amount mismatches', amountMismatch, 'Processor vs internal ledger'],
    ['Missing processor records', missing, 'Internal record without external match'],
    ['Fee exceptions', fee, 'Expected vs processor fee'],
    ['Refund exceptions', refund, 'Refund status/value mismatch'],
    ['Gross volume', ngn.format(gross), 'Synthetic transaction value']
  ].map(x=>`<div class="recon-card"><span>${x[0]}</span><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('');
}

function renderAudit() {
  els('auditList').innerHTML = auditLog.map(a=>`<div class="audit-row"><div class="audit-time">${a.time}</div><div class="audit-user">${a.user}</div><div class="audit-event">${a.event}</div>${badge(a.type.toUpperCase())}</div>`).join('');
}

function openDetail(id) {
  const t = transactions.find(x=>x.id===id); if (!t) return;
  els('dialogContent').innerHTML = `<div class="eyebrow">TRANSACTION DETAIL</div><h2>${t.id}</h2><p class="muted">${t.reference} · ${t.merchant}</p>
    <div class="detail-grid">
      ${[['Amount',ngn.format(t.amount)],['Channel',t.channel],['Status',t.status],['Reconciliation',t.recon],['Processor',t.processor],['Created',t.created],['Processor amount',ngn.format(t.processorAmount)],['Ledger amount',ngn.format(t.ledgerAmount)],['Expected fee',ngn.format(t.expectedFee)],['Processor fee',ngn.format(t.processorFee)],['Customer type',t.customerType],['Exception',t.exception ? t.exception.replaceAll('_',' ') : 'None']].map(x=>`<div class="detail-cell"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}
    </div><div style="margin-top:14px;padding:12px;background:#f8fafc;border-radius:9px"><div class="eyebrow">OPERATIONS NOTE</div><div style="font-size:11px;margin-top:5px">${t.notes}</div></div>`;
  els('detailDialog').showModal();
}

function resolveException(id) {
  const t = transactions.find(x=>x.id===id); if (!t) return;
  t.recon = 'MATCHED'; t.exception = null; t.owner = '—';
  auditLog.unshift({ time: new Date().toISOString().slice(0,16).replace('T',' '), user: 'm.okoh', event: `${id} marked resolved`, result: 'Exception cleared', type: 'resolution' });
  renderOverview(); renderExceptions(); renderReconciliation(); renderAudit(); showToast(`${id} marked resolved`);
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  els(view).classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  const titles = {
    overview:['Payment Operations Overview','Monitor payment health, operational exceptions and reconciliation status.'],
    transactions:['Transaction Records','Inspect payment lifecycle status and reconciliation outcomes.'],
    exceptions:['Exception Queue','Prioritize and resolve transaction-level operational exceptions.'],
    reconciliation:['Reconciliation Control','Compare processor records with the internal transaction ledger.'],
    audit:['Audit Log','Review system actions and operational traceability.']
  };
  els('pageTitle').textContent=titles[view][0]; els('pageSubtitle').textContent=titles[view][1];
  if(view==='transactions') renderTransactions();
}

document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.goto)));
['txnSearch','statusFilter','channelFilter','reconFilter'].forEach(id => els(id).addEventListener('input', renderTransactions));
['statusFilter','channelFilter','reconFilter'].forEach(id => els(id).addEventListener('change', renderTransactions));
els('closeDialog').addEventListener('click',()=>els('detailDialog').close());

els('exportBtn').addEventListener('click',()=>{
  const headers=['transaction_id','reference','merchant','amount_ngn','channel','status','reconciliation','exception','created'];
  const rows=transactions.map(t=>[t.id,t.reference,t.merchant,t.amount,t.channel,t.status,t.recon,t.exception||'',t.created]);
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='payops-transactions-synthetic.csv'; a.click(); URL.revokeObjectURL(url); showToast('Synthetic transaction CSV exported');
});

let toastTimer;
function showToast(msg){ clearTimeout(toastTimer); els('toast').textContent=msg; els('toast').classList.add('show'); toastTimer=setTimeout(()=>els('toast').classList.remove('show'),2200); }

renderOverview(); renderTransactions(); renderExceptions(); renderReconciliation(); renderAudit();
