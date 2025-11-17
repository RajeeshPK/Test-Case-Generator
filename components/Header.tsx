
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <svg
              className="w-8 h-8 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15.5 3H8.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
              <path d="M12 7v1" />
              <path d="M12 11v1" />
              <path d="M12 15v1" />
            </svg>
            <h1 className="text-xl md:text-2xl font-bold text-gray-100 tracking-tight">
              AI Test Case Generator
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
