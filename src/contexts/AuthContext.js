import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await fetchUserData(user.uid);
        setCurrentUser(userData);
        setUserRole(userData.role);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const fetchUserData = async (uid) => {
    const databases = ['employees', 'managers', 'admins', 'drivers'];
    
    for (const dbName of databases) {
      try {
        const userDoc = await getDoc(doc(db, dbName, uid));
        if (userDoc.exists()) {
          return { uid, ...userDoc.data(), userType: dbName };
        }
      } catch (error) {
        console.error(`Error fetching user data from ${dbName}:`, error);
      }
    }
  
    console.log("User not found in any database");
    return null;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    currentUser,
    userRole,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}