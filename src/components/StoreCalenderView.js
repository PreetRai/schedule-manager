import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';
import { useStoreColors } from '../contexts/StoreColorContext';
import Legend from './Legend';

function StoreCalendarView({ storeId, stores, onShiftUpdate }) {
  const [shifts, setShifts] = useState([]);
  const [storeEmployees, setStoreEmployees] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const storeColors = useStoreColors();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchShifts();
  }, [weekStart, storeId]);

  const fetchShifts = async () => {
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(endOfWeek(weekStart), 'yyyy-MM-dd');
    const shiftsRef = collection(db, 'shifts');
    const q = query(
      shiftsRef,
      where("store_id", "==", storeId),
      where("date", ">=", start),
      where("date", "<=", end)
    );
    const querySnapshot = await getDocs(q);
    const shiftList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setShifts(shiftList);

    // Extract unique employees from shifts
    const uniqueEmployees = Array.from(new Set(shiftList.map(shift => shift.employee_id)))
      .map(employeeId => {
        const employeeShift = shiftList.find(shift => shift.employee_id === employeeId);
        return {
          id: employeeId,
          name: employeeShift.employee_name
        };
      });
    setStoreEmployees(uniqueEmployees);
  };

  const handleCellClick = (employee, day) => {
    const date = addDays(weekStart, days.indexOf(day));
    const existingShift = getShiftForEmployeeAndDay(employee.id, day);
    
    if (existingShift) {
      setCurrentShift(existingShift);
    } else {
      const defaultTimes = getDefaultTimes(day);
      setCurrentShift({
        employee_id: employee.id,
        employee_name: employee.name,
        date: format(date, 'yyyy-MM-dd'),
        start_time: defaultTimes.start_time,
        end_time: defaultTimes.end_time,
        store_id: storeId
      });
    }
    setShowModal(true);
  };

  const getDefaultTimes = (day) => {
    const store = stores.find(s => s.id === storeId);
    if (store && store.hours && store.hours[day.toLowerCase()]) {
      return {
        start_time: store.hours[day.toLowerCase()].open,
        end_time: store.hours[day.toLowerCase()].close
      };
    }
    return { start_time: '', end_time: '' };
  };

  const handleSaveShift = async (shiftData) => {
    try {
      if (shiftData.id) {
        await updateDoc(doc(db, 'shifts', shiftData.id), shiftData);
      } else {
        await addDoc(collection(db, 'shifts'), shiftData);
      }
      fetchShifts();
      onShiftUpdate();
      setShowModal(false);
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await deleteDoc(doc(db, 'shifts', shiftId));
      fetchShifts();
      onShiftUpdate();
      setShowModal(false);
    } catch (error) {
      console.error("Error deleting shift:", error);
    }
  };

  const getShiftForEmployeeAndDay = (employeeId, day) => {
    const date = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
    return shifts.find(s => s.employee_id === employeeId && s.date === date);
  };

  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const calculateTotalHours = (employeeId) => {
    return shifts
      .filter(shift => shift.employee_id === employeeId)
      .reduce((total, shift) => {
        const start = parse(shift.start_time, 'HH:mm', new Date());
        const end = parse(shift.end_time, 'HH:mm', new Date());
        const hours = (end - start) / (1000 * 60 * 60);
        return total + hours;
      }, 0);
  };
  const calculateTotalHoursAndEarnings = (employeeId) => {
    const employee = storeEmployees.find(e => e.id === employeeId);
    const hourlyRate = employee
        ?.pay || 0;

    const totalHours = shifts
        .filter(shift => shift.employee_id === employeeId)
        .reduce((total, shift) => {
            const start = parse(shift.start_time, 'HH:mm', new Date());
            const end = parse(shift.end_time, 'HH:mm', new Date());
            const hours = (end - start) / (1000 * 60 * 60);
            return total + hours;
        }, 0);

    const totalEarnings = totalHours * hourlyRate;

    return {hours: totalHours, earnings: totalEarnings};
};
  return (
    <div className="flex flex-col h-screen">
         <div className="flex flex-1 overflow-hidden">
       <div className="w-1/4 p-4 border-r overflow-y-auto">
                                    <h2 className="text-xl font-bold mb-4">Employees</h2>
                                    <Legend stores={stores} title={"Stores"}/>
                                    <ul>
                                        {
                                            storeEmployees.map(employee => {
                                                const {hours, earnings} = calculateTotalHoursAndEarnings(employee.id);

                                                return (
                                                    <li
                                                        key={employee.id}
                                                        className={`p-2 cursor-pointer ${storeEmployees
                                                            ?.id === employee.id
                                                                ? 'bg-blue-100'
                                                                : ''}`}
                                                        onClick={() => setStoreEmployees(employee)}>
                                                        {employee.name}
                                                        - ${earnings.toFixed(2)}
                                                    </li>
                                                );
                                            })
                                        }
                                    </ul>
                                </div>
      
      <div className="flex-1 overflow-x-auto">
      <div className="flex justify-between items-center p-4">
        <button onClick={handlePreviousWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
        <h2 className="text-xl font-bold">{format(weekStart, 'MMMM d, yyyy')} - {format(endOfWeek(weekStart), 'MMMM d, yyyy')}</h2>
        <button onClick={handleNextWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
      </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2">Employee</th>
              {days.map(day => (
                <th key={day} className="border p-2">{day}</th>
              ))}
              <th className="border p-2">Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {storeEmployees.map(employee => (
              <tr key={employee.id}>
                <td className="border p-2">{employee.name}</td>
                {days.map(day => {
                  const shift = getShiftForEmployeeAndDay(employee.id, day);
                  const formatTime12Hour = (time) => {
                    if (!time) return '';
                    const [hours, minutes] = time.split(':');
                    return format(new Date(2023, 0, 1, hours, minutes), 'h:mm a');
                  };
                  return (
                    <td
                      key={day}
                      className={`border p-2 cursor-pointer ${shift ? storeColors[storeId] || '' : ''}`}
                      onClick={() => handleCellClick(employee, day)}
                    >
                      {shift ? `${formatTime12Hour(shift.start_time)} - ${formatTime12Hour(shift.end_time)}` : ''}
                    </td>
                  );
                })}
                <td className="border p-2">{calculateTotalHours(employee.id).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <ShiftModal
          shift={currentShift}
          onSave={handleSaveShift}
          onDelete={handleDeleteShift}
          onClose={() => setShowModal(false)}
          stores={[stores.find(store => store.id === storeId)]}
        />
      )}
    </div>
    </div>
  );
}

function ShiftModal({ shift, onSave, onDelete, onClose, stores }) {
  const [startTime, setStartTime] = useState(shift.start_time || '');
  const [endTime, setEndTime] = useState(shift.end_time || '');
  const [storeId, setStoreId] = useState(shift.store_id || '');

  useEffect(() => {
    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      const defaultTimes = getDefaultTimes(store, shift.date);
      setStartTime(defaultTimes.start_time);
      setEndTime(defaultTimes.end_time);
    }
  }, [storeId, stores, shift.date]);

  const getDefaultTimes = (store, date) => {
    if (store && store.hours) {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (store.hours[dayOfWeek]) {
        return {
          start_time: store.hours[dayOfWeek].open,
          end_time: store.hours[dayOfWeek].close
        };
      }
    }
    return { start_time: '', end_time: '' };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedShift = {
      ...shift,
      start_time: startTime,
      end_time: endTime,
      store_id: storeId,
    };
    onSave(updatedShift);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
          {shift.id ? 'Edit Shift' : 'Add Shift'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Employee: {shift.employee_name}
            </label>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Date: {shift.date}
            </label>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="start_time">
              Start Time
            </label>
            <input
              type="time"
              id="start_time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="end_time">
              End Time
            </label>
            <input
              type="time"
              id="end_time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Save
            </button>
            {shift.id && (
              <button
                type="button"
                onClick={() => onDelete(shift.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StoreCalendarView;