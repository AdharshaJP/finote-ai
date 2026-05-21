import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, ShoppingCart, Zap, Utensils, Package,
  Bell, CheckCircle, Circle, Trash2, AlertCircle,
  Calendar, ChevronDown, ChevronUp, Clock,
  X, Loader, Sparkles, AlertTriangle,
  ChevronLeft, ChevronRight, Receipt, Edit3, Save,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { billsAPI } from '../services/api.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  shopping: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  Icon: ShoppingCart,  label: 'Shopping', autoPaid: true  },
  utility:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  Icon: Zap,           label: 'Utility',  autoPaid: false },
  food:     { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  Icon: Utensils,      label: 'Food',     autoPaid: true  },
  other:    { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  Icon: Package,       label: 'Other',    autoPaid: false },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt      = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate  = (d) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
const toISO    = (d) => new Date(d).toISOString().split('T')[0];

const daysUntil = (dl) => Math.ceil((new Date(dl) - Date.now()) / 86400000);

const urgency = (dl) => {
  if (!dl) return null;
  const d = daysUntil(dl);
  if (d < 0)  return { label: 'OVERDUE',      color: '#EF4444', cls: 'urgent' };
  if (d === 0) return { label: 'DUE TODAY',   color: '#EF4444', cls: 'urgent' };
  if (d <= 2)  return { label: `${d}d left`,  color: '#F97316', cls: 'high'   };
  if (d <= 7)  return { label: `${d}d left`,  color: '#F59E0B', cls: 'medium' };
  return { label: fmtDate(dl), color: '#10B981', cls: 'ok' };
};

