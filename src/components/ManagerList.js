import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, } from 'firebase/firestore';
import { getAuth,  sendPasswordResetEmail } from 'firebase/auth';
import { db } from '../firebase';

function ManagerList() {
  const [managers, setManagers] = useState([]);
  const [stores, setStores] = useState([]);
  const [newManager, setNewManager] = useState({
    claimed: false,
    name: '',
    email: '',
    phone: '',
    role: 'manager',
    pay: 0,
    store_id: ''
  });
  const [editingManager, setEditingManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchManagers();
    fetchStores();
  }, []);

  const fetchManagers = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'managers'));
      const managerList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManagers(managerList);
    } catch (err) {
      setError("Failed to fetch managers. Please try again.");
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
    if (editingManager) {
      setEditingManager({ ...editingManager, [name]: value });
    } else {
      setNewManager({ ...newManager, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    const managerData = editingManager || newManager;

    if (!managerData.name || !managerData.role || !managerData.store_id || !managerData.email) {
      setError("Please fill in name, email, role, and store.");
      return;
    }

    try {
      if (editingManager) {
        await updateDoc(doc(db, 'managers', editingManager.id), managerData);
        setSuccessMessage("Manager updated successfully!");
      } else {

        // Add the manager to Firestore with the UID as the document ID
        await addDoc(collection(db, 'managers'), {
          ...managerData,
          claimed: false
        });

        setSuccessMessage("Manager added successfully!");
      }
      setNewManager({
        claimed: false,
        name: '',
        email: '',
        phone: '',
        role: 'manager',
        pay: 0,
        store_id: ''
      });
      setEditingManager(null);
      fetchManagers();
    } catch (err) {
      console.error("Error saving manager:", err);
      setError("Failed to save manager. Please try again.");
    }
  };

  const handleEdit = (manager) => {
    setEditingManager(manager);
  };

  const handleDelete = async (id, email) => {
    if (window.confirm("Are you sure you want to delete this manager? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'managers', id));


        setSuccessMessage("Manager deleted successfully!");
        fetchManagers();
      } catch (err) {
        console.error("Error deleting manager:", err);
        setError("Failed to delete manager. Please try again.");
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
        <h1 className="text-2xl font-semibold mb-4">Manager List</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="w-full mb-4 px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          {showForm ? 'Hide Form' : (editingManager ? 'Edit Manager' : 'Add Manager')}
        </button>

        {showForm && (
          <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-4">{editingManager ? 'Edit Manager' : 'Add Manager'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                value={editingManager ? editingManager.name : newManager.name}
                onChange={handleInputChange}
                placeholder="Name *"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <input
                type="email"
                name="email"
                value={editingManager ? editingManager.email : newManager.email}
                onChange={handleInputChange}
                placeholder="Email *"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <select
                name="store_id"
                value={editingManager ? editingManager.store_id : newManager.store_id}
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
                value={editingManager ? editingManager.phone : newManager.phone}
                onChange={handleInputChange}
                placeholder="Phone (Optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                name="pay"
                value={editingManager ? editingManager.pay : newManager.pay}
                onChange={handleInputChange}
                placeholder="Hourly Pay (Optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <button type="submit" className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600">
                {editingManager ? 'Update Manager' : 'Add Manager'}
              </button>
              {editingManager && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingManager(null);
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
          {managers.map(manager => (
            <div key={manager.id} className="border-b py-4 last:border-b-0">
              <h3 className="font-semibold">{manager.name}</h3>
              <p className="text-sm text-gray-600">{manager.role}</p>
              <p className="text-sm text-gray-600">{stores.find(store => store.id === manager.store_id)?.name || 'Unknown'}</p>
              <div className="mt-2 space-x-2">
                <button onClick={() => {
                  handleEdit(manager);
                  setShowForm(true);
                }} className="text-blue-500">Edit</button>
                <button onClick={() => handleDelete(manager.id, manager.email)} className="text-red-500">Delete</button>
                <button onClick={() => handleSendPasswordResetEmail(manager.email)} className="text-green-500">Reset Password</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default ManagerList;
