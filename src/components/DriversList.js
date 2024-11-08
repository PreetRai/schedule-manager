import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, where, query } from 'firebase/firestore';
import { getAuth,  sendPasswordResetEmail } from 'firebase/auth';
import { db } from '../firebase';

function DriverList() {
  const [drivers, setDrivers] = useState([]);
  const [stores, setStores] = useState([]);
  const [newDriver, setNewDriver] = useState({
    claimed: false,
    name: '',
    email: '',
    phone: '',
    role: 'driver',
    pay: 0,
    store_id: ''
  });
  const [editingDriver, setEditingDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    fetchDrivers();
    fetchStores();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'drivers'));
      const driverList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driverList);
    } catch (err) {
      setError("Failed to fetch drivers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const storeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storeList);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError("Failed to fetch stores. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingDriver) {
      setEditingDriver({ ...editingDriver, [name]: value });
    } else {
      setNewDriver({ ...newDriver, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    const driverData = editingDriver || newDriver;

    if (!driverData.name || !driverData.role || !driverData.store_id || !driverData.email) {
      setError("Please fill in name, email, role, and store.");
      return;
    }

    try {
      if (editingDriver) {
        await updateDoc(doc(db, 'drivers', editingDriver.id), driverData);
        setSuccessMessage("Driver updated successfully!");
      } else {

        // Add the driver to Firestore with the UID as the document ID
        await addDoc(collection(db, 'drivers'), {
          ...driverData,
          claimed: false
        });

        setSuccessMessage("Driver added successfully!");
      }
      setNewDriver({
        claimed: false,
        name: '',
        email: '',
        phone: '',
        role: 'driver',
        pay: 0,
        store_id: ''
      });
      setEditingDriver(null);
      fetchDrivers();
    } catch (err) {
      console.error("Error saving driver:", err);
      setError("Failed to save driver. Please try again.");
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
  };

  const handleDelete = async (id, email) => {
    if (window.confirm("Are you sure you want to delete this driver? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'drivers', id));


        setSuccessMessage("Driver deleted successfully!");
        fetchDrivers();
      } catch (err) {
        console.error("Error deleting driver:", err);
        setError("Failed to delete driver. Please try again.");
      }
    }
  };

  const handleSendPasswordResetEmail = async (email) => {
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent successfully!");
    } catch (err) {
      console.error("Error sending password reset email:", err);
      setError("Failed to send password reset email. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>; 
  }
  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Driver List</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="w-full mb-4 px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          {showForm ? 'Hide Form' : (editingDriver ? 'Edit Driver' : 'Add Driver')}
        </button>

        {showForm && (
          <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-4">{editingDriver ? 'Edit Driver' : 'Add Driver'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                value={editingDriver ? editingDriver.name : newDriver.name}
                onChange={handleInputChange}
                placeholder="Name *"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <input
                type="email"
                name="email"
                value={editingDriver ? editingDriver.email : newDriver.email}
                onChange={handleInputChange}
                placeholder="Email *"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <select
                name="store_id"
                value={editingDriver ? editingDriver.store_id : newDriver.store_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select Store *</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
              <input
                type="tel"
                name="phone"
                value={editingDriver ? editingDriver.phone : newDriver.phone}
                onChange={handleInputChange}
                placeholder="Phone (Optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                name="pay"
                value={editingDriver ? editingDriver.pay : newDriver.pay}
                onChange={handleInputChange}
                placeholder="Hourly Pay (Optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <button type="submit" className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600">
                {editingDriver ? 'Update Driver' : 'Add Driver'}
              </button>
              {editingDriver && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingDriver(null);
                    setShowForm(false);
                  }} 
                  className="w-full px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg p-4">
          {drivers.map(driver => (
            <div key={driver.id} className="border-b py-4 last:border-b-0">
              <h3 className="font-semibold">{driver.name}</h3>
              <p className="text-sm text-gray-600">{driver.role}</p>
              <p className="text-sm text-gray-600">{stores.find(store => store.id === driver.store_id)?.name || 'Unknown'}</p>
              <div className="mt-2 space-x-2">
                <button onClick={() => {
                  handleEdit(driver);
                  setShowForm(true);
                }} className="text-blue-500">Edit</button>
                <button onClick={() => handleDelete(driver.id, driver.email)} className="text-red-500">Delete</button>
                <button onClick={() => handleSendPasswordResetEmail(driver.email)} className="text-green-500">Reset Password</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default DriverList;
