import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

function DriverTipsTracker() {
  const [drivers, setDrivers] = useState([]);
  const [tips, setTips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [platformTips, setPlatformTips] = useState([{ platform: '', amount: '' }]);
  const [editingTipId, setEditingTipId] = useState(null);

  useEffect(() => {
    fetchDrivers();
    fetchTips();
  }, [selectedDate]);

  const fetchDrivers = async () => {
    const driversRef = collection(db, 'drivers');
    const querySnapshot = await getDocs(driversRef);
    setDrivers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchTips = async () => {
    const tipsRef = collection(db, 'driver_tips');
    const q = query(tipsRef, where("date", "==", selectedDate));
    const querySnapshot = await getDocs(q);
    setTips(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddOrUpdateTip = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) return;

    try {
      // Calculate the total of all platform tips
      const total = platformTips.reduce((sum, tip) => sum + parseFloat(tip.amount), 0);

      // Calculate the adjusted total (90% of the original total)
      const adjustedTotal = total * 0.9;

      const tipData = {
        driverId: selectedDriverId,
        platforms: platformTips,
        date: selectedDate,
        total: total, // Original total
        adjustedTotal: adjustedTotal // Total after 10% deduction
      };

      if (editingTipId) {
        // Update existing tip
        const tipRef = doc(db, 'driver_tips', editingTipId);
        await updateDoc(tipRef, tipData);
      } else {
        // Add new tip
        await addDoc(collection(db, 'driver_tips'), tipData);
      }
      resetForm();
      fetchTips();
    } catch (error) {
      console.error("Error adding/updating tip:", error);
    }
  };

  const handleDeleteTip = async (tipId) => {
    if (window.confirm('Are you sure you want to delete this tip?')) {
      try {
        const tipRef = doc(db, 'driver_tips', tipId);
        await deleteDoc(tipRef);
        fetchTips();
      } catch (error) {
        console.error("Error deleting tip:", error);
      }
    }
  };

  const resetForm = () => {
    setSelectedDriverId('');
    setPlatformTips([{ platform: '', amount: '' }]);
    setEditingTipId(null);
  };

  const restructureTips = (tips) => {
    const structuredTips = {};
    tips.forEach(tip => {
      if (!structuredTips[tip.driverId]) {
        structuredTips[tip.driverId] = { platforms: {}, total: tip.total, adjustedTotal: tip.adjustedTotal };
      }
      tip.platforms.forEach(platform => {
        if (!structuredTips[tip.driverId].platforms[platform.platform]) {
          structuredTips[tip.driverId].platforms[platform.platform] = [];
        }
        structuredTips[tip.driverId].platforms[platform.platform].push(platform.amount);
      });
    });
    return structuredTips;
  };

  const formatTipsForDisplay = (structuredTips) => {
    return Object.entries(structuredTips).map(([driverId, data]) => {
      const driverName = drivers.find(driver => driver.id === driverId)?.name || 'Unknown Driver';
      const platformNames = Object.keys(data.platforms);
      const amounts = platformNames.map(platform => data.platforms[platform].join(', '));
      return {
        driverId,
        driverName,
        platformNames,
        amounts,
        total: data.total,
        adjustedTotal: data.adjustedTotal
      };
    });
  };

  const structuredTips = restructureTips(tips);
  const formattedData = formatTipsForDisplay(structuredTips);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Driver Tips Tracker</h2>
      <div className="mb-6">
        <label className="block mb-2 text-lg">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>
      <form onSubmit={handleAddOrUpdateTip} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">Select Driver</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPlatformTips([...platformTips, { platform: '', amount: '' }])}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
          >
            Add Platform
          </button>
        </div>
        {platformTips.map((tip, index) => (
          <div key={index} className="flex flex-col md:flex-row mb-4">
            <input
              type="text"
              placeholder="Platform"
              value={tip.platform}
              onChange={(e) => {
                const newPlatformTips = [...platformTips];
                newPlatformTips[index].platform = e.target.value;
                setPlatformTips(newPlatformTips);
              }}
              className="flex-1 border p-2 rounded mb-2 md:mb-0 md:mr-2"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={tip.amount}
              onChange={(e) => {
                const newPlatformTips = [...platformTips];
                newPlatformTips[index].amount = e.target.value;
                setPlatformTips(newPlatformTips);
              }}
              className="flex-1 border p-2 rounded mb-2 md:mb-0 md:mr-2"
              required
            />
            {platformTips.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const newPlatformTips = platformTips.filter((_, i) => i !== index);
                  setPlatformTips(newPlatformTips);
                }}
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded text-lg hover:bg-blue-600 transition">
          {editingTipId ? 'Update Tips' : 'Add Tips'}
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400">
          <tbody>
            {formattedData.map(({ driverId, driverName, platformNames, amounts, total, adjustedTotal }) => (
              <React.Fragment key={driverId}>
                <tr className="bg-gray-100">
                  <td colSpan={platformNames.length + 1} className="border border-gray-400 p-3 text-center font-bold text-lg">
                    {driverName}
                  </td>
                </tr>
                <tr>
                  {platformNames.map((platform, index) => (
                    <td key={index} className="border border-gray-400 p-2 text-center">{platform}</td>
                  ))}
                  <td className="border border-gray-400 p-2 text-center font-semibold">Total</td>
                </tr>
                <tr>
                  {amounts.map((amount, index) => (
                    <td key={index} className="border border-gray-400 p-2 text-center">${parseFloat(amount).toFixed(2)}</td>
                  ))}
                  <td className="border border-gray-400 p-2 text-center font-bold">
                    <div>Original: ${parseFloat(total).toFixed(2)}</div>
                    <div>Adjusted: ${parseFloat(adjustedTotal).toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={platformNames.length + 1} className="border border-gray-400 p-2 text-center">
                    <button
                      onClick={() => {
                        const tip = tips.find(t => t.driverId === driverId);
                        if (tip) {
                          setEditingTipId(tip.id);
                          setSelectedDriverId(tip.driverId);
                          setPlatformTips(tip.platforms);
                        }
                      }}
                      className="bg-yellow-500 text-white p-2 rounded mr-2 hover:bg-yellow-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const tip = tips.find(t => t.driverId === driverId);
                        if (tip) handleDeleteTip(tip.id);
                      }}
                      className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DriverTipsTracker;