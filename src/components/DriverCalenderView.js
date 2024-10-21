// DriverCalendarView.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';
import { useStoreColors } from '../contexts/StoreColorContext';

function DriverCalendarView({ drivers, stores, storeId, weekStart }) {
  const [shifts, setShifts] = useState([]);
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
    const shiftsRef = collection(db, 'driver_shifts');
    const q = query(
      shiftsRef,
      where("store_id", "==", storeId),
      where("date", ">=", start),
      where("date", "<=", end)
    );
    const querySnapshot = await getDocs(q);
    const shiftList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setShifts(shiftList);
  };

  const handleCellClick = (driver, day) => {
    const date = addDays(weekStart, days.indexOf(day));
    const existingShift = getShiftForDriverAndDay(driver.id, day);
    
    if (existingShift) {
      setCurrentShift(existingShift);
    } else {
      setCurrentShift({
        driver_id: driver.id,
        driver_name: driver.name,
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
        await updateDoc(doc(db, 'driver_shifts', shiftData.id), shiftData);
      } else {
        await addDoc(collection(db, 'driver_shifts'), shiftData);
      }
      fetchShifts();
      setShowModal(false);
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await deleteDoc(doc(db, 'driver_shifts', shiftId));
      fetchShifts();
      setShowModal(false);
    } catch (error) {
      console.error("Error deleting shift:", error);
    }
  };

  const getShiftForDriverAndDay = (driverId, day) => {
    const date = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
    return shifts.find(s => s.driver_id === driverId && s.date === date);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">Driver</th>
              {days.map(day => (
                <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drivers.map(driver => (
              <tr key={driver.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit">{driver.name}</td>
                {days.map(day => {
                  const shift = getShiftForDriverAndDay(driver.id, day);
                  return (
                    <td
                      key={day}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer ${shift ? storeColors[storeId] || '' : ''}`}
                      onClick={() => handleCellClick(driver, day)}
                    >
                      {shift ? `${shift.start_time} - ${shift.end_time}` : '+'}
                    </td>
                  );
                })}
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
          stores={stores}
        />
      )}
    </div>
  );
}
function ShiftModal({
    shift,
    onSave,
    onDelete,
    onClose,
    stores,
    employeeStoreId
}) {
    const [startTime, setStartTime] = useState(shift.start_time || '');
    const [endTime, setEndTime] = useState(shift.end_time || '');
    const [storeId, setStoreId] = useState(shift.store_id || employeeStoreId || '');
    const handleSubmit = (e) => {
        e.preventDefault();
        const updatedShift = {
            ...shift,
            start_time: startTime,
            end_time: endTime,
            store_id: storeId
        };
        onSave(updatedShift);
    };

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div
                className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
                    {
                        shift.id
                            ? 'Edit Shift'
                            : 'Add Shift'
                    }
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
                        <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="start_time">
                            Start Time
                        </label>
                        <input
                            type="time"
                            id="start_time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required="required"/>
                    </div>
                    <div className="mb-6">
                        <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="end_time">
                            End Time
                        </label>
                        <input
                            type="time"
                            id="end_time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required="required"/>
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
                            required="required">
                            <option value="">Select Store</option>
                            {
                                stores.map(store => (
                                    <option key={store.id} value={store.id}>{store.name}
                                        {
                                            store.id === employeeStoreId
                                                ? '(Default)'
                                                : ''
                                        }</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Save
                        </button>
                        {
                            shift.id && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(shift.id)}
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                                    Delete
                                </button>
                            )
                        }
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default DriverCalendarView;