import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function EmployeePortal() {
  const { currentUser } = useAuth();
  const [employeeData, setEmployeeData] = useState(null);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmployeeData();
    fetchUpcomingShifts();
  }, [currentUser]);

  const fetchEmployeeData = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setEmployeeData(querySnapshot.docs[0].data());
      } else {
        setError("Employee data not found");
      }
    } catch (err) {
      setError("Failed to fetch employee data");
      console.error(err);
    }
  };

  const fetchUpcomingShifts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const shiftsRef = collection(db, 'shifts');
      const q = query(shiftsRef, 
        where("employee_id", "==", currentUser.uid),
        where("date", ">=", today)
      );
      const querySnapshot = await getDocs(q);
      const shifts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUpcomingShifts(shifts);
    } catch (err) {
      setError("Failed to fetch upcoming shifts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <h1 className="text-2xl font-semibold mb-4">Employee Portal</h1>
          
          {employeeData && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Your Information</h2>
              <p><strong>Name:</strong> {employeeData.name}</p>
              <p><strong>Role:</strong> {employeeData.role}</p>
              <p><strong>Email:</strong> {employeeData.email}</p>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-2">Upcoming Shifts</h2>
            {upcomingShifts.length > 0 ? (
              <ul>
                {upcomingShifts.map(shift => (
                  <li key={shift.id} className="mb-2">
                    <p><strong>Date:</strong> {shift.date}</p>
                    <p><strong>Time:</strong> {shift.start_time} - {shift.end_time}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming shifts scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeePortal;