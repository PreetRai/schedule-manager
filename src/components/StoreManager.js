import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

function StoreManager() {
  const [stores, setStores] = useState([]);
  const [editingStore, setEditingStore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const defaultHours = days.reduce((acc, day) => {
    acc[day] = { open: '09:00', close: '17:00' };
    return acc;
  }, {});

  const [newStore, setNewStore] = useState({
    name: '',
    location: '',
    hours: defaultHours
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const storeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storeList);
    } catch (err) {
      setError("Failed to fetch stores. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingStore) {
      setEditingStore({ ...editingStore, [name]: value });
    } else {
      setNewStore({ ...newStore, [name]: value });
    }
  };

  const handleHoursChange = (day, type, value) => {
    if (editingStore) {
      setEditingStore({
        ...editingStore,
        hours: {
          ...editingStore.hours,
          [day]: { ...editingStore.hours[day], [type]: value }
        }
      });
    } else {
      setNewStore({
        ...newStore,
        hours: {
          ...newStore.hours,
          [day]: { ...newStore.hours[day], [type]: value }
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingStore) {
        await updateDoc(doc(db, 'stores', editingStore.id), editingStore);
      } else {
        await addDoc(collection(db, 'stores'), newStore);
      }
      fetchStores();
      setEditingStore(null);
      setNewStore({ name: '', location: '', hours: defaultHours });
    } catch (err) {
      setError("Failed to save store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (store) => {
    setEditingStore(store);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this store?")) {
      try {
        await deleteDoc(doc(db, 'stores', id));
        fetchStores();
      } catch (err) {
        setError("Failed to delete store. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 flex flex-col sm:py-12 ">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold mb-4">Store Manager</h1>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Store List */}
          <div className="w-full md:w-1/2 bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Current Stores</h2>
            {stores.length === 0 ? (
              <p>No stores found.</p>
            ) : (
              <ul className="space-y-2">
                {stores.map(store => (
                  <li key={store.id} className="flex justify-between items-center border-b pb-2">
                    <span>
                      {store.name} - {store.location}
                    </span>
                    <div>
                      <button onClick={() => handleEdit(store)} className="text-blue-500 mr-2">Edit</button>
                      <button onClick={() => handleDelete(store.id)} className="text-red-500">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add/Edit Store Form */}
          <div className="w-full md:w-1/2 bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{editingStore ? 'Edit Store' : 'Add Store'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                value={editingStore ? editingStore.name : newStore.name}
                onChange={handleInputChange}
                placeholder="Store Name"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <input
                type="text"
                name="location"
                value={editingStore ? editingStore.location : newStore.location}
                onChange={handleInputChange}
                placeholder="Store Location"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <div>
                <h3 className="text-lg font-semibold mb-2">Store Hours</h3>
                {days.map(day => (
                  <div key={day} className="flex flex-wrap items-center mb-2">
                    <span className="w-full sm:w-24 capitalize mb-1 sm:mb-0">{day}:</span>
                    <input
                      type="time"
                      value={editingStore ? editingStore.hours[day].open : newStore.hours[day].open}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      className="px-2 py-1 border rounded-md mr-2 mb-1 sm:mb-0"
                    />
                    <span className="mx-2">to</span>
                    <input
                      type="time"
                      value={editingStore ? editingStore.hours[day].close : newStore.hours[day].close}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      className="px-2 py-1 border rounded-md"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                {loading ? 'Processing...' : (editingStore ? 'Update Store' : 'Add Store')}
              </button>
              {editingStore && (
                <button 
                  type="button" 
                  onClick={() => setEditingStore(null)} 
                  className="w-full px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreManager;