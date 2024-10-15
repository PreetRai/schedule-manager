import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import Legend from './Legend';
import { useStoreColors } from '../contexts/StoreColorContext';

function Dashboard() {
  const storeColors = useStoreColors();
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));

  useEffect(() => {
    fetchStores();
    fetchEmployees();
    fetchShifts();
  }, []);

  const fetchStores = async () => {
    const querySnapshot = await getDocs(collection(db, 'stores'));
    setStores(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    setEmployees(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchShifts = async () => {
    const start = format(currentWeek, 'yyyy-MM-dd');
    const end = format(endOfWeek(currentWeek), 'yyyy-MM-dd');
    const querySnapshot = await getDocs(collection(db, 'shifts'));
    setShifts(querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(shift => shift.date >= start && shift.date <= end));
  };

  const weekDays = eachDayOfInterval({
    start: currentWeek,
    end: endOfWeek(currentWeek)
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stores Summary */}
          <Legend stores={stores} title={"Stores"} />

          {/* Employees Summary */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Employees</h2>
              <div className="mt-3">
                <p className="text-3xl font-semibold text-gray-900">{employees.length}</p>
                <p className="text-sm text-gray-500">Total Employees</p>
              </div>
              <Link to="/employees" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                Manage Employees
              </Link>
            </div>
          </div>

          {/* Calendar Summary */}
          <div className="bg-white overflow-hidden shadow rounded-lg col-span-full">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">This Week's Schedule</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {weekDays.map(day => (
                        <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {format(day, 'EEE dd')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      {weekDays.map(day => {
                        const dayShifts = shifts.filter(shift => shift.date === format(day, 'yyyy-MM-dd'));
                        return (
                          <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dayShifts.map(shift => (
                              <div 
                                key={shift.id} 
                                className={`${storeColors[shift.store_id] || ''} p-1 rounded mb-1`}
                              >
                                {shift.employee_name}: {shift.start_time} - {shift.end_time}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <Link to="/calendar" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                View Full Calendar
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;