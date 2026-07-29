import React, { useState, useEffect } from 'react';
import CashLogin from './CashLogin';
import CashForm from './CashForm';

export default function CashSettlement() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const activeToken = localStorage.getItem('cash_settlement_token');
    if (activeToken) {
      setToken(activeToken);
    }
  }, []);

  const handleAuthenticated = (authToken: string) => {
    setToken(authToken);
  };

  if (!token) {
    return <CashLogin onAuthenticated={handleAuthenticated} />;
  }

  return <CashForm />;
}
