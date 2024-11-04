import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, where, query } from 'firebase/firestore';
import { getAuth,  sendPasswordResetEmail } from 'firebase/auth';
import { db } from '../firebase';

import { useAuth } from '../contexts/AuthContext';
function EmployeeList() {
  
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    claimed: false,
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    pay: 0,
    store_id: ''
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    fetchEmployees();
    fetchStores();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const employeeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(employeeList);
    } catch (err) {
      setError("Failed to fetch employees. Please try again.");
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
    if (editingEmployee) {
      setEditingEmployee({ ...editingEmployee, [name]: value });
    } else {
      setNewEmployee({ ...newEmployee, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    const employeeData = editingEmployee || newEmployee;

    if (!employeeData.name || !employeeData.role || !employeeData.store_id || !employeeData.email) {
      setError("Please fill in name, email, role, and store.");
      return;
    }

    try {
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData);
        setSuccessMessage("Employee updated successfully!");
      } else {

        // Add the employee to Firestore with the UID as the document ID
        await addDoc(collection(db, 'employees'), {
          ...employeeData,
          claimed: false
        });

        setSuccessMessage("Employee added successfully!");
      }
      setNewEmployee({
        claimed: false,
        name: '',
        email: '',
        phone: '',
        role: 'employee',
        pay: 0,
        store_id: ''
      });
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      console.error("Error saving employee:", err);
      setError("Failed to save employee. Please try again.");
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
  };

  const handleDelete = async (id, email) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'employees', id));


        setSuccessMessage("Employee deleted successfully!");
        fetchEmployees();
      } catch (err) {
        console.error("Error deleting employee:", err);
        setError("Failed to delete employee. Please try again.");
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
        <h1 className="text-2xl font-semibold mb-4">Employee List</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="w-full mb-4 px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          {showForm ? 'Hide Form' : (editingEmployee ? 'Edit Employee' : 'Add Employee')}
        </button>

        {showForm && (
          <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-4">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                value={editingEmployee ? editingEmployee.name : newEmployee.name}
                onChange={handleInputChange}
                placeholder="Name *"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <input
                type="email"
                name="email"
                value={editingEmployee ? editingEmployee.email : newEmployee.email}
                onChange={handleInputChange}
                placeholder="Email *"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <select
                name="store_id"
                value={editingEmployee ? editingEmployee.store_id : newEmployee.store_id}
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
                value={editingEmployee ? editingEmployee.phone : newEmployee.phone}
                onChange={handleInputChange}
                placeholder="Phone (Optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                name="pay"
                value={editingEmployee ? editingEmployee.pay : newEmployee.pay}
                onChange={handleInputChange}
                placeholder="Hourly Pay (Optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <button type="submit" className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600">
                {editingEmployee ? 'Update Employee' : 'Add Employee'}
              </button>
              {editingEmployee && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingEmployee(null);
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
          {employees.map(employee => (
            <div key={employee.id} className="border-b py-4 last:border-b-0">
              <h3 className="font-semibold">{employee.name}</h3>
              <p className="text-sm text-gray-600">{employee.role}</p>
              <p className="text-sm text-gray-600">{stores.find(store => store.id === employee.store_id)?.name || 'Unknown'}</p>
              <div className="mt-2 space-x-2">
                <button onClick={() => {
                  handleEdit(employee);
                  setShowForm(true);
                }} className="text-blue-500">Edit</button>
                <button onClick={() => handleDelete(employee.id, employee.email)} className="text-red-500">Delete</button>
                <button onClick={() => handleSendPasswordResetEmail(employee.email)} className="text-green-500">Reset Password</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmployeeList;