import React, { useState, useEffect } from 'react';
import VmLogin from './VmLogin';
import VmDashboard from './VmDashboard';
import VmForm from './VmForm';
import VmAdmin from './VmAdmin';
import VmAdminEdit from './VmAdminEdit';

type PageState = 'login' | 'dashboard' | 'form' | 'admin' | 'edit';

export default function VmChecklist() {
  const [pageState, setPageState] = useState<PageState>('login');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  // Form selections parameters
  const [formType, setFormType] = useState<'overall' | 'floor'>('overall');
  const [floorName, setFloorName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedName = localStorage.getItem('vm_user_name');
    const storedRole = localStorage.getItem('vm_user_role');
    if (storedName && storedRole) {
      setUserName(storedName);
      setUserRole(storedRole);
      setPageState('dashboard');
    }
  }, []);

  const handleLoginSuccess = (name: string, role: string) => {
    setUserName(name);
    setUserRole(role);
    setPageState('dashboard');
  };

  const handleNavigateToForm = (type: 'overall' | 'floor', floor?: string) => {
    setFormType(type);
    setFloorName(floor);
    setPageState('form');
  };

  const handleLogout = () => {
    localStorage.removeItem('vm_user_name');
    localStorage.removeItem('vm_user_role');
    setUserName('');
    setUserRole('');
    setPageState('login');
  };

  switch (pageState) {
    case 'login':
      return <VmLogin onLoginSuccess={handleLoginSuccess} />;
    case 'dashboard':
      return (
        <VmDashboard
          userName={userName}
          userRole={userRole}
          onNavigateToForm={handleNavigateToForm}
          onNavigateToAdmin={() => setPageState('admin')}
          onLogout={handleLogout}
        />
      );
    case 'form':
      return (
        <VmForm
          type={formType}
          floor={floorName}
          userName={userName}
          onBack={() => setPageState('dashboard')}
        />
      );
    case 'admin':
      return (
        <VmAdmin
          onNavigateToEdit={() => setPageState('edit')}
          onBack={() => setPageState('dashboard')}
        />
      );
    case 'edit':
      return (
        <VmAdminEdit
          onBack={() => setPageState('admin')}
        />
      );
    default:
      return <VmLogin onLoginSuccess={handleLoginSuccess} />;
  }
}
