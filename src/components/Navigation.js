import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const {  logout } = useAuth();
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
          <li><Link to="/employees" className="hover:text-gray-300">Employees</Link></li>
        <li><Link to="/calendar" className="hover:text-gray-300">Calendar</Link></li>
    
          <>
            <li><Link to="/stores" className="hover:text-gray-300">Stores</Link></li>
            <li><Link to="/analytics" className="hover:text-gray-300">Analytics</Link></li>
          </>
   
      
          <li>
            <button  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"onClick={handleLogout}>
              Logout
            </button>
          </li>
      </ul>
    </nav>
  );
}

export default Navigation;