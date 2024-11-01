// DriverCalendarView.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs,getDoc, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, addDays, parse, startOfWeek, endOfWeek } from 'date-fns';
import { useStoreColors } from '../contexts/StoreColorContext';
import Legend from './Legend';
function DriverCalendarView({ drivers, stores, storeId,legend }) {
  const [shifts, setShifts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const storeColors = useStoreColors();
  const [storeName, setStoreName] = useState('');
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), {weekStartsOn: 1})
);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchShifts();
    filterDriversByStore();
    if (storeId) {
      fetchStoreName(storeId).then(setStoreName);
    } else {
      setStoreName("All Stores");
    }
  }, [weekStart, storeId]);
  
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [Driver, setDriver] = useState([]);

  const filterDriversByStore = async () => {
    if (storeId && stores.some(store => store.id === storeId)) {
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where("store_id", "==", storeId));
      const querySnapshot = await getDocs(q);
      const driverList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFilteredDrivers(driverList);
    } else {
      setFilteredDrivers(drivers);
    }
  };

  const fetchShifts = async () => {
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(endOfWeek(weekStart,{weekStartsOn:1}), 'yyyy-MM-dd');
    const shiftsRef = collection(db, 'driver_shifts');
    let q;

    if (storeId && stores.some(store => store.id === storeId)) {
      q = query(
        shiftsRef,
        where("store_id", "==", storeId),
        where("date", ">=", start),
        where("date", "<=", end)
      );
    } else {
      q = query(
        shiftsRef,
        where("date", ">=", start),
        where("date", "<=", end)
      );
    }

    const querySnapshot = await getDocs(q);
    const shiftList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setShifts(shiftList);

    if (storeId && stores.some(store => store.id === storeId)) {
      setStoreName(await fetchStoreName(storeId));
    } else {
      setStoreName("All Stores");
    }
  };
  const fetchStoreName = async (storeId) => {
    const storeDoc = await getDoc(doc(db, 'stores', storeId));
    if (storeDoc.exists()) {
      return storeDoc.data().name;
    }
    return "Unknown Store";
  };
const handleCellClick = async (driver, day) => {
  const date = addDays(weekStart, days.indexOf(day));
  const existingShift = getShiftForDriverAndDay(driver.id, day);
  
  if (existingShift) {
    setCurrentShift(existingShift);
  } else {
    const defaultStoreId = await fetchDriverDefaultStore(driver.id);
    const defaultHours = defaultStoreId ? await fetchStoreHours(defaultStoreId) : null;
    
    setCurrentShift({
      driver_id: driver.id,
      driver_name: driver.name,
      date: format(date, 'yyyy-MM-dd'),
      start_time: defaultHours ? defaultHours.start_time : '',
      end_time: defaultHours ? defaultHours.end_time : '',
      store_id: defaultStoreId || storeId
    });
  }
  setShowModal(true);
};
  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7), {weekStartsOn: 1});
};

const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7), {weekStartsOn: 1});
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


  const fetchDriverDefaultStore = async (driverId) => {
    try {
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      if (driverDoc.exists()) {
        return driverDoc.data().store_id;
      }
      return null;
    } catch (error) {
      console.error("Error fetching driver's default store:", error);
      return null;
    }
  };
  
  const fetchStoreHours = async (storeId) => {
    try {
      const storeDoc = await getDoc(doc(db, 'stores', storeId));
      if (storeDoc.exists()) {
        const storeData = storeDoc.data();
        return {
          start_time: storeData.opening_time || '09:00',
          end_time: storeData.closing_time || '17:00'
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching store hours:", error);
      return null;
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {storeId ? (
        <Legend stores={stores} title="Stores" rounded="rounded-none mx-4 my-2" />
      ) : (
        <div className='p-2'></div>
      )}
      <div className="flex justify-between items-center p-4 bg-white shadow-md mb-4">
        {storeId ? (
          <h1 className={`p-2 rounded ${storeColors[storeId]}`}>
            {storeName || "Loading..."}
          </h1>
        ) : (
          <h1 className='p-2 rounded bg-blue-500 text-white'>Master Calendar</h1>
        )}
        <h2 className="text-sm font-semibold text-center">
          {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, {weekStartsOn: 1}), 'MMM d, yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={handlePreviousWeek} className="bg-blue-500 text-white px-3 py-1 rounded">
            &lt;
          </button>
          <button onClick={handleNextWeek} className="bg-blue-500 text-white px-3 py-1 rounded">
            &gt;
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white">
                Driver
              </th>
              {days.map(day => (
                <th key={day} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDrivers.map((driver, index) => (
              <tr key={driver.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-2 py-1 text-sm font-medium text-gray-900 sticky left-0 bg-inherit whitespace-nowrap">
                  {driver.name}
                </td>
                {days.map(day => {
                  const shift = getShiftForDriverAndDay(driver.id, day);
                  return (
                    <td key={day} className="px-1 py-1 text-xs text-gray-500">
                      <div
                        className={`p-1 rounded cursor-pointer ${shift ? storeColors[shift.store_id] || '' : 'hover:bg-gray-100'}`}
                        onClick={() => handleCellClick(driver, day)}
                      >
                        {shift ? (
                          <>
                            <div>{format(parse(shift.start_time, 'HH:mm', new Date()), 'h:mm a')}</div>
                            <div>{format(parse(shift.end_time, 'HH:mm', new Date()), 'h:mm a')}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">+</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col space-y-2 m-4">
        <button
        //  onClick={copyShiftsToNextWeek}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          Copy Shifts to Next Week
        </button>
        <button
       //   onClick={clearShifts}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Clear Shifts
        </button>
      </div>
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
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            {shift.id ? 'Edit Shift' : 'Add Shift'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Driver: {shift.driver_name}</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date: {shift.date}</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="start_time">Start Time</label>
              <input
                type="time"
                id="start_time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="end_time">End Time</label>
              <input
                type="time"
                id="end_time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="store">Store</label>
              <select
                id="store"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save
              </button>
              {shift.id && (
                <button
                  type="button"
                  onClick={() => onDelete(shift.id)}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
export default DriverCalendarView;