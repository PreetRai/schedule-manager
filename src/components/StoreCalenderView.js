import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';

function StoreCalendarView({ storeId, employees, stores, onShiftUpdate }) {
  const [shifts, setShifts] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const storeColors = {
    'QJok5AgOOCfwXPPgdJWY': 'bg-green-100',
    'mgo6a1LkZ9PWQgczHZsT': 'bg-purple-200',
    // Add more store colors as needed
  };

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
  };

  const handleCellClick = (employee, day) => {
    const date = addDays(weekStart, days.indexOf(day));
    const existingShift = getShiftForEmployeeAndDay(employee.id, day);
    
    if (existingShift) {
      setCurrentShift(existingShift);
    } else {
      setCurrentShift({
        employee_id: employee.id,
        employee_name: employee.name,
        date: format(date, 'yyyy-MM-dd'),
        start_time: '',
        end_time: '',
        store_id: storeId
      });
    }
    setShowModal(true);
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

  const storeEmployees = employees.filter(employee => employee.store_id === storeId);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4">
        <button onClick={handlePreviousWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
        <h2 className="text-xl font-bold">{format(weekStart, 'MMMM d, yyyy')} - {format(endOfWeek(weekStart), 'MMMM d, yyyy')}</h2>
        <button onClick={handleNextWeek} className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
      </div>
      <div className="flex-1 overflow-x-auto">
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
                  return (
                    <td
                      key={day}
                      className={`border p-2 cursor-pointer ${shift ? storeColors[storeId] || '' : ''}`}
                      onClick={() => handleCellClick(employee, day)}
                    >
                      {shift ? `${shift.start_time} - ${shift.end_time}` : ''}
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
  );
}

function ShiftModal({ shift, onSave, onDelete, onClose,stores }) {
    const [startTime, setStartTime] = useState(shift.start_time || '');
    const [endTime, setEndTime] = useState(shift.end_time || '');
    const [storeId, setStoreId] = useState(shift.store_id || '');
  
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
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="store">
                Store
              </label>
              <select
                id="store"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
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