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
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
      
          <Route path="/analytics" element={
                <AnalyticsDashboard />
                
            } />
            <Route path="/login" element={<Login />} />
            
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={
                <Dashboard />
            } />
            <Route path="/employees" element={
                <EmployeeList />
            } />
        
            <Route path="/stores" element={
                <StoreManager />
            } />
            <Route path="/calendar" element={
                <CalendarView />
            } />
          </Routes>
        </div>
      </Router>
      </AuthProvider>
  );
}

export default App;