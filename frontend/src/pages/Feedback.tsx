import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Question {
  id: number;
  qId: string;
  qText: string;
  options: string[] | any;
  isMandatory: boolean;
}

export default function Feedback() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [area, setArea] = useState<string>('Ground Floor');
  const [yourVoice, setYourVoice] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custMobile, setCustMobile] = useState<string>('');
  const [custDob, setCustDob] = useState<string>('');

  const [answers, setAnswers] = useState<{ [key: string]: { val: string; other: string } }>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // ── Math Captcha ─────────────────────────────────────────
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, answer: a + b };
  };
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState<string>('');

  const formatDateStr = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api.get('/api/crm/questions');
        if (res.data && res.data.ok) {
          const list = res.data.questions || [];
          setQuestions(list);

          // Initialize answer states
          const initialAnswers: any = {};
          list.forEach((q: Question) => {
            initialAnswers[q.qId.toLowerCase()] = { val: '', other: '' };
          });
          setAnswers(initialAnswers);
        }
      } catch (err) {
        console.error('Failed to load feedback questions', err);
      }
    };
    fetchQuestions();
  }, []);

  const handleSelectOption = (qId: string, optionVal: string) => {
    setAnswers({
      ...answers,
      [qId]: { ...answers[qId], val: optionVal }
    });
  };

  const handleOtherTextChange = (qId: string, otherText: string) => {
    setAnswers({
      ...answers,
      [qId]: { ...answers[qId], other: otherText }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check mandatory validators
    let missingMandatory = false;
    questions.forEach(q => {
      if (q.isMandatory) {
        const key = q.qId.toLowerCase();
        if (!answers[key]?.val) {
          missingMandatory = true;
        }
      }
    });

    if (missingMandatory) {
      setError('Please answer all mandatory questions.');
      return;
    }

    // Validate math captcha
    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setError(`Incorrect answer to the security check. Please try again.`);
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        date: formatDateStr(new Date()),
        source: 'staff',
        area,
        yourVoice,
        custName,
        custMobile,
        custDob,
        answers
      };

      const res = await api.post('/api/crm/feedback', payload);
      if (res.data && res.data.ok) {
        setSuccess('Feedback recorded successfully!');
        setYourVoice('');
        setCustName('');
        setCustMobile('');
        setCustDob('');
        setCaptchaInput('');
        setCaptcha(generateCaptcha());

        // Reset answer fields
        const resetAnswers = { ...answers };
        Object.keys(resetAnswers).forEach(k => {
          resetAnswers[k] = { val: '', other: '' };
        });
        setAnswers(resetAnswers);
      } else {
        setError(res.data.error || 'Failed to submit feedback');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card fade-in" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="serif" style={{ fontSize: '28px' }}>Customer Feedback</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Record guest reviews and CSI ratings</p>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '24px', border: '1.5px solid var(--border)' }}>
        {/* Shopping Location/Zone */}
        <div className="field">
          <label>Shopping Area / Floor</label>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="Ground Floor">Ground Floor</option>
            <option value="1st Floor">1st Floor</option>
            <option value="2nd Floor">2nd Floor</option>
            <option value="3rd Floor">3rd Floor</option>
            <option value="4th Floor">4th Floor</option>
          </select>
        </div>

        {/* Dynamic Questions */}
        {questions.map((q) => {
          const key = q.qId.toLowerCase();
          const currentAns = answers[key]?.val || '';
          const optionsArray = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');

          return (
            <div key={q.id} style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-l)', paddingBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
                {q.qText} {q.isMandatory && <span className="req">*</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {optionsArray.map((opt: string) => {
                  const selected = currentAns === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(key, opt)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1.5px solid var(--border)',
                        background: selected ? 'var(--navy)' : 'var(--white)',
                        color: selected ? '#fff' : 'var(--ink-60)',
                        transition: 'all 0.15s'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Remarks/Others field */}
              {currentAns && currentAns.toLowerCase().includes('others') && (
                <div className="field" style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '10px' }}>Please specify details</label>
                  <input
                    type="text"
                    placeholder="Enter details here..."
                    value={answers[key]?.other || ''}
                    onChange={(e) => handleOtherTextChange(key, e.target.value)}
                    style={{ padding: '8px 12px' }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* General comments */}
        <div className="field">
          <label>General Voice / Reviews Notes</label>
          <textarea
            placeholder="Type any guest review comments here..."
            value={yourVoice}
            onChange={(e) => setYourVoice(e.target.value)}
          />
        </div>

        {/* Customer details fields */}
        <h4 className="serif" style={{ fontSize: '16px', margin: '20px 0 10px', borderTop: '1.5px solid var(--border)', paddingTop: '16px' }}>
          Customer Information (Optional)
        </h4>

        <div className="field-row">
          <div className="field">
            <label>Customer Name</label>
            <input
              type="text"
              placeholder="Enter name"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Mobile Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={custMobile}
              onChange={(e) => setCustMobile(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Birth Date</label>
          <input
            type="date"
            value={custDob}
            onChange={(e) => setCustDob(e.target.value)}
          />
        </div>

        {/* ── Math Captcha ─────────────── */}
        <div style={{
          background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: '10px', padding: '16px 18px', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🔐 Security Check
          </div>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#1a2744', display: 'block', marginBottom: '10px' }}>
            What is {captcha.a} + {captcha.b}?
          </label>
          <input
            type="number"
            placeholder="Enter the answer"
            value={captchaInput}
            onChange={e => setCaptchaInput(e.target.value)}
            style={{
              width: '140px', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #d4c9b5', fontSize: '16px', fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700, color: '#1a2744', background: '#FFFFFF'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-teal btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {submitting && <span className="spinner"></span>}
          {submitting ? 'Submitting...' : '💾 Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
