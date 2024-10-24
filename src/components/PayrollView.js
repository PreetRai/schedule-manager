import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

function PayrollView() {
  const [employees, setEmployees] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [payrollData, setPayrollData] = useState({});

  useEffect(() => {
    fetchData();
  }, [currentWeek, selectedStore]);

  const fetchData = async () => {
    await Promise.all([
      fetchEmployees(),
      fetchDrivers(),
      fetchManagers(),
      fetchShifts(),
      fetchStores(),
      fetchPayrollData()
    ]);
  };

  const fetchEmployees = async () => {
    let employeesRef = collection(db, 'employees');
    if (selectedStore) {
      employeesRef = query(employeesRef, where('store_id', '==', selectedStore));
    }
    const querySnapshot = await getDocs(employeesRef);
    setEmployees(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchDrivers = async () => {
    let driversRef = collection(db, 'drivers');
    if (selectedStore) {
      driversRef = query(driversRef, where('store_id', '==', selectedStore));
    }
    const querySnapshot = await getDocs(driversRef);
    setDrivers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchManagers = async () => {
    let managersRef = collection(db, 'managers');
    if (selectedStore) {
      managersRef = query(managersRef, where('store_id', '==', selectedStore));
    }
    const querySnapshot = await getDocs(managersRef);
    setManagers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchShifts = async () => {
    const start = format(currentWeek, 'yyyy-MM-dd');
    const end = format(endOfWeek(currentWeek), 'yyyy-MM-dd');
    let shiftsQuery = collection(db, 'shifts');

    if (selectedStore) {
      shiftsQuery = query(shiftsQuery, where('store_id', '==', selectedStore));
    }

    shiftsQuery = query(shiftsQuery,
      where('date', '>=', start),
      where('date', '<=', end)
    );

    const querySnapshot = await getDocs(shiftsQuery);
    setShifts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchStores = async () => {
    const querySnapshot = await getDocs(collection(db, 'stores'));
    setStores(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Fetch payroll data
  const fetchPayrollData = async () => {
    const payrollRef = collection(db, 'weekly_pay');
    const q = query(payrollRef,
      where('week_start', '==', format(currentWeek, 'yyyy-MM-dd')),
      where('store_id', '==', selectedStore || '')
    );
    
    const querySnapshot = await getDocs(q);
    
    // Convert Firestore documents to state
    let dataMap = {};
    
    querySnapshot.forEach(doc => {
      dataMap[doc.id] = { ...doc.data(), id: doc.id };
    });
    
    setPayrollData(dataMap);
  };

  // Save or update payroll entry
  const savePayrollEntry = async (personId) => {
    let entryId;
    
    // Check if entry already exists
    for (let key in payrollData) {
      if (payrollData[key].person_id === personId) {
        entryId = key;
        break;
      }
    }
    
    // Prepare data
    const { totalHours, totalEarnings } = calculateTotalHoursAndEarnings(personId);
    
    let tipsAndDeductibles = payrollData[entryId]?.tipsAndDeductibles || {};
    
    let tips = tipsAndDeductibles.tips || 0;
    
    let deductibles = tipsAndDeductibles.deductibles || 0;
    
    let finalEarnings = totalEarnings + tips - deductibles;
    
    let payload = {
      person_id: personId,
      store_id: selectedStore || '',
      week_start: format(currentWeek, 'yyyy-MM-dd'),
      total_hours: totalHours,
      total_earnings: totalEarnings,
      tips_and_deductibles: tipsAndDeductibles,
      final_earnings: finalEarnings
    };
    
     try {
       if (entryId) {
         // Update existing entry
         await updateDoc(doc(db, 'weekly_pay', entryId), payload);
       } else {
         // Add new entry
         await addDoc(collection(db,'weekly_pay'), payload);
       }
       
       // Refresh data
       fetchPayrollData();
     } catch (error) {
       console.error("Error saving payroll entry:", error);
     }
   };

   // Handle tips and deductibles
   const handleInputChange =(id,type)=>(e)=>{ 
     let value=parseFloat(e.target.value)||0; 
     
     setPayrollData(prev=>({ 
       ...prev,
       [id]:{
         ...prev[id],
         tipsAndDeductibles:{
           ...prev[id]?.tipsAndDeductibles,
           [type]:value 
         }
       }
     }));
   };

   const calculateTotalHoursAndEarnings = (personId) => {
    let totalHours = 0;
    let totalEarnings = 0;

    shifts.forEach(shift => {
      if (shift.employee_id === personId || shift.driver_id === personId || shift.manager_id === personId) {
        const startTime = new Date(`1970-01-01T${shift.start_time}:00`);
        const endTime = new Date(`1970-01-01T${shift.end_time}:00`);
        const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
        totalHours += hoursWorked;

        let payRate =
          employees.find(e => e.id === personId)?.pay ||
          drivers.find(d => d.id === personId)?.pay ||
          managers.find(m => m.id === personId)?.pay ||
          0;

        totalEarnings += hoursWorked * payRate;
      }
    });

    return { totalHours, totalEarnings };
  };
   return (
    <div className="payroll-view p-4">
    <h1 className="text-2xl font-bold mb-4">Weekly Payroll</h1>
    
    <div className="flex justify-between items-center mb-6">
      <select
        value={selectedStore}
        onChange={(e) => setSelectedStore(e.target.value)}
        className="shadow rounded p-2 border"
      >
        <option value="">All Stores</option>
        {stores.map(store => (
          <option key={store.id} value={store.id}>{store.name}</option>
        ))}
      </select>

      <div className="flex gap-2">
        <button onClick={() => setCurrentWeek(addWeeks(currentWeek,-1))} className="bg-blue-500 text-white px-4 py-2 rounded">Previous Week</button>
        <button onClick={() => setCurrentWeek(addWeeks(currentWeek,+1))} className="bg-blue-500 text-white px-4 py-2 rounded">Next Week</button>
      </div>
    </div>

    <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tips</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductibles</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Earnings</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {[...employees,...drivers,...managers].map(person=>{
          const{totalHours,totalEarnings}=calculateTotalHoursAndEarnings(person.id);
          
          let tips=payrollData[person.id]?.tipsAndDeductibles?.tips||0;
          
          let deductibles=payrollData[person.id]?.tipsAndDeductibles?.deductibles||0;
          
          let finalEarnings=totalEarnings+tips-deductibles;

          return(
            <tr key={person.id}>
              <td className="px-6 py-4 whitespace-nowrap">{person.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{totalHours.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap">${totalEarnings.toFixed(2)}</td>

              {/* Tips and Deductibles */}
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={tips}
                  onChange={handleInputChange(person.id,'tips')}
                  onBlur={()=>savePayrollEntry(person.id)}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={deductibles}
                  onChange={handleInputChange(person.id,'deductibles')}
                  onBlur={()=>savePayrollEntry(person.id)}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
              </td>

              {/* Final Earnings */}
              <td className="px-6 py-4 whitespace-nowrap font-bold">${finalEarnings.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

    <p>Showing payroll for week starting:{format(currentWeek,'MMMM d,y')}</p>
    
  </div>
   );
}

export default PayrollView;