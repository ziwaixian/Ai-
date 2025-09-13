/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface ThreeDViewPanelProps {
  onGenerate: () => void;
  isLoading: boolean;
}

const ThreeDViewPanel: React.FC<ThreeDViewPanelProps> = ({ onGenerate, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-bold text-gray-200">Generate 3D Orthographic View</h3>
      <p className="text-md text-gray-400 max-w-md">
        Create a technical-style drawing showing the front, side, and top views of the main subject in your image. This works best with single, clearly defined objects.
      </p>
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="mt-4 w-full max-w-xs bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-indigo-800 disabled:to-indigo-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Generating...' : 'Generate 3D View'}
      </button>
    </div>
  );
};

export default ThreeDViewPanel;
