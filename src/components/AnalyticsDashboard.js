import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';

function AnalyticsDashboard() {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [totalStores, setTotalStores] = useState(0);
  const [totalHoursScheduled, setTotalHoursScheduled] = useState(0);
  const [averageHourlyRate, setAverageHourlyRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch total employees
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      setTotalEmployees(employeesSnapshot.size);
      const driverSnapshot = await getDocs(collection(db, 'drivers'));
      setTotalDrivers(driverSnapshot.size);

      // Fetch total stores
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      setTotalStores(storesSnapshot.size);

      // Fetch schedules for the current week
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const schedulesQuery = query(
        collection(db, 'shifts'),
   
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);

      let totalHours = 0;
      schedulesSnapshot.forEach(doc => {
        const schedule = doc.data();
        const start = new Date(`${schedule.date}T${schedule.start_time}`);
        const end = new Date(`${schedule.date}T${schedule.end_time}`);
        const hours = (end - start) / (1000 * 60 * 60);
        totalHours += hours;
      });
      setTotalHoursScheduled(totalHours);

      // Calculate average hourly rate
      let totalRate = 0;
      employeesSnapshot.forEach(doc => {
        totalRate += parseFloat(doc.data().pay);
      });
      setAverageHourlyRate(totalRate / employeesSnapshot.size);

    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to fetch analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className=" py-3 sm:max-w-xl sm:mx-auto">
        <div className=" px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <h1 className="text-2xl font-semibold mb-4">Analytics Dashboard</h1>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold">Total Employees</h2>
              <p className="text-3xl font-bold">{totalEmployees}</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold">Total Drivers</h2>
              <p className="text-3xl font-bold">{totalDrivers}</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold">Total Stores</h2>
              <p className="text-3xl font-bold">{totalStores}</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold">Hours Scheduled (This Week)</h2>
              <p className="text-3xl font-bold">{totalHoursScheduled.toFixed(2)}</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold">Average Hourly Rate</h2>
              <p className="text-3xl font-bold">${averageHourlyRate.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
