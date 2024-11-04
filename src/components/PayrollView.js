import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
function PayrollView() {
  
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [payrollData, setPayrollData] = useState({});
  const [activeTable, setActiveTable] = useState('employees');
  useEffect(() => {
    fetchManagerStores();
  }, [currentUser]);

  useEffect(() => {
    if (selectedStore) {
      fetchData();
    }
  }, [currentWeek, selectedStore]);
  const ToggleButton = ({ activeTable, setActiveTable }) => (
    <div className="flex justify-center mb-4">
      <button
        className={`px-4 py-2 rounded-l-lg ${activeTable === 'employees' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => setActiveTable('employees')}
      >
        Employees
      </button>
      <button
        className={`px-4 py-2 rounded-r-lg ${activeTable === 'drivers' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => setActiveTable('drivers')}
      >
        Drivers
      </button>
    </div>
  );
  const fetchManagerStores = async () => {
    if (currentUser.role !== 'manager') {
      console.error('Current user is not a manager');
      return;
    }
  
    const managerStoresRef = collection(db, 'managers');
    const q = query(managerStoresRef, where('id', '==', currentUser.id));
    const querySnapshot = await getDocs(q);
    
    const storeIds = querySnapshot.docs.map(doc => doc.data().store_id);
    
    if (storeIds.length === 0) {
      setStores([]);
      return;
    }
    
    const storesRef = collection(db, 'stores');
    const storesQuery = query(storesRef, where('__name__', 'in', storeIds));
    const storesSnapshot = await getDocs(storesQuery);
    
    const fetchedStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(fetchedStores)
    setStores(fetchedStores);
  
    if (fetchedStores.length === 1) {
      setSelectedStore(fetchedStores[0].id);
    }
  };
  const fetchData = useCallback(async () => {
    if (!selectedStore) return;

    const start = format(currentWeek, 'yyyy-MM-dd');
    const end = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const [employeesSnapshot, driversSnapshot, managersSnapshot, shiftsSnapshot, driverShiftsSnapshot, payrollSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'employees'), where('store_id', '==', selectedStore))),
      getDocs(query(collection(db, 'drivers'), where('store_id', '==', selectedStore))),
      getDocs(query(collection(db, 'managers'), where('store_id', '==', selectedStore))),
      getDocs(query(collection(db, 'shifts'), 
        where('store_id', '==', selectedStore),
        where('date', '>=', start),
        where('date', '<=', end)
      )),
      getDocs(query(collection(db, 'driver_shifts'), 
        where('store_id', '==', selectedStore),
        where('date', '>=', start),
        where('date', '<=', end)
      )),
      getDocs(query(collection(db, 'weekly_pay'),
        where('week_start', '==', start),
        where('store_id', '==', selectedStore)
      ))
    ]);

    setEmployees(employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setDrivers(driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setManagers(managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    const allShifts = [
      ...shiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'employee' })),
      ...driverShiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'driver' }))
    ];
    setShifts(allShifts);

    const payrollDataMap = {};
    payrollSnapshot.forEach(doc => {
      payrollDataMap[doc.data().person_id] = { ...doc.data(), id: doc.id };
    });
    setPayrollData(payrollDataMap);
  }, [selectedStore, currentWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchStores = async () => {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const fetchedStores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(fetchedStores);
      
      if (!selectedStore && fetchedStores.length > 0) {
        setSelectedStore(fetchedStores[0].id);
      }
    };
    fetchStores();
  }, []);

  const savePayrollEntry = async (personId, status) => {
    const { totalHours, totalEarnings } = calculateTotalHoursAndEarnings(personId);
    
    let tipsAndDeductibles = payrollData[personId]?.tips_and_deductibles || {};
    let tips = tipsAndDeductibles.tips || 0;
    let deductibles = tipsAndDeductibles.deductibles || 0;
    let finalEarnings = totalEarnings + tips - deductibles;
    
    let payload = {
      person_id: personId,
      store_id: selectedStore,
      week_start: format(currentWeek, 'yyyy-MM-dd'),
      total_hours: totalHours,
      total_earnings: totalEarnings,
      tips_and_deductibles: tipsAndDeductibles,
      final_earnings: finalEarnings,
      status: status
    };
    
    try {
      if (payrollData[personId]?.id) {
        await updateDoc(doc(db, 'weekly_pay', payrollData[personId].id), payload);
      } else {
        await addDoc(collection(db, 'weekly_pay'), payload);
      }
      
      setPayrollData(prev => ({
        ...prev,
        [personId]: { ...payload, id: payrollData[personId]?.id }
      }));
    } catch (error) {
      console.error("Error saving payroll entry:", error);
    }
  };

  const handleInputChange = (personId, type) => (e) => {
    let value = parseFloat(e.target.value) || 0;
    
    setPayrollData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        tips_and_deductibles: {
          ...prev[personId]?.tips_and_deductibles,
          [type]: value
        }
      }
    }));
  };

  const toggleStatus = async (personId) => {
    const newStatus = payrollData[personId]?.status === "Ready" ? "Not Ready" : "Ready";
    await savePayrollEntry(personId, newStatus);
  };
  const calculateTotalHoursAndEarnings = (personId) => {
    let totalHours = 0;
    let totalEarnings = 0;
  
    shifts.forEach(shift => {
      if (shift.type === 'employee' && (shift.employee_id === personId || shift.manager_id === personId)) {
        // Handle employee and manager shifts
        const startTime = new Date(`1970-01-01T${shift.start_time}:00`);
        const endTime = new Date(`1970-01-01T${shift.end_time}:00`);
        const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
        totalHours += hoursWorked;
  
        let payRate =
          employees.find(e => e.id === personId)?.pay ||
          managers.find(m => m.id === personId)?.pay ||
          0;
  
        totalEarnings += hoursWorked * payRate;
      } else if (shift.type === 'driver' && shift.driver_id === personId) {
        // Handle driver shifts
        const startTime = new Date(`1970-01-01T${shift.start_time}:00`);
        const endTime = new Date(`1970-01-01T${shift.end_time}:00`);
        const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
        totalHours += hoursWorked;
  
        let payRate = drivers.find(d => d.id === personId)?.pay || 0;
  
        totalEarnings += hoursWorked * payRate;
      }
    });
  
    return { totalHours, totalEarnings };
  };
  
  return (
    <div className="payroll-view p-4">
    <h1 className="text-2xl font-bold mb-4">Weekly Payroll</h1>
    <div className="flex justify-between items-center mb-6">
      {stores.length > 1 ? (
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="shadow rounded p-2 border"
        >
          <option value="">Select a Store</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
      ) : (
        <h2 className="text-xl">{stores[0]?.name}</h2>
      )}
      <div className="flex gap-2 items-center">
      
  
        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))} className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
        <h2 className="text-x1 font-bold text-center">{format(currentWeek,'MMMM d, y')}</h2>
        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
      </div>
    </div>
    
      <div className='flex flex-col gap-5'> 
        <ToggleButton activeTable={activeTable} setActiveTable={setActiveTable} />
        {activeTable === 'employees' && (  <div>
        <h2 className='m-4 text-xl font-bold text-center'>Employees</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tips</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deduct.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">   
              {[...employees, ...managers].map(person => {
                const { totalHours, totalEarnings } = calculateTotalHoursAndEarnings(person.id);
                let tips = payrollData[person.id]?.tips_and_deductibles?.tips || 0;
                let deductibles = payrollData[person.id]?.tips_and_deductibles?.deductibles || 0;
                let finalEarnings = totalEarnings + tips - deductibles;

                return (
                  <tr key={person.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{person.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{totalHours.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">${totalEarnings.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        value={tips}
                        onChange={handleInputChange(person.id, 'tips')}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        value={deductibles}
                        onChange={handleInputChange(person.id, 'deductibles')}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-bold">${finalEarnings.toFixed(2)}</td>
                    <td className={`px-4 py-2 whitespace-nowrap font-bold ${payrollData[person.id]?.status === "Ready" ? "text-green-600" : "text-red-600"}`}>
                      {payrollData[person.id]?.status || "Not Ready"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button 
                        onClick={() => toggleStatus(person.id)}
                        className={`${
                          payrollData[person.id]?.status === "Ready" 
                            ? "bg-red-500 hover:bg-red-600" 
                            : "bg-green-500 hover:bg-green-600"
                        } text-white px-2 py-1 rounded text-sm focus:outline-none focus:shadow-outline`}
                      >
                        {payrollData[person.id]?.status === "Ready" ? "Unmark" : "Mark"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>)}
        {activeTable === 'drivers' && (
        <div>
        <h2 className='m-4 text-xl font-bold text-center'>Drivers</h2>
        <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tips</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductibles</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Earnings</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">   
          {[...drivers].map(person => {
            const { totalHours, totalEarnings } = calculateTotalHoursAndEarnings(person.id);
            
            let tips = payrollData[person.id]?.tips_and_deductibles?.tips || 0;
            let deductibles = payrollData[person.id]?.tips_and_deductibles?.deductibles || 0;
            
            let finalEarnings = totalEarnings + tips - deductibles;

            return (
              <tr key={person.id}>
                <td className="px-6 py-4 whitespace-nowrap">{person.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{totalHours.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">${totalEarnings.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    value={tips}
                    onChange={handleInputChange(person.id, 'tips')}
                    className="w-full border-gray-300 rounded-md shadow-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    value={deductibles}
                    onChange={handleInputChange(person.id, 'deductibles')}
                    className="w-full border-gray-300 rounded-md shadow-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold">${finalEarnings.toFixed(2)}</td>
                <td className={`px-6 py-4 whitespace-nowrap font-bold ${payrollData[person.id]?.status === "Ready" ? "text-green-600" : "text-red-600"}`}>
                  {payrollData[person.id]?.status || "Not Ready"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => toggleStatus(person.id)}
                    className={`bg-${payrollData[person.id]?.status === "Ready" ? "red" : "green"}-500 hover:bg-${payrollData[person.id]?.status === "Ready" ? "red" : "green"}-600 
                    text-white px-4 py-2 rounded focus:outline-none focus:shadow-outline`}
                  >
                    {payrollData[person.id]?.status === "Ready" ? "Mark Not Ready" : "Mark Ready"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
        </div>
        </div>)}
      </div>
    </div>
  );
}

export default PayrollView;
