/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface GroupRestorePanelProps {
  onRestore: () => void;
  isLoading: boolean;
}

const GroupRestorePanel: React.FC<GroupRestorePanelProps> = ({ onRestore, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-bold text-gray-200">Restore Group Photo</h3>
      <p className="text-md text-gray-400 max-w-md">
        Ideal for graduation photos and other group pictures. This tool fixes blur and scratches, restoring each person's face to high-definition clarity while preserving all original details.
      </p>
      <button
        onClick={onRestore}
        disabled={isLoading}
        className="mt-4 w-full max-w-xs bg-gradient-to-br from-sky-500 to-cyan-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-cyan-800 disabled:to-cyan-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Restoring...' : 'Restore Group Photo'}
      </button>
    </div>
  );
};

export default GroupRestorePanel;