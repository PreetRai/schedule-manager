import React, { useState, useEffect,useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfWeek, addDays } from 'date-fns';
function TipEditModal({ editingTip, platforms, onSave, onCancel, onDelete }) {
  const [tipData, setTipData] = useState(editingTip.tips || {});
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const inputRefs = useRef({});

  useEffect(() => {
    if (inputRefs.current[0] && inputRefs.current[0][0]) {
      inputRefs.current[0][0].focus();
    }
  }, []);

  const handleTipChange = (platform, row, amount) => {
    const newTipData = { ...tipData };
    if (!newTipData[platform]) {
      newTipData[platform] = new Array(20).fill(0);
    }
    newTipData[platform][row] = parseFloat(amount) || 0;
    setTipData(newTipData);
  };

  const handleKeyDown = (e, row, col) => {
    const maxRow = 19;
    const maxCol = platforms.length - 1;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCell(prev => ({ row: Math.max(0, prev.row - 1), col }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedCell(prev => ({ row: Math.min(maxRow, prev.row + 1), col }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedCell(prev => ({ row, col: Math.max(0, prev.col - 1) }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setFocusedCell(prev => ({ row, col: Math.min(maxCol, prev.col + 1) }));
        break;
      case 'Tab':
        e.preventDefault();
        if (!e.shiftKey) {
          if (col === maxCol) {
            setFocusedCell({ row: row === maxRow ? 0 : row + 1, col: 0 });
          } else {
            setFocusedCell({ row, col: col + 1 });
          }
        } else {
          if (col === 0) {
            setFocusedCell({ row: row === 0 ? maxRow : row - 1, col: maxCol });
          } else {
            setFocusedCell({ row, col: col - 1 });
          }
        }
        break;
    }
  };

  useEffect(() => {
    if (inputRefs.current[focusedCell.row] && inputRefs.current[focusedCell.row][focusedCell.col]) {
      inputRefs.current[focusedCell.row][focusedCell.col].focus();
    }
  }, [focusedCell]);

  const handleSave = () => {
    const total = Object.values(tipData).reduce((sum, platformTips) => 
      sum + platformTips.reduce((platformSum, tip) => platformSum + (tip || 0), 0), 0);
    onSave({
      ...editingTip,
      tips: tipData,
      total,
      adjustedTotal: total * 0.9
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white rounded-md shadow-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold mb-2">Edit Tips: {format(new Date(editingTip.date), 'MMM dd, yyyy')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr>
                <th className="border p-1">Row</th>
                {platforms.map(platform => (
                  <th key={platform.id} className="border p-1">{platform.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(20)].map((_, row) => (
                <tr key={row}>
                  <td className="border p-1 font-bold">{row + 1}</td>
                  {platforms.map((platform, col) => (
                    <td key={platform.id} className="border p-1">
                      <input
                        type="number"
                        value={tipData[platform.name]?.[row] || ''}
                        onChange={(e) => handleTipChange(platform.name, row, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row, col)}
                        ref={el => {
                          if (!inputRefs.current[row]) inputRefs.current[row] = {};
                          inputRefs.current[row][col] = el;
                        }}
                        className="w-full p-0.5 text-sm"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-sm">
          <p>Total: ${Object.values(tipData).reduce((sum, platformTips) => 
            sum + platformTips.reduce((platformSum, tip) => platformSum + (tip || 0), 0), 0).toFixed(2)}</p>
          <p>Adjusted: ${(Object.values(tipData).reduce((sum, platformTips) => 
            sum + platformTips.reduce((platformSum, tip) => platformSum + (tip || 0), 0), 0) * 0.9).toFixed(2)}</p>
        </div>
        <div className="flex justify-between mt-2">
          <button onClick={handleSave} className="bg-blue-500 text-white px-2 py-1 rounded text-sm">Save</button>
          {editingTip.id && (
            <button onClick={onDelete} className="bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button>
          )}
          <button onClick={onCancel} className="bg-gray-300 px-2 py-1 rounded text-sm">Cancel</button>
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
    return dayTip && dayTip.tips ? dayTip.tips : {};
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
  const dayTotal = Object.values(dayTips).reduce((sum, platformTips) => 
    sum + platformTips.reduce((platformSum, tip) => platformSum + (tip || 0), 0), 0);
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