
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';
import Legend from '../Legend';
import { useStoreColors } from '../../contexts/StoreColorContext';

function DriverPortal() {
  const { currentUser } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [totalHours, setTotalHours] = useState(0);
  const [weeklyPay, setWeeklyPay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [DriverData, setDriverData] = useState(null);
  const [stores, setStores] = useState([]);
  const storeColors = useStoreColors();

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    fetchStores();
    fetchDriverData();
    fetchShifts();
  }, [currentUser, weekStart]);

  // ... (keep the existing fetchStores, fetchDriverData, fetchShifts, calculateTotalHoursAndPay functions)
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
  const fetchDriverData = async () => {
    try {
      const DriversRef = collection(db, 'drivers');
      const q = query(DriversRef, where("id", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setDriverData(querySnapshot.docs[0].data());
      } else {
        setError("Driver data not found");
      }
    } catch (err) {
      setError("Failed to fetch Driver data");
      console.error(err);
    }
  };
  const fetchShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = format(weekStart, 'yyyy-MM-dd');
      const end = format(endOfWeek(weekStart,{weekStartsOn:1}), 'yyyy-MM-dd');
        
      const shiftsRef = collection(db, 'driver_shifts');
      const q = query(
        shiftsRef,
        where("driver_id", "==", currentUser.uid),
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
    setWeeklyPay(hours * (DriverData?.pay || 0));
  };
  const handlePreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const getShiftForDay = (day) => {
    const date = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
    return shifts.find(s => s.date === date);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">My Schedule</h1>
          
          {DriverData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Driver Information</h2>
              <p><strong>Name:</strong> {DriverData.name}</p>
              <p><strong>Role:</strong> {DriverData.role}</p>
              <p><strong>Email:</strong> {DriverData.email}</p>
            </div>
          )}

          <Legend title="Legend" stores={stores} className=""/>

          <div className="flex justify-between items-center mb-4 mt-4">
            <button onClick={handlePreviousWeek} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              &lt; Previous
            </button>
            <h2 className="text-lg font-bold">
              {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart), 'MMM d, yyyy')}
            </h2>
            <button onClick={handleNextWeek} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              Next &gt;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {days.map(day => (
                    <th key={day} className="border p-2 text-sm">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {days.map(day => {
                    const shift = getShiftForDay(day);
                    return (
                      <td key={day} className={`border p-2 text-center text-sm ${shift ? storeColors[shift.store_id] || '' : ''}`}>
                        {shift ? `${shift.start_time} - ${shift.end_time}` : 'Off'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-lg mb-2 sm:mb-0"><strong>Total Hours:</strong> {totalHours.toFixed(2)}</p>
            <p className="text-lg"><strong>Weekly Pay:</strong> ${weeklyPay.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriverPortal;