import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight">Contact</h1>
        <div className="w-16 h-px bg-[#1a1a1a] dark:bg-[#e0e0e0]"></div>
      </header>

      <div className="space-y-8 pt-8">
        <div className="space-y-2">
          <h2 className="text-xl font-normal">Email</h2>
          <a 
            href="mailto:***REMOVED***"
            className="text-lg text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-70 transition-opacity block"
          >
            ***REMOVED***
          </a>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-normal">Twitter</h2>
          <a 
            href="https://twitter.com/dakibwa" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-lg text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-70 transition-opacity block"
          >
            @dakibwa
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;