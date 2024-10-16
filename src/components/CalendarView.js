import React, {useState, useEffect} from 'react';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
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
function CalendarView() {
    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentShift, setCurrentShift] = useState(null);
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedEmployeeStoreId, setSelectedEmployeeStoreId] = useState(null);
    const storeColors = useStoreColors();
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
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [weekStart]);

    const fetchEmployees = async () => {
        const querySnapshot = await getDocs(collection(db, 'employees'));
        const employeeList = querySnapshot
            .docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        setEmployees(employeeList);
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
        <div className="flex flex-col h-screen">
            <div className="flex justify-between items-center p-4">
                <select
                    value={selectedStore || ''}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="p-2 border rounded">
                    <option value="">All Stores</option>
                    {
                        stores.map(
                            store => (<option key={store.id} value={store.id}>{store.name}</option>)
                        )
                    }
                </select>
            </div>
            {
                selectedStore
                    ? (
                        <StoreCalendarView
                            storeId={selectedStore}
                            employees={employees}
                            stores={stores}
                            onShiftUpdate={fetchShifts}/>
                    )
                    : (

                        <div className="flex flex-col h-screen">

                            <div className="flex flex-1 overflow-hidden ">
                            <div className="w-1/4 p-4 border-r overflow-y-auto">
  <Legend stores={stores} title="Stores" />
  <div className="mt-6">
    <h2 className="text-xl font-bold mb-4">Employees</h2>
    <div className="grid grid-cols-4 gap-2 font-bold text-sm mb-2">
      <div className="col-span-2">Name</div>
      <div className="text-right">Hours</div>
      <div className="text-right">Earnings</div>
    </div>
    <ul className="space-y-2">
      {employees.map(employee => {
        const { hours, earnings } = calculateTotalHoursAndEarnings(employee.id);
        return (
          <li
            key={employee.id}
            className="grid grid-cols-4 gap-2 p-2 cursor-pointer rounded "
            onClick={() => setSelectedEmployee(employee)}
          >
            <div className="col-span-2 truncate">{employee.name}</div>
            <div className="text-right">{hours.toFixed(2)}</div>
            <div className="text-right">${earnings.toFixed(2)}</div>
          </li>
        );
      })}
    </ul>
  </div>
</div>

                                <div className="w-3/4 p-4 overflow-x-auto">
                                    <div className="flex justify-between items-center p-4">
                                        <button
                                            onClick={handlePreviousWeek}
                                            className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
                                        <h2 className="text-xl font-bold">{format(weekStart, 'MMMM d, yyyy')}
                                            - {format(endOfWeek(weekStart), 'MMMM d, yyyy')}</h2>
                                        <button
                                            onClick={handleNextWeek}
                                            className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
                                    </div>
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border p-2">Employee</th>
                                                {days.map(day => (<th key={day} className="border p-2">{day}</th>))}
                                                <th className="border p-2">Total Hours</th>
                                                <th className="border p-2">Total Earnings</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                employees.map(employee => {
                                                    const {hours, earnings} = calculateTotalHoursAndEarnings(employee.id);
                                                    return (
                                                        <tr key={employee.id}>
                                                            <td className="border p-2">{employee.name}</td>
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
                                                                        <td
                                                                            key={day}
                                                                            className={`border p-2 cursor-pointer ${shift
                                                                                ? storeColors[shift.store_id] || ''
                                                                                : ''}`}
                                                                            onClick={() => handleCellClick(employee, day)}>
                                                                            {
                                                                                shift
                                                                                    ? `${formatTime12Hour(shift.start_time)} - ${formatTime12Hour(shift.end_time)}`
                                                                                    : ''
                                                                            }
                                                                        </td>
                                                                    );
                                                                })
                                                            }
                                                            <td className="border p-2">{hours.toFixed(2)}</td>
                                                            <td className="border p-2">${earnings.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {
                                showModal && (
                                    <ShiftModal shift={currentShift} onSave={handleSaveShift} onDelete={handleDeleteShift} onClose={() => setShowModal(false)} stores={stores} employeeStoreId={selectedEmployeeStoreId}
                                        // Pass the employee's store_id
/>
                                )
                            }
                            </div>

                    )
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