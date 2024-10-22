import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import Legend from './Legend';
import { useStoreColors } from '../contexts/StoreColorContext';

function Dashboard() {
  const storeColors = useStoreColors();
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [driverShifts, setDriverShifts] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchStores(),
        fetchEmployees(),
        fetchDrivers(),
        fetchShifts(),
        fetchDriverShifts(),
      ]);
    };
    fetchData();
  }, [currentWeek]);

  const fetchStores = async () => {
    const querySnapshot = await getDocs(collection(db, 'stores'));
    setStores(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    setEmployees(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchDrivers = async () => {
    const querySnapshot = await getDocs(collection(db, 'drivers'));
    setDrivers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchShifts = async () => {
    const start = format(currentWeek, 'yyyy-MM-dd');
    const end = format(endOfWeek(currentWeek), 'yyyy-MM-dd');
    const shiftsQuery = query(
      collection(db, 'shifts'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const querySnapshot = await getDocs(shiftsQuery);
    setShifts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchDriverShifts = async () => {
    const start = format(currentWeek, 'yyyy-MM-dd');
    const end = format(endOfWeek(currentWeek), 'yyyy-MM-dd');
    const driverShiftsQuery = query(
      collection(db, 'driver_shifts'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const querySnapshot = await getDocs(driverShiftsQuery);
    setDriverShifts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const weekDays = eachDayOfInterval({
    start: currentWeek,
    end: endOfWeek(currentWeek)
  });

  const renderShifts = (dayShifts, isDriverShift = false) => {
    const shiftsByStore = dayShifts.reduce((acc, shift) => {
      if (!acc[shift.store_id]) {
        acc[shift.store_id] = [];
      }
      acc[shift.store_id].push(shift);
      return acc;
    }, {});

    const sortedStoreIds = Object.keys(shiftsByStore).sort();

    return sortedStoreIds.map(storeId => (
      <div key={storeId} className={`${storeColors[storeId] || ''} p-1 rounded mb-1`}>
        {shiftsByStore[storeId].map(shift => (
          <div key={shift.id}>
            {isDriverShift ? shift.driver_name : shift.employee_name}: {shift.start_time} - {shift.end_time}
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main className="py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Legend stores={stores} title="Stores" />

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

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Drivers</h2>
              <div className="mt-3">
                <p className="text-3xl font-semibold text-gray-900">{drivers.length}</p>
                <p className="text-sm text-gray-500">Total Drivers</p>
              </div>
              <Link to="/drivers" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                Manage Drivers
              </Link>
            </div>
          </div>

          <ScheduleTable title="This Week's Employee Schedule" shifts={shifts} weekDays={weekDays} renderShifts={renderShifts} linkTo="/calendar" />
          <ScheduleTable title="This Week's Driver Schedule" shifts={driverShifts} weekDays={weekDays} renderShifts={(shifts) => renderShifts(shifts, true)} linkTo="/driver-calendar" />
        </div>
      </main>
    </div>
  );
}

function ScheduleTable({ title, shifts, weekDays, renderShifts, linkTo }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg col-span-full">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {format(day, 'EEE dd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                {weekDays.map(day => {
                  const dayShifts = shifts.filter(shift => isSameDay(new Date(shift.date), day));
                  return (
                    <td key={day.toISOString()} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {renderShifts(dayShifts)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table> 
        </div>
        <Link to={linkTo} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
          View Full Calendar
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;