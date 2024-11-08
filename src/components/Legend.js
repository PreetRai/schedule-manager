import React from 'react';
import { useStoreColors } from '../contexts/StoreColorContext';

function Legend({ stores,title,rounded }) {
  const storeColors = useStoreColors();

  return (
    <div className={`bg-white p-4 ${rounded ?  rounded : 'rounded-lg'} shadow-md`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {stores.map(store => (
          <div key={store.id} className="flex items-center">
            <div 
              className={`w-5 h-5 rounded-full mr-2 ${storeColors[store.id] || 'bg-gray-200'}`}
            ></div>
            <span className="text-sm">{store.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Legend;