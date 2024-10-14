import { useState, useEffect } from 'react';
import { auth } from '../firebase';

// export function useRole() {
//   const [role, setRole] = useState(null);

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged(async (user) => {
//       if (user) {
//         const idTokenResult = await user.getIdTokenResult();
//         setRole(idTokenResult.claims.role);
//       } else {
//         setRole(null);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   return role;
// }

export function useRole() {
    const [role, setRole] = useState(null);
  
    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          // Temporarily hardcode the role for testing
          setRole('admin');
        } else {
          setRole(null);
        }
      });
  
      return () => unsubscribe();
    }, []);
  
    return role;
  }