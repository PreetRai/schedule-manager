import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

function StoreManager() {
  const [stores, setStores] = useState([]);
  const [newStore, setNewStore] = useState({
    name: '',
    location: '',
    hours: {
      monday: { open: '', close: '' },
      tuesday: { open: '', close: '' },
      wednesday: { open: '', close: '' },
      thursday: { open: '', close: '' },
      friday: { open: '', close: '' },
      saturday: { open: '', close: '' },
      sunday: { open: '', close: '' },
    }
  });
  const [editingStore, setEditingStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const storeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storeList);
    } catch (err) {
      setError('An error occurred while fetching stores. Please try again.');
      console.error('Error fetching stores:', err);
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
  
    const storeData = editingStore || newStore;
  
    // Validation
    if (!storeData.name.trim() || !storeData.location.trim()) {
      setError('Store name and location are required.');
      setLoading(false);
      return;
    }
  
    try {
      if (editingStore) {
        await updateDoc(doc(db, 'stores', editingStore.id), editingStore);
        setEditingStore(null);
      } else {
        await addDoc(collection(db, 'stores'), newStore);
        setNewStore({
          name: '',
          location: '',
          hours: {
            monday: { open: '', close: '' },
            tuesday: { open: '', close: '' },
            wednesday: { open: '', close: '' },
            thursday: { open: '', close: '' },
            friday: { open: '', close: '' },
            saturday: { open: '', close: '' },
            sunday: { open: '', close: '' },
          }
        });
      }
      await fetchStores();
    } catch (err) {
      setError('An error occurred while saving the store. Please try again.');
      console.error('Error saving store:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (store) => {
    setEditingStore(store);
  };

  const handleDelete = async (id) => {
    const deleteConfirm = window.confirm("Are you sure you want to delete this store? This action cannot be undone.");
    if (deleteConfirm) {
      setLoading(true);
      setError(null);
      try {
        await deleteDoc(doc(db, 'stores', id));
        await fetchStores();
      } catch (err) {
        setError('An error occurred while deleting the store. Please try again.');
        console.error('Error deleting store:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <h1 className="text-2xl font-semibold mb-4">Store Manager</h1>
          {error && <div className="mb-4 text-red-600">{error}</div>}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Current Stores</h2>
            {stores.length === 0 ? (
              <p>No stores found.</p>
            ) : (
              <ul>
                {stores.map(store => (
                  <li key={store.id} className="mb-2 flex justify-between items-center">
                    <span>
                      Name: {store.name} | Location: {store.location}
                    </span>
                    <div>
                      <button onClick={() => handleEdit(store)} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Edit</button>
                      <button onClick={() => handleDelete(store.id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="name"
                value={editingStore ? editingStore.name : newStore.name}
                onChange={handleInputChange}
                placeholder="Store Name"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <input
                type="text"
                name="location"
                value={editingStore ? editingStore.location : newStore.location}
                onChange={handleInputChange}
                placeholder="Store Location"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Store Hours</h3>
              {days.map(day => (
                <div key={day} className="flex items-center mb-2">
                  <span className="w-24 capitalize">{day}:</span>
                  <input
                    type="time"
                    value={editingStore ? editingStore.hours[day].open : newStore.hours[day].open}
                    onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                    className="px-2 py-1 border rounded-md mr-2"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={editingStore ? editingStore.hours[day].close : newStore.hours[day].close}
                    onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                    className="px-2 py-1 border rounded-md ml-2"
                  />
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
              {loading ? 'Processing...' : (editingStore ? 'Update Store' : 'Add Store')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StoreManager;