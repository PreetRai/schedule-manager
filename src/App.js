import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import StoreManager from './components/StoreManager';
import CalendarView from './components/CalendarView';
import Unauthorized from './components/Unauthorized';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Signup from './components/Signup';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import EmployeePortal from './components/EmployeePortal'; // Create this component

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            <Route path="/" element={
              <PrivateRoute component={Dashboard} requiredRole="admin" />
            } />
            <Route path="/employees" element={
              <PrivateRoute component={EmployeeList} requiredRole="admin" />
            } />
            <Route path="/stores" element={
              <PrivateRoute component={StoreManager} requiredRole="admin" />
            } />
            <Route path="/calendar" element={
              <PrivateRoute component={CalendarView} requiredRole="admin" />
            } />
            <Route path="/analytics" element={
              <PrivateRoute component={AnalyticsDashboard} requiredRole="admin" />
            } />
            
            {/* New route for non-admin users */}
            <Route path="/employee-portal" element={
              <PrivateRoute component={EmployeePortal} />
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
export default App;