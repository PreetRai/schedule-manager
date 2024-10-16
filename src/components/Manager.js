import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import StoreCalendarView from "./StoreCalenderView";

function Manager() {
    const { currentUser } = useAuth();
    const [managedStore, setManagedStore] = useState(null);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchManagerData();
        fetchStores();
    }, [currentUser]);

    const fetchManagerData = async () => {
        try {
            const managersRef = collection(db, 'employees');
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

    return (
        <StoreCalendarView 
            storeId={managedStore} 
            stores={stores}
            onShiftUpdate={handleShiftUpdate}
        />
    );
}

export default Manager;