import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {  
    apiKey: "AIzaSyCp3MN8JcHPjA1d9AWONnf-Mi5h9J1VTe4",
    authDomain: "schedule-manager-ee9ae.firebaseapp.com",
    projectId: "schedule-manager-ee9ae",
    storageBucket: "schedule-manager-ee9ae.appspot.com",
    messagingSenderId: "766928693785",
    appId: "1:766928693785:web:3e327fc6ea0d05a36b1888",
    measurementId: "G-V1EDCRWLP9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);