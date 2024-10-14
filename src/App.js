import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import RoleRoute from './components/RoleRoute';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import StoreManager from './components/StoreManager';
import CalendarView from './components/CalendarView';
import Unauthorized from './components/Unauthorized';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Signup from './components/Signup';
import AdminPanel from './components/AdminPanel';
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
          <Route path="/admin" element={
              <RoleRoute allowedRoles={['admin']}>
                <AdminPanel />
              </RoleRoute>
            } />
          <Route path="/analytics" element={
              <RoleRoute allowedRoles={['admin', 'manager']}>
                <AnalyticsDashboard />
                
              </RoleRoute>
            } />
            <Route path="/login" element={<Login />} />
            
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={
              <RoleRoute allowedRoles={['admin', 'manager', 'employee']}>
                <Dashboard />
              </RoleRoute>
            } />
            <Route path="/employees" element={
              <RoleRoute allowedRoles={['admin']}>
                <EmployeeList />
              </RoleRoute>
            } />
        
            <Route path="/stores" element={
              <RoleRoute allowedRoles={['admin', 'manager']}>
                <StoreManager />
              </RoleRoute>
            } />
            <Route path="/calendar" element={
              <RoleRoute allowedRoles={['admin', 'manager', 'employee']}>
                <CalendarView />
              </RoleRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;