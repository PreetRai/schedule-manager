import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

function EmployeeTimesheet() {
  const [shifts, setShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [employee, setEmployee] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentUser } = useAuth();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const storeColors = {
    'QJok5AgOOCfwXPPgdJWY': 'bg-green-100',
    'mgo6a1LkZ9PWQgczHZsT': 'bg-purple-200',
  };

  useEffect(() => {
    if (currentUser) {
      fetchEmployee();
      fetchShifts();
      fetchStores();
    }
  }, [currentUser, weekStart]);

  const fetchEmployee = async () => {
    try {
      const employeeDoc = await getDoc(doc(db, 'employees', currentUser.uid));
      if (employeeDoc.exists()) {
        setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
      } else {
        setError('Employee data not found');
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Failed to fetch employee data');
    }
  };

  const fetchShifts = async () => {
    try {
      const start = format(weekStart, 'yyyy-MM-dd');
      const end = format(endOfWeek(weekStart), 'yyyy-MM-dd');
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('employee_id', '==', currentUser.uid),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      const querySnapshot = await getDocs(shiftsQuery);
      const shiftList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShifts(shiftList);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setError('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const storeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storeList);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError("Failed to fetch stores. Please try again.");
    }
  };

  const getShiftForDay = (day) => {
    const date = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
    return shifts.find(s => s.date === date);
  };

  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const calculateTotalHours = () => {
    return shifts.reduce((total, shift) => {
      const start = parse(shift.start_time, 'HH:mm', new Date());
      const end = parse(shift.end_time, 'HH:mm', new Date());
      const hours = (end - start) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  const calculateTotalEarnings = () => {
    const totalHours = calculateTotalHours();
    const hourlyRate = employee?.pay || 0; // Assuming 'pay' field exists in employee data
    return totalHours * hourlyRate;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!employee) {
    return <div>No employee data found</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4">
        <button onClick={handlePreviousWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
        <h2 className="text-xl font-bold">{format(weekStart, 'MMMM d, yyyy')} - {format(endOfWeek(weekStart), 'MMMM d, yyyy')}</h2>
        <button onClick={handleNextWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
      </div>
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Timesheet for {employee.name}</h1>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {days.map(day => (
                <th key={day} className="border p-2">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {days.map(day => {
                const shift = getShiftForDay(day);
                return (
                  <td key={day} className={`border p-2 ${shift && storeColors[shift.store_id] ? storeColors[shift.store_id] : ''}`}>
                    {shift ? `${shift.start_time} - ${shift.end_time}` : 'Off'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
        <div className="mt-4">
          <p className="font-bold">Total Hours This Week: {calculateTotalHours().toFixed(2)}</p>
          <p className="font-bold">Total Earnings This Week: ${calculateTotalEarnings().toFixed(2)}</p>
        </div>
        <div className="mt-4">
          <h3 className="font-bold mb-2">Store Legend:</h3>
          <div className="flex flex-wrap">
            {stores.map(store => (
              <div key={store.id} className={`mr-4 mb-2 p-2 ${storeColors[store.id] || 'bg-gray-200'}`}>
                {store.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeTimesheet;
