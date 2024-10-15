import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebase';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    pay: '',
    store_id: '',
    claimed: false
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const roles = ['Driver', 'Field Worker', 'Admin', 'Manager'];
  const auth = getAuth();

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
      console.error("Error fetching employees:", err);
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
        // Create a new user account
        const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, 'defaultPassword');
        const user = userCredential.user;

        // Add the employee to Firestore with the UID as the document ID
        await addDoc(collection(db, 'employees'), {
          ...employeeData,
          uid: user.uid,
          claimed: false
        });

        setSuccessMessage("Employee added successfully!");
      }
      setNewEmployee({
        name: '',
        email: '',
        phone: '',
        role: '',
        pay: '',
        store_id: '',
        claimed: false
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
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

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex justify-center">
      <div className="w-full max-w-7xl flex space-x-8">
        {/* Employee List */}
        <div className="w-2/3 bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-semibold mb-4">Employee List</h1>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Role</th>
                <th className="text-left">Store</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} className="border-b">
                  <td className="py-2">{employee.name}</td>
                  <td>{employee.role}</td>
                  <td>{stores.find(store => store.id === employee.store_id)?.name || 'Unknown'}</td>
                  <td>
                    <button onClick={() => handleEdit(employee)} className="text-blue-500 mr-2">Edit</button>
                    <button onClick={() => handleDelete(employee.id)} className="text-red-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Employee Form */}
        <div className="w-1/3 bg-white shadow-lg rounded-lg p-6">
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
              name="role"
              value={editingEmployee ? editingEmployee.role : newEmployee.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Select Role *</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
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
                onClick={() => setEditingEmployee(null)} 
                className="w-full px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeList;
