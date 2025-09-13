/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface RemoveBgPanelProps {
  onRemove: () => void;
  isLoading: boolean;
}

const RemoveBgPanel: React.FC<RemoveBgPanelProps> = ({ onRemove, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-bold text-gray-200">Remove Background</h3>
      <p className="text-md text-gray-400 max-w-md">
        One-click to automatically remove the background from your image, leaving the main subject on a transparent background.
      </p>
      <button
        onClick={onRemove}
        disabled={isLoading}
        className="mt-4 w-full max-w-xs bg-gradient-to-br from-red-600 to-orange-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-orange-800 disabled:to-orange-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Removing...' : 'Remove Background'}
      </button>
    </div>
  );
};

export default RemoveBgPanel;
