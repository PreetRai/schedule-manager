import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaBars, FaTimes } from 'react-icons/fa';

function Navigation() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  
  const toggleMenu = () => setIsOpen(!isOpen);
  const menuItems = [
    { role: 'admin', items: [
      { to: '/', text: 'Dashboard' },
      { to: '/calendar', text: 'Scheduler' },
      { to: '/managerlist', text: 'Managers List' },
      { to: '/employees', text: 'Employees List' },
      { to: '/driverlist', text: 'Drivers List' },
      { to: '/stores', text: 'Stores List' },
      { to: '/driver-tips', text:'Driver Tips'},
      { to: '/payroll', text: 'Payroll' },
      { to: '/analytics', text: 'Analytics' },
    ]},
    { role: 'manager', items: [
      { to: '/manager-dashboard', text: 'Scheduler' },
      { to: '/driver-tips', text:'Tips'},
      { to: '/payroll', text: 'Payroll' },
    ]},
    { role: 'employee', items: [
      { to: '/employee-portal', text: 'My Schedule' },
    ]},
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (<>
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center z-50">
      <div className="font-bold text-xl">Schedule Manager</div>
      <button onClick={toggleMenu} className="text-2xl focus:outline-none">
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>
    </nav>

    <div className={`fixed top-0 right-0 h-full w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4">
        <button onClick={toggleMenu} className="text-2xl mb-4 focus:outline-none">
          <FaTimes />
        </button>
        {currentUser ? (
          <>
            <div className="mb-4 font-bold text-xl">{currentUser.name} ({userRole})</div>
            {menuItems.find(item => item.role === userRole)?.items.map((item, index) => (
              <Link key={index} to={item.to} className="block py-2 hover:text-gray-300" onClick={toggleMenu}>
                {item.text}
              </Link>
            ))}
            <button 
              className="mt-4 w-full bg-red-500 hover:bg-red-600 px-4 py-2 rounded" 
              onClick={() => { handleLogout(); toggleMenu(); }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/employee-login" className="block py-2 hover:text-gray-300" onClick={toggleMenu}>
              Employee Account Claim
            </Link>
            <Link to="/login" className="block py-2 hover:text-gray-300" onClick={toggleMenu}>
              Account Login
            </Link>
          </>
        )}
      </div>
    </div>
  </>
);
}

export default Navigation;
