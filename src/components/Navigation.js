import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { currentUser, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <ul className="flex justify-between items-center">
        <li><Link to="/" className="hover:text-gray-300">Dashboard</Link></li>
        {role === 'admin' && (
          <li><Link to="/employees" className="hover:text-gray-300">Employees</Link></li>
        )}
        <li><Link to="/calendar" className="hover:text-gray-300">Calendar</Link></li>
        {(role === 'admin' || role === 'manager') && (
          <>
            <li><Link to="/stores" className="hover:text-gray-300">Stores</Link></li>
            <li><Link to="/analytics" className="hover:text-gray-300">Analytics</Link></li>
          </>
        )}
        {currentUser ? (
          <li>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded">
              Logout
            </button>
          </li>
        ) : (
          <li><Link to="/login" className="hover:text-gray-300">Login</Link></li>
        )}
      </ul>
    </nav>
  );
}

export default Navigation;