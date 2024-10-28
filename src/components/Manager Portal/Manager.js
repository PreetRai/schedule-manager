import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import StoreCalendarView from "../StoreCalenderView";
import DriverCalendarView from "../DriverCalenderView";
import {
    startOfWeek,
} from 'date-fns';
function Manager() {
    const { currentUser } = useAuth();
    const [managedStore, setManagedStore] = useState(null);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [weekStart] = useState(
        startOfWeek(new Date(), {weekStartsOn: 1})
    );
    const [drivers, setDrivers] = useState([]);
    const [showDriverCalendar, setShowDriverCalendar] = useState(false);
    useEffect(() => {
        fetchManagerData();
        fetchStores();
        fetchDrivers();
        fetchManagerData();
    }, [currentUser]);
    const fetchDrivers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'drivers'));
            const driverList = querySnapshot
                .docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            setDrivers(driverList);
        } catch (error) {
            console.error("Error fetching drivers:", error);
        }
    };
    const fetchManagerData = async () => {
        try {
            const managersRef = collection(db, 'managers');
            const q = query(managersRef, where("id", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const managerData = querySnapshot.docs[0].data();
                setManagedStore(managerData.store_id);
            } else {
                setError("No managed store found for this user.");
            }
        } catch (err) {
            setError("Failed to fetch manager data");
            console.error(err);
        }
    };

    const fetchStores = async () => {
        try {
            const storesRef = collection(db, 'stores');
            const querySnapshot = await getDocs(storesRef);
            const storeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStores(storeList);
        } catch (err) {
            setError("Failed to fetch stores");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShiftUpdate = () => {
        // Implement any necessary logic after a shift is updated
        console.log("Shift updated");
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!managedStore) {
        return <div>You are not assigned to manage any store.</div>;
    }

    return (   <>      <div className="flex justify-between items-center p-4">
        <></>
        <h1 className='text-xl '>{showDriverCalendar?"Driver Scheduler":"Employee Scheduler"}</h1>
        <button
            onClick={() => setShowDriverCalendar(!showDriverCalendar)}
            className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
            {
                showDriverCalendar
                    ? 'Show Employee Calendar'
                    : 'Show Driver Calendar'
            }
        </button>
    </div>      {
        showDriverCalendar
            ? (
                <DriverCalendarView
                    drivers={drivers}
                    stores={stores}
                    storeId={managedStore}
                    weekStart={weekStart}
                    legend={false}/>
            )
            : (
        <StoreCalendarView 
            storeId={managedStore} 
            stores={stores}
            onShiftUpdate={handleShiftUpdate}
        />)}</>

    );
}

export default Manager;