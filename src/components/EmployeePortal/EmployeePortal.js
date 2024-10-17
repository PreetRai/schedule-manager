import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';
import Legend from '../Legend';
import { useStoreColors } from '../../contexts/StoreColorContext';

function EmployeePortal() {
  const { currentUser } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [totalHours, setTotalHours] = useState(0);
  const [weeklyPay, setWeeklyPay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [stores, setStores] = useState([]);
  const storeColors = useStoreColors();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchStores();
    fetchEmployeeData();
    fetchShifts();
  }, [currentUser, weekStart]);

  const fetchStores = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const storeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storeList);
    } catch (err) {
      setError("Failed to fetch stores.");
      console.error(err);
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where("id", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setEmployeeData(querySnapshot.docs[0].data());
      } else {
        setError("Employee data not found");
      }
    } catch (err) {
      setError("Failed to fetch employee data");
      console.error(err);
    }
  };

  const fetchShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = format(weekStart, 'yyyy-MM-dd');
      const end = format(endOfWeek(weekStart), 'yyyy-MM-dd');
      
      const shiftsRef = collection(db, 'shifts');
      const q = query(
        shiftsRef,
        where("employee_id", "==", currentUser.uid),
        where("date", ">=", start),
        where("date", "<=", end)
      );
      
      const querySnapshot = await getDocs(q);
      const shiftList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShifts(shiftList);

      calculateTotalHoursAndPay(shiftList);
    } catch (err) {
      setError("Failed to fetch shifts. Please try again.");
      console.error("Error fetching shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHoursAndPay = (shiftList) => {
    let totalMinutes = 0;
    shiftList.forEach(shift => {
      const start = parse(shift.start_time, 'HH:mm', new Date());
      const end = parse(shift.end_time, 'HH:mm', new Date());
      const shiftMinutes = (end - start) / (1000 * 60);
      totalMinutes += shiftMinutes;
    });

    const hours = totalMinutes / 60;
    setTotalHours(hours);
    setWeeklyPay(hours * (employeeData?.pay || 0));
  };

  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const getShiftForDay = (day) => {
    const date = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
    return shifts.find(s => s.date === date);
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4">My Schedule</h1>
        
        {employeeData && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Employee Information</h2>
            <p><strong>Name:</strong> {employeeData.name}</p>
            <p><strong>Role:</strong> {employeeData.role}</p>
            <p><strong>Email:</strong> {employeeData.email}</p>
          </div>
        )}

        <Legend title={'Legend'}stores={stores} />

        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePreviousWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
          <h2 className="text-xl font-bold">{format(weekStart, 'MMMM d, yyyy')} - {format(endOfWeek(weekStart), 'MMMM d, yyyy')}</h2>
          <button onClick={handleNextWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
        </div>

        <table className="w-full border-collapse mb-4">
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
                  <td key={day} className={`border p-2 text-center ${shift ? storeColors[shift.store_id] || '' : ''}`}>
                    {shift ? `${shift.start_time} - ${shift.end_time}` : 'Off'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg"><strong>Total Hours:</strong> {totalHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-lg"><strong>Weekly Pay:</strong> ${weeklyPay.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeePortal;