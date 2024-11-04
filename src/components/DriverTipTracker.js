import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where,getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, addDays } from 'date-fns';

function DriverTipsTracker() {
  const [drivers, setDrivers] = useState([]);
  const [tips, setTips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [platforms, setPlatforms] = useState([]);
  const [editingTip, setEditingTip] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  useEffect(() => {
    fetchDrivers();
    fetchTips();
    fetchPlatforms();
  }, [selectedDate]);

  // ... (keep all the fetch functions as they are)
  const fetchDrivers = async () => {
    const driversRef = collection(db, 'drivers');
    const querySnapshot = await getDocs(driversRef);
    setDrivers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };
  const fetchTips = async () => {
    const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const tipsRef = collection(db, 'driver_tips');
    const q = query(
      tipsRef,
      where("date", ">=", format(weekStart, 'yyyy-MM-dd')),
      where("date", "<=", format(weekEnd, 'yyyy-MM-dd'))
    );
    const querySnapshot = await getDocs(q);
    setTips(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };
  const fetchPlatforms = async () => {
    const platformsRef = collection(db, 'platforms');
    const querySnapshot = await getDocs(platformsRef);
    setPlatforms(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
  };
  
  const getDayTips = (driverId, date) => {
    const dayTip = tips.find(tip => tip.driverId === driverId && tip.date === date);
    return dayTip ? dayTip.platforms : [];
  };
  const handleCellClick = (driverId, date, platform) => {
    const existingTip = tips.find(tip => 
      tip.driverId === driverId && 
      tip.date === date && 
      tip.platforms.some(p => p.platform === platform)
    );

    setEditingTip({
      driverId,
      date,
      platform,
      amount: existingTip ? existingTip.platforms.find(p => p.platform === platform).amount : '',
      id: existingTip ? existingTip.id : null
    });
  };
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { driverId, date, platform, amount, id } = editingTip;
  
    if (id) {
      // Update existing tip
      const tipRef = doc(db, 'driver_tips', id);
      const tipDoc = await getDoc(tipRef);
      if (tipDoc.exists()) {
        const tipData = tipDoc.data();
        let updatedPlatforms = [...tipData.platforms];
        const existingPlatformIndex = updatedPlatforms.findIndex(p => p.platform === platform);
  
        if (existingPlatformIndex !== -1) {
          updatedPlatforms[existingPlatformIndex].amount = parseFloat(amount);
        } else {
          updatedPlatforms.push({ platform, amount: parseFloat(amount) });
        }
  
        const total = updatedPlatforms.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const adjustedTotal = total * 0.9;
  
        await updateDoc(tipRef, { 
          platforms: updatedPlatforms,
          total,
          adjustedTotal
        });
      }
    } else {
      // Add new tip
      await addDoc(collection(db, 'driver_tips'), {
        driverId,
        date,
        platforms: [{ platform, amount: parseFloat(amount) }],
        total: parseFloat(amount),
        adjustedTotal: parseFloat(amount) * 0.9
      });
    }
  
    fetchTips();
    setEditingTip(null);
  };
  
  const handleDeleteTip = async () => {
    if (editingTip.id && window.confirm('Are you sure you want to delete this tip?')) {
      const tipRef = doc(db, 'driver_tips', editingTip.id);
      const tipDoc = await getDoc(tipRef);
      if (tipDoc.exists()) {
        const tipData = tipDoc.data();
        const updatedPlatforms = tipData.platforms.filter(p => p.platform !== editingTip.platform);
  
        if (updatedPlatforms.length === 0) {
          // If no platforms left, delete the entire document
          await deleteDoc(tipRef);
        } else {
          // Update the document with the remaining platforms
          const total = updatedPlatforms.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const adjustedTotal = total * 0.9;
          await updateDoc(tipRef, {
            platforms: updatedPlatforms,
            total,
            adjustedTotal
          });
        }
      }
      fetchTips();
      setEditingTip(null);
    }
  };
  
  


  const weekDays = getWeekDays();

  return (
    <div className="max-w-full mx-auto p-4 overflow-x-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Driver Tips Tracker</h2>
      <div className="mb-6">
        <label className="block mb-2 text-lg">Week Starting:</label>
        <input
          type="date"
          value={format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>
      <table className="w-full border-collapse border">
      <thead>
          <tr>
            <th className="border p-2">Driver Name</th>
            {weekDays.map(day => (
              <th key={day} className="border p-2">{format(new Date(day), 'EEE')}</th>
            ))}
            <th className="border p-2">Totals</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(driver => {
            const driverTips = tips.filter(tip => tip.driverId === driver.id);
            const weekTotal = driverTips.reduce((sum, tip) => sum + tip.total, 0);
            const weekAdjustedTotal = driverTips.reduce((sum, tip) => sum + tip.adjustedTotal, 0);

            return (
              <tr key={driver.id}>
                <td className="border p-2 font-bold">{driver.name}</td>
                {weekDays.map(day => (
                  <td key={day} className="border p-2">
                    <table className="w-full">
                      <tbody>
                        {platforms.map(platform => {
                          const dayTips = getDayTips(driver.id, day);
                          const tipAmount = dayTips.find(t => t.platform === platform.name)?.amount || '';
                          return (
                            <tr key={platform.id}>
                              <td className="w-1/2">{platform.name}</td>
                              <td 
                                className="w-1/2 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleCellClick(driver.id, day, platform.name)}
                              >
                                ${!tipAmount? 0 : tipAmount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </td>
                ))}
                <td className="border p-2">
                  Total: ${weekTotal.toFixed(2)}<br/>
                  Adjusted: ${weekAdjustedTotal.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editingTip && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Edit Tip</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label className="block mb-2">Amount:</label>
                <input 
                  type="number" 
                  value={editingTip.amount} 
                  onChange={(e) => setEditingTip({...editingTip, amount: e.target.value})}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div className="flex justify-between">
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                  {editingTip.id ? 'Update' : 'Add'}
                </button>
                {editingTip.id && (
                  <button type="button" onClick={handleDeleteTip} className="bg-red-500 text-white px-4 py-2 rounded">
                    Delete
                  </button>
                )}
                <button type="button" onClick={() => setEditingTip(null)} className="bg-gray-300 px-4 py-2 rounded">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverTipsTracker;
