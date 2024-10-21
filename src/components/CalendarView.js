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
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date() + 1));
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedEmployeeStoreId, setSelectedEmployeeStoreId] = useState(null);
    const storeColors = useStoreColors();
    const [drivers, setDrivers] = useState([]);
    const [showDriverCalendar, setShowDriverCalendar] = useState(false);
  
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
          const driverList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
                const end = format(endOfWeek(weekStart), 'yyyy-MM-dd');
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
        const end = format(endOfWeek(weekStart), 'yyyy-MM-dd');
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
        setWeekStart(addDays(weekStart, -7));
    };

    const handleNextWeek = () => {
        setWeekStart(addDays(weekStart, 7));
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
        <div className="flex flex-col h-screen bg-gray-100">
            
            <div className="flex justify-between items-center p-4">
                <select
                    value={selectedStore || ''}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="shadow rounded p-4">
                    <option value="">All Stores</option>
                    {
                        stores.map(
                            store => (<option key={store.id} value={store.id}>{store.name}</option>)
                        )
                    }
                </select>
                <button
        onClick={() => setShowDriverCalendar(!showDriverCalendar)}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
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
      ) :(
                selectedStore
                    ? (
                        <StoreCalendarView
                            storeId={selectedStore}
                            employees={employees}
                            stores={stores}
                            onShiftUpdate={fetchShifts}/>
                    )
                    : (

                        <div className="flex flex-col h-screen bg-gray-100">

                            <div className="flex flex-1 overflow-hidden ">
                                <div className="w-1/4 p-4 border-r overflow-y-auto ">
                                    <Legend stores={stores} title="Stores"/>
                                    <div className="mt-6 bg-white overflow-hidden shadow rounded-lg col-span-full ">
                                        <div className="px-4 py-5 sm:p-6 ">
                                            <h2 className="text-xl font-bold mb-4">Employees</h2>
                                            <div className="grid grid-cols-4 gap-2 font-bold text-sm mb-2 pr-3">
                                                <div className="col-span-2">Name</div>
                                                <div className="text-right">Hours</div>
                                                <div className="text-right">Earnings</div>
                                            </div>
                                            <ul
                                                className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400">
                                                {
                                                    employees.map(employee => {
                                                        const {hours, earnings} = calculateTotalHoursAndEarnings(employee.id);
                                                        return (
                                                            <li
                                                                key={employee.id}
                                                                className="grid grid-cols-4 gap-2 p-2 cursor-pointer rounded "
                                                                onClick={() => setSelectedEmployee(employee)}>
                                                                <div className="col-span-2 truncate">{employee.name}</div>
                                                                <div className="text-right">{hours.toFixed(2)}</div>
                                                                <div className="text-right">${earnings.toFixed(2)}</div>
                                                            </li>
                                                        );
                                                    })
                                                }
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-3/4  overflow-x-auto    rounded-lg col-span-full ">
                                    <div className="p-4 ">
                                        <div
                                            className="flex justify-between items-center p-4 bg-white shadow-md rounded-lg mb-4">
                                            <div className="text-center">
                                                <h1
                                                    onClick={() => setWeekStart(startOfWeek(new Date()))}
                                                    className=" text-sm transition duration-300 ease-in-out"></h1>
                                                <h2 className="text-xl font-bold text-gray-800">
                                                    {format(weekStart, 'MMMM d, yyyy')}
                                                    - {format(endOfWeek(weekStart), 'MMMM d, yyyy')}
                                                </h2>

                                            </div>
                                            <div className='flex gap-5'>
                                                <button
                                                    onClick={handlePreviousWeek}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-300 ease-in-out flex items-center">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-5 w-5 mr-2"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                                            clipRule="evenodd"/>
                                                    </svg>
                                                    Previous Week
                                                </button>

                                                <button
                                                    onClick={handleNextWeek}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-300 ease-in-out flex items-center">
                                                    Next Week
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-5 w-5 ml-2"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                            clipRule="evenodd"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={copyShiftsToNextWeek}
                                                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition duration-300 ease-in-out flex items-center">
                                                    Copy Shifts to Next Week
                                                </button>
                                                <button
                                                    onClick={clearShifts}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-300 ease-in-out flex items-center">
                                                    Clear Shifts
                                                </button>
                                            </div>
                                        </div>
                                        <div
                                            className="shadow-md sm:rounded-lg max-h-[600px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400">
                                            <table className="min-w-full divide-y divide-gray-200 ">
                                                <thead className="bg-gray-50 ">
                                                    <tr>
                                                        <th
                                                            scope="col"
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 ">Employee</th>
                                                        {
                                                            days.map(day => (
                                                                <th
                                                                    key={day}
                                                                    scope="col"
                                                                    className=" text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{day}</th>
                                                            ))
                                                        }
                                                        <th
                                                            scope="col"
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden">Total Hours</th>
                                                        <th
                                                            scope="col"
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden">Total Earnings</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {
                                                        employees.map((employee, index) => {
                                                            const {hours, earnings} = calculateTotalHoursAndEarnings(employee.id);
                                                            return (
                                                                <tr
                                                                    key={employee.id}
                                                                    className={index % 2 === 0
                                                                        ? 'bg-white'
                                                                        : 'bg-gray-50'}>
                                                                    <td
                                                                        className="px-6 py-4  text-sm font-medium text-gray-900 sticky left-0 bg-inherit ">{employee.name}</td>
                                                                    {
                                                                        days.map(day => {
                                                                            const shift = getShiftForEmployeeAndDay(employee.id, day);
                                                                            const formatTime12Hour = (time) => {
                                                                                if (!time) 
                                                                                    return '';
                                                                                const [hours, minutes] = time.split(':');
                                                                                return format(new Date(2023, 0, 1, hours, minutes), 'h:mm a');
                                                                            };
                                                                            return (
                                                                                <td key={day} className="py-4  text-sm text-gray-500">
                                                                                    <div
                                                                                        className={`p-2 rounded cursor-pointer transition duration-150 ease-in-out ${
                                                                                        shift
                                                                                            ? storeColors[shift.store_id] || ''
                                                                                            : 'hover:bg-gray-100'}`}
                                                                                        onClick={() => handleCellClick(employee, day)}>
                                                                                        {
                                                                                            shift
                                                                                                ? `${formatTime12Hour(shift.start_time)} - ${formatTime12Hour(shift.end_time)}`
                                                                                                : <span className="text-gray-400">+</span>
                                                                                        }
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        })
                                                                    }
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden">{hours.toFixed(2)}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden">${earnings.toFixed(2)}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </ div>
                                </div>
                            </div>
                            {
                                showModal && (
                                    <ShiftModal
                                        shift={currentShift}
                                        onSave={handleSaveShift}
                                        onDelete={handleDeleteShift}
                                        onClose={() => setShowModal(false)}
                                        stores={stores}
                                        employeeStoreId={selectedEmployeeStoreId}/>
                                )
                            }
                        </div>

                    ))
            }



            
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

export default CalendarView;