/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface RestorePanelProps {
  onRestore: () => void;
  isLoading: boolean;
}

const RestorePanel: React.FC<RestorePanelProps> = ({ onRestore, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-bold text-gray-200">Restore Old Photo</h3>
      <p className="text-md text-gray-400 max-w-md">
        Fix scratches, remove creases, and improve colors and focus for old or damaged photos, aiming for a high-quality 4k effect.
      </p>
      <button
        onClick={onRestore}
        disabled={isLoading}
        className="mt-4 w-full max-w-xs bg-gradient-to-br from-amber-500 to-yellow-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-yellow-800 disabled:to-yellow-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Restoring...' : 'Restore Photo'}
      </button>
    </div>
  );
};

export default RestorePanel;
