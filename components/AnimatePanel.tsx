/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface AnimatePanelProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  prompt: string;
  setPrompt: (prompt: string) => void;
}

const AnimatePanel: React.FC<AnimatePanelProps> = ({ onGenerate, isLoading, prompt, setPrompt }) => {

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(prompt);
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-bold text-gray-200">Animate Your Image</h3>
      <p className="text-md text-gray-400 max-w-md">
        Bring your image to life. Describe the animation you want to see, and AI will generate a short video.
      </p>
      <form onSubmit={handleGenerate} className="w-full max-w-lg flex flex-col items-center gap-4 mt-2">
        <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'A gentle breeze makes the trees sway'"
            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-center"
            disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full max-w-xs bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-cyan-800 disabled:to-cyan-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Generating...' : 'Generate Video'}
        </button>
      </form>
    </div>
  );
};

export default AnimatePanel;
