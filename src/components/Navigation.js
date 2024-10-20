import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { currentUser, userRole, logout } = useAuth();
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
      <ul className="flex justify-between items-center ">
        <ul className="flex justify-start items-center gap-5">
        <li className="font-bold text-xl">Schedule Manager</li>
        
        {currentUser && (
          
          <><>|</>
            <li className="font-bold text-xl">{currentUser.name} ({userRole})</li>
          </>
        )}</ul>
        <ul className="flex justify-end items-center gap-5">
          {!currentUser ? (
            <>
              <li><Link to="/employee-login" className="hover:text-gray-300">Employee Account Claim</Link></li>
              <li><Link to="/login" className="hover:text-gray-300">Account Login</Link></li>
            </>
          ) : (
            <>
              {userRole === 'admin' && (
                <>
                  <li><Link to="/" className="hover:text-gray-300">Admin Dashboard</Link></li>
                  <li><Link to="/calendar" className="hover:text-gray-300">Scheduler</Link></li>
                  <li><Link to="/managerlist" className="hover:text-gray-300">Managers</Link></li>
                  <li><Link to="/employees" className="hover:text-gray-300">Employees</Link></li>
                  <li><Link to="/driverlist" className="hover:text-gray-300">Drivers</Link></li>
                  <li><Link to="/stores" className="hover:text-gray-300">Stores</Link></li>
                  <li><Link to="/analytics" className="hover:text-gray-300">Analytics</Link></li>
                </>
              )}
              {userRole === 'manager' && (
                <li><Link to="/manager" className="hover:text-gray-300">Scheduler</Link></li>
              )}
              {userRole === 'employee'  && (
                <li><Link to="/employee-portal" className="hover:text-gray-300">My Schedule</Link></li>
              )}
               
              <li>
                <button className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </ul>
    </nav>
  );
}

export default Navigation;