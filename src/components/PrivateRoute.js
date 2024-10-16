import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function PrivateRoute({ component: Component, requiredRole, ...rest }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requiredRole) {
    if (userRole === 'admin') {
      return <Component {...rest} />;
    } else if (userRole === 'employee') {
      return <Navigate to="/employee-portal" />;
    } else if (userRole === 'manager') {
      return <Navigate to="/manager" />;
    } else {
      return <Navigate to="/unauthorized" />;
    }
  }

  // If no specific role is required, allow access
  return <Component {...rest} />;
}

export default PrivateRoute;