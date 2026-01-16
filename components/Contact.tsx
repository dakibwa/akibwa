import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-normal tracking-tight">Daniel</h1>
      
      <div className="space-y-4">
        <a 
          href="mailto:***REMOVED***"
          className="flex items-center gap-3 text-lg text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-60 transition-opacity"
        >
          <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          ***REMOVED***
        </a>

        <a 
          href="https://twitter.com/dakibwa" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-lg text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-60 transition-opacity"
        >
          <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
          @dakibwa
        </a>
      </div>
    </div>
  );
};

export default Contact;