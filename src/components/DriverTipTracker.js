import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, addDays } from 'date-fns';

function TipEditModal({ editingTip, platforms,onSave, onCancel, onDelete }) {
  const [tipData, setTipData] = useState(editingTip.tips || []);

  const handleTipChange = (platform, amount) => {
    const newTipData = tipData.map(tip => 
      tip.platform === platform ? { ...tip, amount: parseFloat(amount) || 0 } : tip
    );
    if (!newTipData.find(tip => tip.platform === platform)) {
      newTipData.push({ platform, amount: parseFloat(amount) || 0 });
    }
    setTipData(newTipData);
  };

  const handleSave = () => {
    const total = tipData.reduce((sum, tip) => sum + (tip.amount || 0), 0);
    onSave({
      ...editingTip,
      tips: tipData,
      total,
      adjustedTotal: total * 0.9
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold mb-4">Edit Tips for {format(new Date(editingTip.date), 'MMM dd, yyyy')}</h3>
        {platforms.map(platform => (
          <div key={platform.id} className="mb-4">
            <label className="block mb-2">{platform.name}:</label>
            <input
              type="number"
              value={tipData.find(tip => tip.platform === platform.name)?.amount || ''}
              onChange={(e) => handleTipChange(platform.name, e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        ))}
        <div className="flex justify-between">
        <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">
            Save
          </button>
          {editingTip.id && (
            <button onClick={onDelete} className="bg-red-500 text-white px-4 py-2 rounded">
              Delete
            </button>
          )}
          <button onClick={onCancel} className="bg-gray-300 px-4 py-2 rounded">
            Cancel
          </button>

        </div>
      </div>
    </div>
  );
}

function DriverTipsTracker() {
  const [drivers, setDrivers] = useState([]);
  const [tips, setTips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [platforms, setPlatforms] = useState([]);
  const [editingTip, setEditingTip] = useState(null);

  useEffect(() => {
    fetchDrivers();
    fetchTips();
    fetchPlatforms();
  }, [selectedDate]);

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
    return dayTip && dayTip.tips ? dayTip.tips : [];
  };

  const handleCellClick = (driverId, date) => {
    const existingTip = tips.find(tip => tip.driverId === driverId && tip.date === date);
    setEditingTip({
      driverId,
      date,
      tips: existingTip ? existingTip.tips : [],
      id: existingTip ? existingTip.id : null
    });
  };
  const handleFormSubmit = async (updatedTip) => {
    if (updatedTip.id) {
      // Update existing tip
      const tipRef = doc(db, 'driver_tips', updatedTip.id);
      await updateDoc(tipRef, {
        tips: updatedTip.tips,
        total: updatedTip.total,
        adjustedTotal: updatedTip.adjustedTotal
      });
    } else {
      // Add new tip
      await addDoc(collection(db, 'driver_tips'), {
        driverId: updatedTip.driverId,
        date: updatedTip.date,
        tips: updatedTip.tips,
        total: updatedTip.total,
        adjustedTotal: updatedTip.adjustedTotal
      });
    }
    fetchTips();
    setEditingTip(null);
  };
  
  const handleDeleteTip = async () => {
    if (editingTip.id && window.confirm('Are you sure you want to delete all tips for this day?')) {
      const tipRef = doc(db, 'driver_tips', editingTip.id);
      await deleteDoc(tipRef);
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
                {weekDays.map(day => {
                  const dayTips = getDayTips(driver.id, day);
                  const dayTotal = dayTips.reduce((sum, tip) => sum + (tip.amount || 0), 0);
                  return (
                    <td key={day} className="border p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleCellClick(driver.id, day)}>
                      ${dayTotal.toFixed(2)}
                    </td>
                  );
                })}
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
  <TipEditModal
    editingTip={editingTip}
    platforms={platforms}
    onSave={handleFormSubmit}
    onCancel={() => setEditingTip(null)}
    onDelete={handleDeleteTip}
  />
)}
    </div>
  );
}

export default DriverTipsTracker;