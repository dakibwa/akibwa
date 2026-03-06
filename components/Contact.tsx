import React from 'react';

const LINKS = [
  {
    href: 'mailto:***REMOVED***',
    label: '***REMOVED***',
    detail: 'Best route for collaboration, projects, and direct conversation.',
    action: 'Email',
    icon: (
      <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: 'https://x.com/dakibwa',
    label: '@dakibwa',
    detail: 'Short-form thoughts, links, and public fragments.',
    action: 'Visit profile',
    external: true,
    icon: (
      <svg className="w-4 h-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/in/daniel-atkinson-7439711b3/',
    label: '/daniel-atkinson',
    detail: 'Professional background, experience, and longer-form context.',
    action: 'Open LinkedIn',
    external: true,
    icon: (
      <svg className="w-4 h-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    href: 'https://www.instagram.com/dakibwa/',
    label: '@dakibwa',
    detail: 'Visual notes, images, and a lighter public layer.',
    action: 'Open Instagram',
    external: true,
    icon: (
      <svg className="w-4 h-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
];

const Contact: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="surface-panel rounded-[1.5rem] p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">
            Direct line
          </p>
          <h3 className="mt-2 font-display text-3xl md:text-4xl tracking-tight">Daniel</h3>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#696257] dark:text-[#a89d88]">
            Open to thoughtful collaboration, product work, writing, and conversations that have some weight to them.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="mailto:***REMOVED***"
              className="rounded-full bg-[#205c5a] px-4 py-2.5 text-sm font-medium text-[#f8f4ed] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#184947] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:bg-[#79b7ab] dark:text-[#102624] dark:hover:bg-[#8cc4b9]"
            >
              Email directly
            </a>
            <a
              href="https://www.linkedin.com/in/daniel-atkinson-7439711b3/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#d8cfbe] px-4 py-2.5 text-sm font-medium text-[#696257] transition-colors hover:border-[#205c5a] hover:text-[#205c5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:border-[#342f25] dark:text-[#a89d88] dark:hover:border-[#79b7ab] dark:hover:text-[#79b7ab]"
            >
              View background
            </a>
          </div>
        </div>

        <div className="surface-panel rounded-[1.5rem] p-5 md:p-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">
            Best used for
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-[#d8cfbe] bg-[#faf7ef]/72 p-4 dark:border-[#342f25] dark:bg-[#1d1a15]/72">
              <p className="font-medium">Building</p>
              <p className="mt-1 text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
                Software, tools, systems, and ambitious product ideas.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d8cfbe] bg-[#faf7ef]/72 p-4 dark:border-[#342f25] dark:bg-[#1d1a15]/72">
              <p className="font-medium">Writing</p>
              <p className="mt-1 text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
                Essays, concepts, and work that needs sharper framing.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d8cfbe] bg-[#faf7ef]/72 p-4 dark:border-[#342f25] dark:bg-[#1d1a15]/72">
              <p className="font-medium">Conversation</p>
              <p className="mt-1 text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
                Ideas worth testing, questions worth debating, people worth meeting.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
            className="surface-panel rounded-[1.3rem] px-4 py-4 flex items-center justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#205c5a] hover:text-[#205c5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:hover:border-[#79b7ab] dark:hover:text-[#79b7ab]"
          >
            <div className="flex items-start gap-3">
              <span className="mt-1">{link.icon}</span>
              <div>
                <p className="font-medium">{link.label}</p>
                <p className="mt-1 text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
                  {link.detail}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs uppercase tracking-[0.14em] opacity-60">{link.action}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Contact;
