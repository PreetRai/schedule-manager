import React, {useState, useEffect} from 'react';
import {
    writeBatch,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    where,
    query
} from 'firebase/firestore';
import {db} from '../firebase';
import {
    format,
    parseISO,
    addDays,
    parse,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import StoreCalendarView from './StoreCalenderView';
import {useStoreColors} from '../contexts/StoreColorContext';
import Legend from './Legend';
import DriverCalendarView from './DriverCalenderView';
function CalendarView() {
    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentShift, setCurrentShift] = useState(null);
    const [weekStart, setWeekStart] = useState(
        startOfWeek(new Date(), {weekStartsOn: 1})
    );
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedEmployeeStoreId, setSelectedEmployeeStoreId] = useState(null);
    const storeColors = useStoreColors();
    const [drivers, setDrivers] = useState([]);
    const [showDriverCalendar, setShowDriverCalendar] = useState(false);

    const [storeName, setStoreName] = useState('');
    const days = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
    ];

    useEffect(() => {
        fetchEmployees();
        fetchShifts();
        fetchStores();
        fetchDrivers();
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [weekStart]);

    const fetchDrivers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'drivers'));
            const driverList = querySnapshot
                .docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            setDrivers(driverList);
        } catch (error) {
            console.error("Error fetching drivers:", error);
        }
    };
    const clearShifts = async () => {
        if (window.confirm(
            "Are you sure you want to clear all shifts for this week? This action cannot be" +
            " undone."
        )) {
            try {
                const start = format(weekStart, 'yyyy-MM-dd');
                const end = format(endOfWeek(weekStart,{weekStartsOn:1}), 'yyyy-MM-dd');
                const shiftsRef = collection(db, 'shifts');
                const q = query(
                    shiftsRef,
                    where("date", ">=", start),
                    where("date", "<=", end)
                );
                const querySnapshot = await getDocs(q);

                const batch = writeBatch(db);
                querySnapshot
                    .docs
                    .forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                await batch.commit();

                setShifts([]);
            } catch (error) {
                console.error("Error clearing shifts:", error);
            }
        }
    };

    const copyShiftsToNextWeek = async () => {
        const nextWeekStart = addDays(weekStart, 7);
        const shiftsToCopy = shifts.map(shift => ({
            ...shift,
            date: format(addDays(parseISO(shift.date), 7), 'yyyy-MM-dd'),
            id: null // Remove the id so a new one is generated
        }));

        try {
            const batch = writeBatch(db);
            shiftsToCopy.forEach(shift => {
                const newShiftRef = doc(collection(db, 'shifts'));
                batch.set(newShiftRef, shift);
            });
            await batch.commit();
            handleNextWeek(); // Move to next week
        } catch (error) {
            console.error("Error copying shifts:", error);
        }
    };
    const fetchEmployees = async () => {
        try {
            // Fetch employees
            const employeesSnapshot = await getDocs(collection(db, 'employees'));
            const employeeList = employeesSnapshot
                .docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isManager: false // Add a flag to distinguish employees
                }));

            // Fetch managers
            const managersSnapshot = await getDocs(collection(db, 'managers'));
            const managerList = managersSnapshot
                .docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isManager: true // Add a flag to distinguish managers
                }));

            // Combine employees and managers
            const combinedList = [
                ...employeeList,
                ...managerList
            ];

            setEmployees(combinedList);
        } catch (error) {
            console.error("Error fetching employees and managers:", error);
        } finally {}
    };

    const fetchShifts = async () => {
        const start = format(weekStart, 'yyyy-MM-dd');
        const end = format(endOfWeek(weekStart, {weekStartsOn: 1}), 'yyyy-MM-dd');
        const querySnapshot = await getDocs(collection(db, 'shifts'));
        const shiftList = querySnapshot
            .docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(shift => shift.date >= start && shift.date <= end);
        setShifts(shiftList);
    };

    const fetchStores = async () => {
        const querySnapshot = await getDocs(collection(db, 'stores'));
        const storeList = querySnapshot
            .docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        setStores(storeList);
    };

    const getDefaultTimes = (employee, day) => {
        const store = stores.find(s => s.id === employee.store_id);
        if (store && store.hours && store.hours[day.toLowerCase()]) {
            return {
                start_time: store
                    .hours[day.toLowerCase()]
                    .open,
                end_time: store
                    .hours[day.toLowerCase()]
                    .close
            };
        }
        return {start_time: '', end_time: ''};
    };

    const handleCellClick = (employee, day) => {
        const date = addDays(weekStart, days.indexOf(day));
        const existingShift = getShiftForEmployeeAndDay(employee.id, day);

        if (existingShift) {
            setCurrentShift(existingShift);
        } else {
            const defaultTimes = getDefaultTimes(employee, day);
            setCurrentShift({
                employee_id: employee.id,
                employee_name: employee.name,
                date: format(date, 'yyyy-MM-dd'),
                start_time: defaultTimes.start_time,
                end_time: defaultTimes.end_time,
                store_id: employee.store_id // Set the default store_id
            });
        }
        setShowModal(true);
        setSelectedEmployeeStoreId(employee.store_id);
    };

    const handleSaveShift = async (shiftData) => {
        try {
            if (shiftData.id) {
                await updateDoc(doc(db, 'shifts', shiftData.id), shiftData);
                setShifts(shifts.map(
                    s => s.id === shiftData.id
                        ? shiftData
                        : s
                ));
            } else {
                const docRef = await addDoc(collection(db, 'shifts'), shiftData);
                setShifts([
                    ...shifts, {
                        ...shiftData,
                        id: docRef.id
                    }
                ]);
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error saving shift:", error);
            // Handle error (e.g., show error message to user)
        }
    };

    const handleDeleteShift = async (shiftId) => {
        try {
            await deleteDoc(doc(db, 'shifts', shiftId));
            setShifts(shifts.filter(s => s.id !== shiftId));
            setShowModal(false);
        } catch (error) {
            console.error("Error deleting shift:", error);
            // Handle error (e.g., show error message to user)
        }
    };

    const getShiftForEmployeeAndDay = (employeeId, day) => {
        const date = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
        return shifts.find(s => s.employee_id === employeeId && s.date === date);
    };

    const handlePreviousWeek = () => {
        setWeekStart(addDays(weekStart, -7), {weekStartsOn: 1});
    };

    const handleNextWeek = () => {
        setWeekStart(addDays(weekStart, 7), {weekStartsOn: 1});
    };

    const calculateTotalHoursAndEarnings = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
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
        <div className="flex flex-col min-h-screen bg-gray-100">
          <div className="p-4 space-y-4">
            <select
              value={selectedStore || ''}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full p-2 border rounded shadow"
            >
              <option value="">All Stores</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <h1 className="text-xl font-bold text-center">
              {showDriverCalendar ? "Driver Scheduler" : "Employee Scheduler"}
            </h1>
            <button
              onClick={() => setShowDriverCalendar(!showDriverCalendar)}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded"
            >
              {showDriverCalendar ? 'Show Employee Calendar' : 'Show Driver Calendar'}
            </button>
          </div>
    
          {showDriverCalendar ? (
            <DriverCalendarView
              drivers={drivers}
              stores={stores}
              storeId={selectedStore}
              weekStart={weekStart}
            />
          ) : (
            selectedStore ? (
              <StoreCalendarView
                storeId={selectedStore}
                employees={employees}
                stores={stores}
                onShiftUpdate={fetchShifts}
                selectedEmployeeStoreId={selectedEmployeeStoreId}
                setSelectedEmployeeStoreId={setSelectedEmployeeStoreId}
              />
            ) : (
              <div className="flex-1 overflow-hidden">
                <div className="bg-white shadow-md rounded-lg mx-4 my-2 p-4">
                {selectedStore ? (
        <Legend stores={stores} title="Stores" rounded="rounded-none mx-4 my-2" />
      ) : (
        <div className='p-2'></div>
      )}
      <div className="flex justify-between items-center p-4 bg-white shadow-md mb-4">
        {selectedStore ? (
          <h1 className={`p-2 rounded ${storeColors[selectedStore]}`}>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white">
                            Employee
                          </th>
                          {days.map(day => (
                            <th key={day} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {day.slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee, index) => (
                          <tr key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1 text-sm font-medium text-gray-900 sticky left-0 bg-inherit whitespace-nowrap">
                              {employee.name}
                            </td>
                            {days.map(day => {
                              const shift = getShiftForEmployeeAndDay(employee.id, day);
                              return (
                                <td key={day} className="px-1 py-1 text-xs text-gray-500">
                                  <div
                                    className={`p-1 rounded cursor-pointer ${shift ? storeColors[shift.store_id] || '' : 'hover:bg-gray-100'}`}
                                    onClick={() => handleCellClick(employee, day)}
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
                  </div>
                </div>
                <div className="flex flex-col space-y-2 m-4">
                  <button
                    onClick={copyShiftsToNextWeek}
                    className="bg-purple-500 text-white px-4 py-2 rounded"
                  >
                    Copy Shifts to Next Week
                  </button>
                  <button
                    onClick={clearShifts}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                  >
                    Clear Shifts
                  </button>
                </div>
              </div>
            )
          )}
    
          {showModal && (
            <ShiftModal
              shift={currentShift}
              onSave={handleSaveShift}
              onDelete={handleDeleteShift}
              onClose={() => setShowModal(false)}
              stores={stores}
              storeId={selectedStore}
              onShiftUpdate={fetchShifts}
            />
          )}
        </div>
      );
    }
    
    function ShiftModal({ shift, onSave, onDelete, onClose, stores, employeeStoreId }) {
      const [startTime, setStartTime] = useState(shift.start_time || '');
      const [endTime, setEndTime] = useState(shift.end_time || '');
      const [storeId, setStoreId] = useState(shift.store_id || employeeStoreId || '');
    
      const handleSubmit = (e) => {
        e.preventDefault();
        const updatedShift = { ...shift, start_time: startTime, end_time: endTime, store_id: storeId };
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
                <label className="block text-sm font-medium text-gray-700">Employee: {shift.employee_name}</label>
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
    

export default CalendarView;