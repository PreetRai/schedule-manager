import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function EmployeeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to employee-portal
        navigate('/employee-portal');
      } else {
        // No user is signed in, allow login
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
  
    try {
      // Check if the user exists in any of the four databases
      const databases = ['admins', 'employees', 'drivers', 'managers'];
      let userDoc = null;
      let userType = '';
  
      for (const dbName of databases) {
        const dbRef = collection(db, dbName);
        const q = query(dbRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          userType = dbName;
          break;
        }
      }
  
      if (!userDoc) {
        setError("No account found with this email.");
        return;
      }
  
      const userData = userDoc.data();
  
      if (userData.claimed) {
        // If the account is already claimed, just sign in
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // If the account is not claimed, create a new auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create a new document with the UID as the document ID
        await setDoc(doc(db, userType, userCredential.user.uid), {
          ...userData,
          claimed: true,
          id: userCredential.user.uid
        });
  
        // Delete the old document
        await deleteDoc(doc(db, userType, userDoc.id));
      }
  
      // Redirect based on user type
      switch (userType) {
        case 'admins':
          navigate('/admin-dashboard');
          break;
        case 'employees':
          navigate('/employee-dashboard');
          break;
        case 'drivers':
          navigate('/driver-dashboard');
          break;
        case 'managers':
          navigate('/manager-dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>; // Or any loading indicator
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Employee Account Claim
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Claim Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeLogin;