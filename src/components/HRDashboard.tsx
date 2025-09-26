import React from 'react';
import { EnterpriseManagementDashboard } from './EnterpriseManagementDashboard';
import { type User } from '../App';

interface HRDashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function HRDashboard({ user, onLogout, setUser }: HRDashboardProps) {
  return (
    <EnterpriseManagementDashboard 
      user={user} 
      onLogout={onLogout} 
      setUser={setUser} 
    />
  );
}