const getLast12Months = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`,
      label: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    };
  });
};

// ── Browser notifications ─────────────────────────────────────────────────────
async function triggerNotifications(bills) {
  if (!('Notification' in window)) return;
  const dueSoon = bills.filter(b => !b.isPaid && b.deadline && daysUntil(b.deadline) <= 3);
  if (!dueSoon.length) return;

  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission !== 'granted') return;

  const shown = new Set(JSON.parse(sessionStorage.getItem('notifiedBills') || '[]'));
  const newShown = [...shown];
  dueSoon.forEach(b => {
    const key = `${b._id}-${new Date().toDateString()}`;
    if (!shown.has(key)) {
      const u = urgency(b.deadline);
      new Notification(`⚠️ ${b.name}`, { body: `${fmt(b.totalAmount)} · ${u.label}`, tag: key });
      newShown.push(key);
    }
  });
  sessionStorage.setItem('notifiedBills', JSON.stringify(newShown));
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
const DropZone = ({ onFile }) => {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  }, [onFile]);
  return (
    <div
      className={`bill-dropzone ${drag ? 'dragging' : ''}`}
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" hidden
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      <div className="bill-dropzone-icon"><Upload size={36} /></div>
      <p className="bill-dropzone-title">Drop your bill or receipt here</p>
      <p className="bill-dropzone-sub">JPG · PNG · WebP · PDF · max 10 MB</p>
    </div>
  );
};

// ── Deadline calendar picker ──────────────────────────────────────────────────
const DeadlinePicker = ({ value, onChange, autoFocus }) => {
  const u = value ? urgency(value) : null;
  return (
    <div className="bl-deadline-wrap">
      <label className="form-label"><Calendar size={13} /> Payment Deadline</label>
      <div className="bl-deadline-input-row">
        <input
          className="form-input bl-deadline-input"
          type="date"
          value={value}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => onChange(e.target.value)}
          autoFocus={autoFocus}
        />
        {u && (
          <span className={`bl-deadline-badge ${u.cls}`} style={{ color: u.color, borderColor: u.color + '55', background: u.color + '12' }}>
            <Clock size={11} /> {u.label}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Mini calendar widget (for inline deadline editing on cards) ───────────────
const InlineCalendar = ({ value, onSave, onCancel }) => {
  const [val, setVal] = useState(value || '');
  return (
    <div className="bl-inline-cal">
      <div className="bl-inline-cal-header"><Calendar size={13} /> Set deadline</div>
      <input
        type="date"
        className="form-input bl-inline-date"
        value={val}
        min={new Date().toISOString().split('T')[0]}
        onChange={e => setVal(e.target.value)}
        autoFocus
      />
      {/* Mini calendar visual hint */}
      <div className="bl-inline-cal-grid">
        {MONTHS.slice(new Date().getMonth(), new Date().getMonth() + 3).map(m => (
          <span key={m} className="bl-inline-cal-month">{m}</span>
        ))}
      </div>
      <div className="bl-inline-cal-actions">
        <button className="btn btn-primary btn-sm" onClick={() => val && onSave(val)} disabled={!val}>
          <Save size={13} /> Set
        </button>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// ── Items list ────────────────────────────────────────────────────────────────
const ItemsList = ({ bill, expanded, onToggle }) => {
  const items = bill.items || [];
  if (!items.length && !bill.subtotal && !bill.taxes) return null;
  const preview = items.slice(0, 3);
  const rest    = items.length - 3;

  return (
    <div className="bl-items-wrap">
      <button className="bl-items-toggle" onClick={onToggle}>
        <span>{expanded ? 'Hide' : 'Show'} details</span>
        <span className="bl-items-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {!expanded && preview.length > 0 && (
        <div className="bl-items-preview">
          {preview.map((it, i) => (
            <span key={i} className="bl-item-chip">{it.name}</span>
          ))}
          {rest > 0 && <span className="bl-item-chip more">+{rest} more</span>}
        </div>
      )}

      {expanded && (
        <div className="bl-items-table-wrap">
          <table className="bl-items-table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td>{it.quantity > 1 ? `×${it.quantity}` : '—'}</td>
                  <td className="bl-item-amt">{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(bill.subtotal > 0 || bill.taxes > 0 || bill.discount > 0) && (
            <div className="bl-items-summary">
              {bill.subtotal > 0  && <span>Subtotal <b>{fmt(bill.subtotal)}</b></span>}
              {bill.taxes > 0     && <span>Taxes <b>{fmt(bill.taxes)}</b></span>}
              {bill.discount > 0  && <span>Discount <b>-{fmt(bill.discount)}</b></span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Bill card ─────────────────────────────────────────────────────────────────
const BillCard = ({ bill, onTogglePaid, onDelete, onDeadlineSet, onNoteEdit }) => {
  const cfg    = TYPE_CFG[bill.billType] || TYPE_CFG.other;
  const u      = bill.deadline && !bill.isPaid ? urgency(bill.deadline) : null;
  const [expanded, setExpanded]     = useState(false);
  const [calOpen,  setCalOpen]      = useState(false);
  const [editNote, setEditNote]     = useState(false);
  const [noteVal,  setNoteVal]      = useState(bill.note || '');

  const saveNote = () => { onNoteEdit(bill._id, noteVal); setEditNote(false); };

  return (
    <div className={`bl-card2 ${bill.isPaid ? 'paid' : ''} ${u?.cls === 'urgent' ? 'overdue' : ''}`}>
      {/* Type accent bar */}
      <div className="bl-card2-accent" style={{ background: cfg.color }} />

      <div className="bl-card2-body">
        {/* Header row */}
        <div className="bl-card2-header">
          <div className="bl-card2-icon-wrap" style={{ background: cfg.bg }}>
            <cfg.Icon size={18} style={{ color: cfg.color }} />
          </div>
          <div className="bl-card2-title-col">
            <div className="bl-card2-name">{bill.name}</div>
            <div className="bl-card2-meta-row">
              <span className="bl-type-badge" style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
              <span className="bl-card2-date"><Calendar size={10} />{fmtDate(bill.date)}</span>
              {bill.merchant && bill.merchant !== 'Unknown' && (
                <span className="bl-card2-merchant">{bill.merchant}</span>
              )}
              {bill.billingPeriod && (
                <span className="bl-card2-period">{bill.billingPeriod}</span>
              )}
            </div>
          </div>
          <div className="bl-card2-right">
            <div className="bl-card2-total">{fmt(bill.totalAmount)}</div>
            {bill.isPaid ? (
              <span className="bl-paid-badge"><CheckCircle size={11} /> Paid</span>
            ) : u ? (
              <span className={`bl-due-badge ${u.cls}`} style={{ color: u.color, borderColor: u.color + '55', background: u.color + '12' }}>
                <Clock size={11} /> {u.label}
              </span>
            ) : null}
          </div>
        </div>

        {/* Items */}
        <ItemsList bill={bill} expanded={expanded} onToggle={() => setExpanded(v => !v)} />

        {/* Deadline section for unpaid utility/other */}
        {!bill.isPaid && (bill.billType === 'utility' || bill.billType === 'other') && (
          <div className="bl-card2-deadline-row">
            {bill.deadline ? (
              <>
                <Calendar size={12} />
                <span>Due {fmtDate(bill.deadline)}</span>
                <button className="bl-edit-deadline-btn" onClick={() => setCalOpen(v => !v)}>
                  <Edit3 size={11} /> Change
                </button>
              </>
            ) : (
              <button className="bl-set-deadline-btn" onClick={() => setCalOpen(v => !v)}>
                <Calendar size={12} /> Set payment deadline
              </button>
            )}
            {calOpen && (
              <InlineCalendar
                value={bill.deadline ? toISO(bill.deadline) : ''}
                onSave={(d) => { onDeadlineSet(bill._id, d); setCalOpen(false); }}
                onCancel={() => setCalOpen(false)}
              />
            )}
          </div>
        )}

        {/* Note */}
        {editNote ? (
          <div className="bl-note-edit">
            <textarea
              className="form-input bl-note-textarea"
              rows={2} value={noteVal}
              onChange={e => setNoteVal(e.target.value)}
              autoFocus
              placeholder="Add a note…"
            />
            <div style={{ display:'flex', gap:'0.4rem' }}>
              <button className="btn btn-primary btn-sm" onClick={saveNote}><Save size={12} /> Save</button>
              <button className="btn btn-outline btn-sm" onClick={() => setEditNote(false)}>Cancel</button>
            </div>
          </div>
        ) : bill.note ? (
          <div className="bl-card2-note" onClick={() => setEditNote(true)}>
            <span className="bl-note-icon">📝</span> {bill.note}
          </div>
        ) : null}

        {/* Actions */}
        <div className="bl-card2-actions">
          {!cfg.autoPaid && !bill.isPaid && (
            <button className="bl-action-btn pay" onClick={() => onTogglePaid(bill)}>
              <CheckCircle size={12} /> Mark Paid
            </button>
          )}
          {bill.isPaid && !cfg.autoPaid && (
            <button className="bl-action-btn unpay" onClick={() => onTogglePaid(bill)}>
              <Circle size={12} /> Mark Unpaid
            </button>
          )}
          <button className="bl-action-btn note-btn" onClick={() => setEditNote(true)}>
            <Edit3 size={12} /> {bill.note ? 'Edit note' : 'Add note'}
          </button>
          <button className="bl-action-btn delete" onClick={() => onDelete(bill._id)}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Scan modal ────────────────────────────────────────────────────────────────
const ScanModal = ({ onClose, onSaved }) => {
  const [step, setStep]           = useState(0); // 0=upload 1=ocr 2=review
  const [extracted, setExtracted] = useState(null);
  const [parseError, setParseError] = useState('');
  const [scanErr, setScanErr]     = useState('');

  // Editable form fields
  const [name, setName]           = useState('');
  const [billType, setBillType]   = useState('other');
  const [date, setDate]           = useState('');
  const [deadline, setDeadline]   = useState('');
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  const handleFile = async (file) => {
    setScanErr(''); setStep(1);
    try {
      const fd = new FormData(); fd.append('bill', file);
      const res = await billsAPI.scan(fd);
      const { extracted: ext, parseError: pe } = res.data;
      setExtracted(ext);
      setParseError(pe || '');
      setName(ext.merchant && ext.merchant !== 'Unknown' ? ext.merchant : '');
      setBillType(ext.billType || 'other');
      setDate(ext.date || new Date().toISOString().split('T')[0]);
      setStep(2);
    } catch (e) {
      setScanErr(e.response?.data?.error || 'Scan failed. Try a clearer image.');
      setStep(0);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setSaveErr('Give this bill a name.'); return; }
    setSaving(true); setSaveErr('');
    try {
      const needsDeadline = ['utility','other'].includes(billType);
      const res = await billsAPI.create({
        name: name.trim(), billType, date,
        deadline: needsDeadline && deadline ? deadline : null,
        items:         extracted?.items         || [],
        totalAmount:   extracted?.totalAmount   || 0,
        subtotal:      extracted?.subtotal      || 0,
        taxes:         extracted?.taxes         || 0,
        discount:      extracted?.discount      || 0,
        merchant:      extracted?.merchant      || '',
        billingPeriod: extracted?.billingPeriod || '',
        category:      extracted?.category      || 'Other',
        note: note.trim(),
      });
      onSaved(res.data);
      onClose();
    } catch (e) {
      setSaveErr(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const needsDeadline = ['utility','other'].includes(billType);
  const autoPaid      = TYPE_CFG[billType]?.autoPaid;

  return (
    <div className="bl-modal-overlay" onClick={onClose}>
      <div className="bl-modal" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="bl-modal-header">
          <div className="bl-modal-title">
            <Sparkles size={18} /> Scan Bill with AI
          </div>
          {/* Step dots */}
          <div className="bl-modal-steps">
            {['Upload','Processing','Review'].map((s, i) => (
              <span key={s} className={`bl-modal-step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
            ))}
          </div>
          <button className="bl-drawer-close" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="bl-modal-body">

          {/* Step 0: Drop zone */}
          {step === 0 && (
            <>
              <p className="bl-drawer-hint">
                Take a photo of your bill or receipt — AI will extract all items and amounts.
              </p>
              <DropZone onFile={handleFile} />
              {scanErr && <div className="bill-error"><AlertTriangle size={13} /> {scanErr}</div>}
            </>
          )}

          {/* Step 1: Processing */}
          {step === 1 && (
            <div className="bl-modal-processing">
              <div className="bl-processing-ring" />
              <div className="bl-processing-text"><Sparkles size={15} /> Extracting items with AI…</div>
              <p className="bill-processing-sub">OCR + AI parsing in progress</p>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && extracted && (
            <div className="bl-modal-review">
              {parseError && (
                <div className="bill-parse-warning"><AlertTriangle size={13} /> {parseError}</div>
              )}

              {/* Bill type selector */}
              <div className="form-group">
                <label className="form-label">Bill Type</label>
                <div className="bl-type-pills">
                  {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      className={`bl-type-pill ${billType === key ? 'active' : ''}`}
                      style={billType === key ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : {}}
                      onClick={() => setBillType(key)}
                    >
                      <cfg.Icon size={13} /> {cfg.label}
                      {cfg.autoPaid && <span className="bl-auto-paid-tag">auto-paid</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Bill Name <span style={{ color:'#EF4444' }}>*</span></label>
                <input
                  className="form-input" autoFocus
                  placeholder="e.g. BESCOM April Bill, Big Bazaar Grocery"
                  value={name} onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="bl-drawer-row">
                <div className="form-group">
                  <label className="form-label"><Calendar size={13} /> Bill Date</label>
                  <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                {extracted.merchant && extracted.merchant !== 'Unknown' && (
                  <div className="form-group">
                    <label className="form-label">Merchant</label>
                    <input className="form-input" value={extracted.merchant} readOnly style={{ opacity:0.7 }} />
                  </div>
                )}
              </div>

              {/* Extracted items */}
              {extracted.items?.length > 0 && (
                <div className="bl-review-items">
                  <div className="bl-review-items-title">
                    Extracted Items ({extracted.items.length})
                  </div>
                  <div className="bl-review-items-list">
                    {extracted.items.map((it, i) => (
                      <div key={i} className="bl-review-item-row">
                        <span className="bl-review-item-name">{it.name}</span>
                        {it.quantity > 1 && <span className="bl-review-item-qty">×{it.quantity}</span>}
                        <span className="bl-review-item-amt">{fmt(it.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bl-review-totals">
                    {extracted.subtotal  > 0 && <span>Subtotal {fmt(extracted.subtotal)}</span>}
                    {extracted.taxes     > 0 && <span>Tax {fmt(extracted.taxes)}</span>}
                    {extracted.discount  > 0 && <span>Discount -{fmt(extracted.discount)}</span>}
                    <span className="bl-review-total-big">Total {fmt(extracted.totalAmount)}</span>
                  </div>
                </div>
              )}

              {/* Deadline picker (utility/other only) */}
              {needsDeadline && (
                <DeadlinePicker value={deadline} onChange={setDeadline} />
              )}

              {autoPaid && (
                <div className="bl-auto-paid-banner">
                  <CheckCircle size={14} /> This bill will be automatically marked as paid.
                </div>
              )}

              {/* Note */}
              <div className="form-group">
                <label className="form-label">Side Note</label>
                <textarea
                  className="form-input bl-note-textarea"
                  rows={2} placeholder="Optional note…"
                  value={note} onChange={e => setNote(e.target.value)}
                />
              </div>

              {saveErr && <div className="bill-error"><AlertTriangle size={13} /> {saveErr}</div>}

              <div className="bl-drawer-actions">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><Loader size={14} className="spin" /> Saving…</>
                    : <><CheckCircle size={14} /> Save Bill</>}
                </button>
                <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Due soon banner ───────────────────────────────────────────────────────────
const DueSoonBanner = ({ bills }) => {
  const [open, setOpen] = useState(true);
  const critical = bills.filter(b => !b.isPaid && b.deadline && daysUntil(b.deadline) <= 3);
  if (!critical.length || !open) return null;
  return (
    <div className="bl-due-banner">
      <Bell size={15} className="bl-due-bell" />
      <div className="bl-due-banner-content">
        <b>{critical.length} bill{critical.length > 1 ? 's' : ''} need attention</b>
        <span className="bl-due-list">
          {critical.map(b => {
            const u = urgency(b.deadline);
            return (
              <span key={b._id} className="bl-due-chip" style={{ borderColor: u.color, color: u.color }}>
                {b.name} · {u.label}
              </span>
            );
          })}
        </span>
      </div>
      <button className="bl-due-close" onClick={() => setOpen(false)}><X size={13} /></button>
    </div>
  );
};

// ── Month filter ──────────────────────────────────────────────────────────────
const MonthFilter = ({ selected, onChange }) => {
  const scrollRef  = useRef(null);
  const months     = getLast12Months();
  const currentKey = months[0].key;

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  return (
    <div className="bl-month-filter">
      <button className="bl-month-arrow" onClick={() => scroll(-1)}><ChevronLeft size={15} /></button>
      <div className="bl-month-track" ref={scrollRef}>
        <button
          className={`bl-month-chip ${!selected ? 'active' : ''}`}
          onClick={() => onChange(null)}
        >All</button>
        {months.map(m => (
          <button
            key={m.key}
            className={`bl-month-chip ${selected === m.key ? 'active' : ''} ${m.key === currentKey ? 'current' : ''}`}
            onClick={() => onChange(m.key === selected ? null : m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button className="bl-month-arrow" onClick={() => scroll(1)}><ChevronRight size={15} /></button>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const BillsPage = () => {
  const [bills, setBills]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [month, setMonth]       = useState(null);
  const [status, setStatus]     = useState('all');
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (month)  params.month  = month;
      if (status !== 'all') params.status = status;
      const res = await billsAPI.getAll(params);
      setBills(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [month, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (bills.length) triggerNotifications(bills); }, [bills]);

  const handleSaved = (bill) => setBills(prev => [bill, ...prev]);

  const handleTogglePaid = async (bill) => {
    const res = await billsAPI.update(bill._id, { isPaid: !bill.isPaid });
    setBills(prev => prev.map(b => b._id === bill._id ? res.data : b));
  };

  const handleDeadlineSet = async (id, deadline) => {
    const res = await billsAPI.update(id, { deadline });
    setBills(prev => prev.map(b => b._id === id ? res.data : b));
  };

  const handleNoteEdit = async (id, note) => {
    const res = await billsAPI.update(id, { note });
    setBills(prev => prev.map(b => b._id === id ? res.data : b));
  };

  const handleDelete = async (id) => {
    await billsAPI.delete(id);
    setBills(prev => prev.filter(b => b._id !== id));
  };

  // Client-side search (applied on top of server filters)
  const visible = bills.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [b.name, b.merchant, b.category, b.billingPeriod, b.note]
      .some(f => (f || '').toLowerCase().includes(q));
  });

  // Stats
  const total     = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const unpaid    = bills.filter(b => !b.isPaid).reduce((s, b) => s + (b.totalAmount || 0), 0);
  const dueSoonN  = bills.filter(b => !b.isPaid && b.deadline && daysUntil(b.deadline) <= 7).length;

  const STATUS_TABS = [
    { key: 'all',     label: 'All' },
    { key: 'unpaid',  label: 'Unpaid' },
    { key: 'paid',    label: 'Paid' },
    { key: 'duesoon', label: `Due Soon${dueSoonN ? ` (${dueSoonN})` : ''}` },
  ];

  return (
    <Layout>
      <div className="bl-root">

        {/* Header */}
        <div className="bl-header">
          <div className="bl-header-left">
            <div className="bl-header-icon"><Receipt size={26} /></div>
            <div>
              <h1 className="bl-title">My Bills</h1>
              <p className="bl-subtitle">Scan receipts — AI extracts every item automatically.</p>
            </div>
          </div>
          <button className="btn btn-primary bl-add-btn" onClick={() => setScanOpen(true)}>
            <Sparkles size={15} /> Scan Bill
          </button>
        </div>

        {/* Due soon alert */}
        <DueSoonBanner bills={bills} />

        {/* Month filter */}
        <MonthFilter selected={month} onChange={setMonth} />

        {/* Status tabs + search */}
        <div className="bl-controls">
          <div className="bl-filter-tabs">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                className={`bl-filter-tab ${status === t.key ? 'active' : ''}`}
                onClick={() => setStatus(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            className="form-input bl-search"
            placeholder="Search bills…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Summary strip */}
        <div className="bl-summary-strip">
          <div className="bl-summary-tile">
            <div className="bl-summary-label">Bills</div>
            <div className="bl-summary-value">{bills.length}</div>
          </div>
          <div className="bl-summary-tile">
            <div className="bl-summary-label">Total</div>
            <div className="bl-summary-value">{fmt(total)}</div>
          </div>
          <div className="bl-summary-tile danger">
            <div className="bl-summary-label">Unpaid</div>
            <div className="bl-summary-value">{fmt(unpaid)}</div>
          </div>
          <div className={`bl-summary-tile ${dueSoonN > 0 ? 'warning' : ''}`}>
            <div className="bl-summary-label">Due Soon</div>
            <div className="bl-summary-value">{dueSoonN}</div>
          </div>
        </div>

        {/* Bills list */}
        {loading ? (
          <div className="bl-loading"><Loader size={22} className="spin" /> Loading bills…</div>
        ) : visible.length === 0 ? (
          <div className="bl-empty">
            <div className="bl-empty-icon"><Receipt size={44} /></div>
            <div className="bl-empty-title">{bills.length === 0 ? 'No bills yet' : 'No results'}</div>
            <div className="bl-empty-sub">
              {bills.length === 0
                ? 'Click "Scan Bill" to extract your first bill with AI.'
                : 'Try a different filter or search.'}
            </div>
            {bills.length === 0 && (
              <button className="btn btn-primary" onClick={() => setScanOpen(true)}>
                <Sparkles size={14} /> Scan your first bill
              </button>
            )}
          </div>
        ) : (
          <div className="bl-list">
            {visible.map(b => (
              <BillCard
                key={b._id} bill={b}
                onTogglePaid={handleTogglePaid}
                onDelete={handleDelete}
                onDeadlineSet={handleDeadlineSet}
                onNoteEdit={handleNoteEdit}
              />
            ))}
          </div>
        )}
      </div>

      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} onSaved={handleSaved} />}
    </Layout>
  );
};

export default BillsPage;
