import React from 'react';
import { EnterpriseManagementDashboard } from './EnterpriseManagementDashboard';
import { type User } from '../App';

interface EmployerDashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function EmployerDashboard({ user, onLogout, setUser }: EmployerDashboardProps) {
  return (
    <EnterpriseManagementDashboard 
      user={user} 
      onLogout={onLogout} 
      setUser={setUser} 
    />
  );
}