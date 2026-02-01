import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export const SplashPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationStartedRef = useRef(false);

  useEffect(() => {
    if (animationStartedRef.current || !containerRef.current) return;
    animationStartedRef.current = true;

    const container = containerRef.current;

    const getHexSize = () => {
      const screenMin = Math.min(window.innerWidth, window.innerHeight);
      return Math.max(75, screenMin * 0.12);
    };

    const createHexGrid = () => {
      container.innerHTML = '';

      const hexSize = getHexSize();
      const hexWidth = hexSize * Math.sqrt(3);
      const hexHeight = hexSize * 2;
      const vertSpacing = hexHeight * 0.75;
      const horizSpacing = hexWidth;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;

      const colsNeeded = Math.ceil(screenWidth / horizSpacing) + 4;
      const rowsNeeded = Math.ceil(screenHeight / vertSpacing) + 4;

      const hexes: { x: number; y: number; dist: number }[] = [];

      for (let row = -Math.floor(rowsNeeded / 2); row <= Math.floor(rowsNeeded / 2); row++) {
        for (let col = -Math.floor(colsNeeded / 2); col <= Math.floor(colsNeeded / 2); col++) {
          const isOddRow = Math.abs(row) % 2 === 1;
          const x = centerX + col * horizSpacing + (isOddRow ? horizSpacing / 2 : 0) - hexWidth / 2;
          const y = centerY + row * vertSpacing - hexHeight / 2;

          const distFromCenter = Math.sqrt(
            Math.pow((x + hexWidth / 2) - centerX, 2) +
            Math.pow((y + hexHeight / 2) - centerY, 2)
          );

          hexes.push({ x, y, dist: distFromCenter });
        }
      }

      hexes.sort((a, b) => a.dist - b.dist);

      hexes.forEach((hex, index) => {
        const div = document.createElement('div');
        div.className = 'splash-hex';
        div.style.left = hex.x + 'px';
        div.style.top = hex.y + 'px';
        div.style.width = hexWidth + 'px';
        div.style.height = hexHeight + 'px';
        div.innerHTML = `<svg viewBox="0 0 100 115.47" preserveAspectRatio="none"><polygon points="50,0 100,28.87 100,86.60 50,115.47 0,86.60 0,28.87"/></svg>`;
        div.dataset.index = String(index);
        container.appendChild(div);
      });

      return hexes.length;
    };

    const animateHexes = () => {
      const hexElements = container.querySelectorAll('.splash-hex');

      if (hexElements[0]) {
        hexElements[0].classList.add('visible');
      }

      let currentIndex = 1;
      let baseDelay = 80;

      const showNextBatch = () => {
        if (currentIndex >= hexElements.length) {
          hexElements.forEach(hex => {
            if (!hex.classList.contains('visible')) {
              hex.classList.add('visible');
            }
          });
          setTimeout(showCards, 300);
          return;
        }

        const batchSize = currentIndex < 7 ? 1 : Math.ceil(Math.random() * 3);

        for (let i = 0; i < batchSize && currentIndex < hexElements.length; i++) {
          if (!hexElements[currentIndex].classList.contains('visible')) {
            hexElements[currentIndex].classList.add('visible');
          }
          currentIndex++;
        }

        const nextDelay = baseDelay + (Math.random() * 40 - 20);
        baseDelay = Math.max(30, baseDelay - 0.5);

        setTimeout(showNextBatch, nextDelay);
      };

      setTimeout(showNextBatch, 200);
    };

    const showCards = () => {
      const blCards = document.querySelectorAll('.splash-card.bl');
      const trCards = document.querySelectorAll('.splash-card.tr');

      blCards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('visible');
        }, index * 100);
      });

      trCards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('visible');
        }, 250 + index * 100);
      });
    };

    createHexGrid();
    animateHexes();

    const handleResize = () => {
      document.querySelectorAll('.splash-card').forEach(c => c.classList.remove('visible'));
      animationStartedRef.current = false;
      createHexGrid();
      animateHexes();
    };

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <section className="splash-hero">
      {/* Honeycomb container */}
      <div ref={containerRef} className="splash-honeycomb-container" />

      {/* Bottom left card hand */}
      <div className="splash-card bl bl1" />
      <div className="splash-card bl bl2" />
      <div className="splash-card bl bl3" />
      <div className="splash-card bl bl4" />
      <div className="splash-card bl bl5" />

      {/* Top right card hand */}
      <div className="splash-card tr tr1" />
      <div className="splash-card tr tr2" />
      <div className="splash-card tr tr3" />
      <div className="splash-card tr tr4" />
      <div className="splash-card tr tr5" />

      <div className="splash-hero-content">
        <div className="splash-logo"><span>HQ</span></div>
        <h1 className="splash-headline">
          Entering Game Night <span className="highlight">HQ</span>
        </h1>
        <div className="splash-divider" />
        <p className="splash-tagline">Your board game command center.</p>
        <div className="splash-buttons">
          <Link to="/signup" className="splash-btn-primary">Get Started</Link>
          <Link to="/login" className="splash-btn-secondary">Sign In</Link>
        </div>
      </div>
    </section>
  );
};
