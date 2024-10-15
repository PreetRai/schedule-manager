import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc,deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

function EmployeeSignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Check if there's an unclaimed employee document with this email
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('email', '==', email), where('claimed', '==', false));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No unclaimed employee account found with this email.');
        return;
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get the existing employee document
      const oldEmployeeDoc = querySnapshot.docs[0];
      const oldEmployeeData = oldEmployeeDoc.data();

      // Create a new document with the user's UID as the document ID
      await setDoc(doc(db, 'employees', user.uid), {
        ...oldEmployeeData,
        claimed: true,
        id: user.uid
      });

      // Delete the old document
      await deleteDoc(doc(db, 'employees', oldEmployeeDoc.id));

      // Redirect to login or dashboard
      // history.push('/login');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h2>Employee Sign Up</h2>
      {error && <p>{error}</p>}
      <form onSubmit={handleSignUp}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}

export default EmployeeSignUp;