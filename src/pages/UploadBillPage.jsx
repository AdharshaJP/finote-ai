import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle, AlertTriangle, Loader,
  RotateCcw, Save, Receipt, Sparkles, Eye, Edit3,
  Calendar, Tag, DollarSign, Store, Users, UserPlus, Trash2,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { aiAPI, transactionsAPI } from '../services/api.js';

const CATEGORIES = [
  'Food', 'Transportation', 'Entertainment', 'Shopping',
  'Bills', 'Healthcare', 'Education', 'Travel', 'Investment', 'Other',
];

const STEP_LABELS = ['Upload', 'Extracting Text', 'Parsing with AI', 'Review & Save'];

// ── Step indicator ────────────────────────────────────────────────────────────
const Steps = ({ current }) => (
  <div className="bill-steps">
    {STEP_LABELS.map((label, i) => (
      <div key={label} className={`bill-step ${i < current ? 'done' : i === current ? 'active' : ''}`}>
        <div className="bill-step-circle">
          {i < current ? <CheckCircle size={14} /> : <span>{i + 1}</span>}
        </div>
        <span className="bill-step-label">{label}</span>
        {i < STEP_LABELS.length - 1 && <div className="bill-step-line" />}
      </div>
    ))}
  </div>
);

// ── Drop zone ─────────────────────────────────────────────────────────────────
const DropZone = ({ onFile, disabled }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div
      className={`bill-dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        disabled={disabled}
      />
      <div className="bill-dropzone-icon">
        <Upload size={36} />
      </div>
      <p className="bill-dropzone-title">Drag & drop your bill here</p>
      <p className="bill-dropzone-sub">or click to browse · JPG, PNG, WebP, PDF · max 10 MB</p>
    </div>
  );
};

// ── File preview chip ─────────────────────────────────────────────────────────
const FileChip = ({ file, onRemove }) => (
  <div className="bill-file-chip">
    <FileText size={16} />
    <span className="bill-file-name">{file.name}</span>
    <span className="bill-file-size">({(file.size / 1024).toFixed(0)} KB)</span>
    <button className="bill-file-remove" onClick={onRemove} title="Remove">×</button>
  </div>
);

// ── Bill Split UI ─────────────────────────────────────────────────────────────
const BillSplitter = ({ totalAmount, onSplitSave, saving }) => {
  const [enabled, setEnabled]       = useState(false);
  const [mode, setMode]             = useState('equal');   // 'equal' | 'unequal'
  const [people, setPeople]         = useState(2);
  const [members, setMembers]       = useState([
    { name: 'You', amount: '' },
    { name: '', amount: '' },
  ]);
  const [splitError, setSplitError] = useState('');

  const total = Number(totalAmount) || 0;

  // Keep members array in sync with people count
  const handlePeopleChange = (n) => {
    const count = Math.max(2, Math.min(20, n));
    setPeople(count);
    setMembers(prev => {
      const next = [...prev];
      while (next.length < count) next.push({ name: '', amount: '' });
      return next.slice(0, count);
    });
  };

  const perPerson = mode === 'equal' && people > 0
    ? (total / people).toFixed(2)
    : null;

  const updateMember = (idx, field, value) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const unequalSum = members.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const unequalValid = Math.abs(unequalSum - total) < 0.02;

  const handleSave = () => {
    setSplitError('');
    if (mode === 'equal') {
      onSplitSave(Number(perPerson));
    } else {
      if (!unequalValid) {
        setSplitError(`Amounts sum to ₹${unequalSum.toFixed(2)}, but total is ₹${total.toFixed(2)}. Adjust to match.`);
        return;
      }
      const myShare = Number(members[0].amount) || 0;
      if (myShare <= 0) {
        setSplitError('Enter your share amount (first row = You).');
        return;
      }
      onSplitSave(myShare);
    }
  };

  return (
    <div className="bill-split-panel">
      {/* Toggle */}
      <button
        className={`bill-split-toggle ${enabled ? 'active' : ''}`}
        onClick={() => setEnabled(v => !v)}
        type="button"
      >
        <Users size={15} />
        {enabled ? 'Cancel Split' : 'Split this bill?'}
      </button>

      {enabled && (
        <div className="bill-split-body">
          {/* Mode selector */}
          <div className="bill-split-mode-row">
            <button
              className={`bill-split-mode-btn ${mode === 'equal' ? 'active' : ''}`}
              onClick={() => setMode('equal')} type="button"
            >Equal split</button>
            <button
              className={`bill-split-mode-btn ${mode === 'unequal' ? 'active' : ''}`}
              onClick={() => setMode('unequal')} type="button"
            >Custom split</button>
          </div>

          {/* People count */}
          <div className="bill-split-count-row">
            <label className="bill-split-label">Number of people</label>
            <div className="bill-split-counter">
              <button type="button" onClick={() => handlePeopleChange(people - 1)} disabled={people <= 2}>−</button>
              <span>{people}</span>
              <button type="button" onClick={() => handlePeopleChange(people + 1)} disabled={people >= 20}>+</button>
            </div>
          </div>

          {/* Equal split result */}
          {mode === 'equal' && (
            <div className="bill-split-result">
              <div className="bill-split-result-label">Each person pays</div>
              <div className="bill-split-result-value">₹{perPerson}</div>
              <div className="bill-split-result-sub">₹{total.toFixed(2)} ÷ {people} people</div>
            </div>
          )}

          {/* Unequal: per-member rows */}
          {mode === 'unequal' && (
            <div className="bill-split-members">
              <div className="bill-split-members-header">
                <span>Name</span><span>Amount (₹)</span>
              </div>
              {members.map((m, i) => (
                <div key={i} className="bill-split-member-row">
                  <input
                    className="form-input bill-split-name-input"
                    placeholder={i === 0 ? 'You' : `Person ${i + 1}`}
                    value={m.name}
                    onChange={e => updateMember(i, 'name', e.target.value)}
                    disabled={i === 0}
                  />
                  <input
                    className="form-input bill-split-amt-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={m.amount}
                    onChange={e => updateMember(i, 'amount', e.target.value)}
                  />
                  {i > 1 ? (
                    <button
                      className="bill-split-remove-member"
                      type="button"
                      onClick={() => {
                        setMembers(prev => prev.filter((_, j) => j !== i));
                        setPeople(p => p - 1);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : <span />}
                </div>
              ))}
              <div className={`bill-split-sum-row ${unequalValid ? 'ok' : 'err'}`}>
                Sum: ₹{unequalSum.toFixed(2)} / ₹{total.toFixed(2)}
                {unequalValid && <CheckCircle size={13} />}
              </div>
              <button
                className="bill-split-add-person"
                type="button"
                onClick={() => handlePeopleChange(people + 1)}
                disabled={people >= 20}
              >
                <UserPlus size={13} /> Add person
              </button>
            </div>
          )}

          {splitError && (
            <div className="bill-error" style={{ marginTop: '0.5rem' }}>
              <AlertTriangle size={13} /> {splitError}
            </div>
          )}

          <button
            className="btn btn-primary bill-split-save-btn"
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><Loader size={14} className="spin" /> Saving my share…</>
              : <><Save size={14} /> Save my share (₹{mode === 'equal' ? perPerson : (Number(members[0]?.amount) || 0).toFixed(2)})</>
            }
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main page component ───────────────────────────────────────────────────────
const UploadBillPage = () => {
  const { user } = useAuth();

  const [file, setFile]           = useState(null);
  const [step, setStep]           = useState(0);   // 0=upload 1=ocr 2=ai 3=review
  const [rawText, setRawText]     = useState('');
  const [parsed, setParsed]       = useState(null);
  const [parseError, setParseError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showRaw, setShowRaw]     = useState(false);

  // Editable form fields (populated from AI parse)
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState('Other');
  const [date, setDate]           = useState('');
  const [merchant, setMerchant]   = useState('');

  // Save state
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState(null);

  const reset = () => {
    setFile(null); setStep(0); setRawText(''); setParsed(null);
    setParseError(null); setUploadError(null); setShowRaw(false);
    setAmount(''); setCategory('Other'); setDate(''); setMerchant('');
    setSaving(false); setSaved(false); setSaveError(null);
  };

  const handleFile = (f) => {
    reset();
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !user?.id) return;
    setUploadError(null);
    setSaved(false);

    try {
      // Step 1 — OCR
      setStep(1);
      const formData = new FormData();
      formData.append('bill', file);

      // Step 2 — AI
      setStep(2);
      const res = await aiAPI.uploadBill(formData);
      const { rawText: rt, parsed: p, parseError: pe } = res.data;

      setRawText(rt || '');
      setParseError(pe || null);

      if (p) {
        setParsed(p);
        setAmount(p.amount != null ? String(p.amount) : '');
        setCategory(p.category || 'Other');
        setDate(p.date || new Date().toISOString().split('T')[0]);
        setMerchant(p.merchant || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }

      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Please try again.';
      setUploadError(msg);
      setStep(0);
    }
  };

  // Save full bill as single transaction
  const handleSave = async () => {
    if (!user?.id || !amount || !category || !date) return;
    setSaving(true);
    setSaveError(null);

    try {
      await aiAPI.confirmBill({
        userId: user.id,
        amount: Number(amount),
        category,
        date,
        merchant: merchant || 'Bill upload',
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  // Save user's split share as a transaction
  const handleSplitSave = async (myShare) => {
    if (!user?.id || !category || !date) return;
    setSaving(true);
    setSaveError(null);

    try {
      await transactionsAPI.create({
        type: 'expense',
        amount: myShare,
        category,
        date,
        note: `Split bill${merchant ? ` — ${merchant}` : ''} (my share)`,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save split transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="bill-root">
        {/* Header */}
        <div className="bill-header">
          <div className="bill-header-icon">
            <Receipt size={28} />
          </div>
          <div>
            <h1 className="bill-title">Upload Bill</h1>
            <p className="bill-subtitle">
              Upload a receipt or bill image — AI extracts the transaction automatically.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <Steps current={step} />

        {/* ── Step 0: File selection ──────────────────────────── */}
        {step === 0 && (
          <div className="card bill-card">
            {!file ? (
              <DropZone onFile={handleFile} />
            ) : (
              <div className="bill-file-selected">
                <DropZone onFile={handleFile} disabled={false} />
                <FileChip file={file} onRemove={reset} />
                <button className="btn btn-primary bill-upload-btn" onClick={handleUpload}>
                  <Sparkles size={16} /> Extract & Parse Bill
                </button>
              </div>
            )}
            {uploadError && (
              <div className="bill-error">
                <AlertTriangle size={16} /> {uploadError}
              </div>
            )}
          </div>
        )}

        {/* ── Step 1 & 2: Processing ──────────────────────────── */}
        {(step === 1 || step === 2) && (
          <div className="card bill-card bill-processing">
            <div className="bill-processing-spinner" />
            <div className="bill-processing-text">
              {step === 1 ? 'Reading text from your bill…' : 'AI is parsing the data…'}
            </div>
            <p className="bill-processing-sub">This usually takes 5–15 seconds</p>
          </div>
        )}

        {/* ── Step 3: Review & Save ───────────────────────────── */}
        {step === 3 && (
          <>
            {/* Parse warning if AI failed */}
            {parseError && (
              <div className="bill-parse-warning">
                <AlertTriangle size={15} />
                <span>{parseError}</span>
              </div>
            )}

            <div className="bill-review-grid">
              {/* Editable form */}
              <div className="card bill-card">
                <div className="bill-section-header">
                  <Edit3 size={16} />
                  <span>Review &amp; Edit Details</span>
                </div>

                <div className="bill-form">
                  <div className="form-group">
                    <label className="form-label">
                      <DollarSign size={14} /> Amount (₹)
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 450"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Tag size={14} /> Category
                    </label>
                    <select
                      className="form-input"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Calendar size={14} /> Date
                    </label>
                    <input
                      className="form-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Store size={14} /> Merchant / Note
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. Zomato, Big Bazaar"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                    />
                  </div>

                  {/* Confidence badge row */}
                  <div className="bill-confidence-row">
                    <span className="bill-tag">expense</span>
                    {!parseError && <span className="bill-tag success">AI extracted</span>}
                    {parseError && <span className="bill-tag warning">manual entry</span>}
                  </div>

                  {saved ? (
                    <div className="bill-saved">
                      <CheckCircle size={18} />
                      Transaction saved to your dashboard!
                      <button className="btn btn-outline bill-another-btn" onClick={reset}>
                        <RotateCcw size={14} /> Upload Another
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Full bill save */}
                      <div className="bill-action-row">
                        <button
                          className="btn btn-primary bill-save-btn"
                          onClick={handleSave}
                          disabled={saving || !amount || !date}
                        >
                          {saving ? (
                            <><Loader size={15} className="spin" /> Saving…</>
                          ) : (
                            <><Save size={15} /> Save Full Bill</>
                          )}
                        </button>
                        <button className="btn btn-outline" onClick={reset}>
                          <RotateCcw size={14} /> Start Over
                        </button>
                      </div>

                      {/* Bill splitter */}
                      {amount && Number(amount) > 0 && (
                        <BillSplitter
                          totalAmount={amount}
                          onSplitSave={handleSplitSave}
                          saving={saving}
                        />
                      )}
                    </>
                  )}

                  {saveError && (
                    <div className="bill-error" style={{ marginTop: '0.75rem' }}>
                      <AlertTriangle size={14} /> {saveError}
                    </div>
                  )}
                </div>
              </div>

              {/* Raw text panel */}
              {rawText && (
                <div className="card bill-card bill-raw-card">
                  <button
                    className="bill-section-header bill-raw-toggle"
                    onClick={() => setShowRaw((v) => !v)}
                  >
                    <Eye size={16} />
                    <span>Extracted Text</span>
                    <span className="bill-raw-toggle-hint">{showRaw ? 'hide' : 'show'}</span>
                  </button>
                  {showRaw && (
                    <pre className="bill-raw-text">{rawText}</pre>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default UploadBillPage;
