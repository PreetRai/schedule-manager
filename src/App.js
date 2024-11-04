import React from 'react';
import { BrowserRouter as Router, Route, Routes,Navigate  } from 'react-router-dom';
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
import EmployeePortal from './components/EmployeePortal/EmployeePortal'; 
import EmployeeLogin from './components/EmployeePortal/EmployeeLogin';
import { StoreColorProvider } from './contexts/StoreColorContext';
import Manager from './components/Manager Portal/Manager';
import ManagerList from './components/ManagerList';
import DriverList from './components/DriversList';
import PayrollView from './components/PayrollView';
import DriverTipsTracker from './components/DriverTipTracker';
import PlatformManager from './components/Platform Manager';
import DriverPortal from './components/DriverPortal/DriverPortal';
function App() {
  return (
    <AuthProvider>
        <StoreColorProvider>
      <Router>
        <div className="App ">
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup-Preet@310399" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/driver-dashboard" element={<DriverPortal />} />
            <Route path="/employee-dashboard" element={<EmployeePortal />} />
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
             <Route path="/manager-dashboard" element={
          
              <PrivateRoute component={Manager}    />
            } />
             <Route path="/managerlist" element={
              <PrivateRoute component={ManagerList}  />
            } />
            <Route path="/driverlist" element={
              <PrivateRoute component={DriverList}  />
            } />
            <Route path="/driver-tips" element={<DriverTipsTracker />} requiredRole={["manager","admin"]}/>
           <Route
  path="/payroll"
  element={
    <PrivateRoute
      component={PayrollView}
      requiredRoles={["admin", "manager"]}
    />
  }
/>
<Route
  path="/platforms"
  element={
    <PrivateRoute
      component={PlatformManager}
      requiredRoles={["admin", "manager"]}
    />
  }
/>
            <Route path="/analytics" element={
              <PrivateRoute component={AnalyticsDashboard} requiredRole="admin" />
            } />
            
            {/* New route for non-admin users */}
            <Route path="/employee-portal" element={
              <PrivateRoute component={EmployeePortal} />
            } />
             <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
      </StoreColorProvider>
    </AuthProvider>
  );
}
export default App;