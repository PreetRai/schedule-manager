import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function RoleRoute({ children, allowedRoles }) {
  const { currentUser, role } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

export default RoleRoute;