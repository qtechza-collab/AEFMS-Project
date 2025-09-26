import React from 'react';
import { EnterpriseManagementDashboard } from './EnterpriseManagementDashboard';
import { type User } from '../App';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function AdminDashboard({ user, onLogout, setUser }: AdminDashboardProps) {
  return (
    <EnterpriseManagementDashboard 
      user={user} 
      onLogout={onLogout} 
      setUser={setUser} 
    />
  );
}