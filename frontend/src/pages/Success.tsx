import { useNavigate } from 'react-router-dom';

export default function Success() {
  const navigate = useNavigate();

  return (
    <div className="page fade-in">
      <div className="card" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div className="card-body" style={{ padding: '48px 36px' }}>
          <div className="success-icon">✓</div>
          <h2 className="card-title serif" style={{ marginBottom: '10px' }}>Setup Complete!</h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)', marginBottom: '28px', lineHeight: '1.6' }}>
            Your CRM is ready. Sign in with the Super Admin account you just created.
          </p>
          <button className="btn btn-teal btn-full" onClick={() => navigate('/login')}>
            Go to Sign In →
          </button>
        </div>
      </div>
    </div>
  );
}
