// src/contexts/StoreColorContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const StoreColorContext = createContext();

const colors = [
  'bg-orange-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-red-200',
  'bg-pink-200', 'bg-indigo-200', 'bg-gray-200', 'bg-purple-200', 'bg-teal-200'
];

export function StoreColorProvider({ children }) {
  const [storeColors, setStoreColors] = useState({});

  useEffect(() => {
    const fetchStores = async () => {
      const storesRef = collection(db, 'stores');
      const snapshot = await getDocs(storesRef);
      const storeData = {};
      snapshot.docs.forEach((doc, index) => {
        storeData[doc.id] = colors[index % colors.length];
      });
      setStoreColors(storeData);
    };

    fetchStores();
  }, []);

  return (
    <StoreColorContext.Provider value={storeColors}>
      {children}
    </StoreColorContext.Provider>
  );
}

export function useStoreColors() {
  return useContext(StoreColorContext);
}