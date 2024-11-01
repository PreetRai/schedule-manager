import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

function PlatformManager() {
  const [platforms, setPlatforms] = useState([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [editingPlatform, setEditingPlatform] = useState(null);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    const platformsRef = collection(db, 'platforms');
    const querySnapshot = await getDocs(platformsRef);
    setPlatforms(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
  };

  const handleAddPlatform = async (e) => {
    e.preventDefault();
    if (!newPlatform.trim()) return;

    try {
      await addDoc(collection(db, 'platforms'), { name: newPlatform });
      setNewPlatform('');
      fetchPlatforms();
    } catch (error) {
      console.error("Error adding platform:", error);
    }
  };

  const handleUpdatePlatform = async (e) => {
    e.preventDefault();
    if (!editingPlatform || !editingPlatform.name.trim()) return;

    try {
      const platformRef = doc(db, 'platforms', editingPlatform.id);
      await updateDoc(platformRef, { name: editingPlatform.name });
      setEditingPlatform(null);
      fetchPlatforms();
    } catch (error) {
      console.error("Error updating platform:", error);
    }
  };

  const handleDeletePlatform = async (platformId) => {
    if (window.confirm('Are you sure you want to delete this platform?')) {
      try {
        const platformRef = doc(db, 'platforms', platformId);
        await deleteDoc(platformRef);
        fetchPlatforms();
      } catch (error) {
        console.error("Error deleting platform:", error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Platform Manager</h2>
      
      <form onSubmit={handleAddPlatform} className="mb-4">
        <input
          type="text"
          value={newPlatform}
          onChange={(e) => setNewPlatform(e.target.value)}
          placeholder="New Platform Name"
          className="border p-2 rounded mr-2"
          required
        />
        <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
          Add Platform
        </button>
      </form>

      <ul className="space-y-2">
        {platforms.map(platform => (
          <li key={platform.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
            {editingPlatform && editingPlatform.id === platform.id ? (
              <form onSubmit={handleUpdatePlatform} className="flex-grow mr-2">
                <input
                  type="text"
                  value={editingPlatform.name}
                  onChange={(e) => setEditingPlatform({...editingPlatform, name: e.target.value})}
                  className="border p-1 rounded w-full"
                  required
                />
              </form>
            ) : (
              <span>{platform.name}</span>
            )}
            <div>
              {editingPlatform && editingPlatform.id === platform.id ? (
                <>
                  <button onClick={handleUpdatePlatform} className="bg-blue-500 text-white p-1 rounded mr-1 hover:bg-blue-600">
                    Save
                  </button>
                  <button onClick={() => setEditingPlatform(null)} className="bg-gray-500 text-white p-1 rounded hover:bg-gray-600">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditingPlatform(platform)} className="bg-yellow-500 text-white p-1 rounded mr-1 hover:bg-yellow-600">
                  Edit
                </button>
              )}
              <button onClick={() => handleDeletePlatform(platform.id)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PlatformManager;