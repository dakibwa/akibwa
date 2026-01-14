import React, { useEffect, useRef, useState } from 'react';

const Cursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    // Check for hover states on mount and subsequent interactions
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button') || window.getComputedStyle(target).cursor === 'pointer') {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  // Animation Loop for smooth physics
  useEffect(() => {
    let animationFrameId: number;
    let mouseX = -100; // Start off screen
    let mouseY = -100;
    let followerX = -100;
    let followerY = -100;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Update small dot instantly
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
    };

    const loop = () => {
      // Linear interpolation (Lerp) for the "bubble" lag effect
      // Lower number = slower/more "weighty" feel
      const ease = 0.15;
      
      followerX += (mouseX - followerX) * ease;
      followerY += (mouseY - followerY) * ease;

      if (followerRef.current) {
         followerRef.current.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMouseMove);
    loop();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* 
        Main Dot 
        This is the precise pointer.
      */}
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
        style={{ marginTop: -3, marginLeft: -3 }}
      />
      
      {/* 
        The "Watchmen Bubble" Follower 
        A glowing Dr. Manhattan cyan orb (`#D1FAFF`) that expands on hover.
      */}
      <div 
        ref={followerRef}
        className={`
          fixed top-0 left-0 rounded-full border border-[#D1FAFF] bg-[#D1FAFF]/10 backdrop-blur-[1px] shadow-[0_0_15px_#D1FAFF] pointer-events-none z-[9998] transition-all duration-300 ease-out
          ${isHovering ? 'w-16 h-16 bg-[#D1FAFF]/20 border-[#D1FAFF]/80' : 'w-10 h-10'}
        `}
        style={{ 
          marginTop: isHovering ? -32 : -20, 
          marginLeft: isHovering ? -32 : -20 
        }} 
      />
    </>
  );
};

export default Cursor;