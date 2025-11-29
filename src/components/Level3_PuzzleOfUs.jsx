import { useRef, useEffect, useState } from 'react';

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const PUZZLE_SIZE = Math.min(SCREEN_HEIGHT * 0.8, SCREEN_WIDTH * 0.5);
const TILE_SIZE = PUZZLE_SIZE / 5;
const GRID_ORIGIN = {
  x: (SCREEN_WIDTH - PUZZLE_SIZE) / 2,
  y: (SCREEN_HEIGHT - PUZZLE_SIZE) / 2
};

const WORKSPACE_LEFT = {
  x: 0,
  y: 0,
  width: GRID_ORIGIN.x,
  height: SCREEN_HEIGHT
};

const WORKSPACE_RIGHT = {
  x: GRID_ORIGIN.x + PUZZLE_SIZE,
  y: 0,
  width: GRID_ORIGIN.x,
  height: SCREEN_HEIGHT
};

const SNAP_THRESHOLD = TILE_SIZE * 0.3;

function Level3_PuzzleOfUs({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const backgroundRef = useRef(null);
  const backgroundImageRef = useRef(null); // Background scene image
  const lockSoundRef = useRef(null);
  const tilesRef = useRef([]);
  const tileCanvasesRef = useRef({});

  const [gameState, setGameState] = useState({
    tiles: [],
    draggingTile: null,
    dragOffset: { x: 0, y: 0 },
    correctCount: 0,
    gameStarted: false,
    levelCompleted: false,
    showCelebration: false
  });

  const [particles, setParticles] = useState([]);

  // Scramble tiles randomly across workspace and board
  const scrambleTiles = (tiles) => {
    tiles.forEach(tile => {
      const useLeftWorkspace = Math.random() < 0.3;
      const useRightWorkspace = Math.random() < 0.3;

      if (useLeftWorkspace) {
        tile.x = Math.random() * (WORKSPACE_LEFT.width - TILE_SIZE);
        tile.y = Math.random() * (SCREEN_HEIGHT - TILE_SIZE);
      } else if (useRightWorkspace) {
        tile.x = WORKSPACE_RIGHT.x + Math.random() * (WORKSPACE_RIGHT.width - TILE_SIZE);
        tile.y = Math.random() * (SCREEN_HEIGHT - TILE_SIZE);
      } else {
        tile.x = GRID_ORIGIN.x + Math.random() * (PUZZLE_SIZE - TILE_SIZE);
        tile.y = GRID_ORIGIN.y + Math.random() * (PUZZLE_SIZE - TILE_SIZE);
      }
    });
  };

  // Generate placeholder tiles with colors
  const generatePlaceholderTiles = () => {
    const tiles = [];
    const colors = ['#8B4513', '#D2691E', '#CD853F', '#FF8C00', '#FFA500'];

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const id = row * 5 + col;
        tiles.push({
          id,
          gridX: col,
          gridY: row,
          x: 0,
          y: 0,
          width: TILE_SIZE,
          height: TILE_SIZE,
          isLocked: false,
          color: colors[(row + col) % colors.length],
          imageData: null,
          sourceX: 0,
          sourceY: 0
        });
      }
    }

    scrambleTiles(tiles);
    tilesRef.current = tiles;
    setGameState(prev => ({ ...prev, tiles, gameStarted: true }));
  };

  // Generate tiles from image
  const generateTiles = (sourceImage) => {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    const tiles = [];
    const pieceWidth = sourceImage.width / 5;
    const pieceHeight = sourceImage.height / 5;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const id = row * 5 + col;
        const imageData = ctx.getImageData(
          col * pieceWidth,
          row * pieceHeight,
          pieceWidth,
          pieceHeight
        );

        // Pre-render tile canvas for performance
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = imageData.width;
        tileCanvas.height = imageData.height;
        const tileCtx = tileCanvas.getContext('2d');
        tileCtx.putImageData(imageData, 0, 0);
        tileCanvasesRef.current[id] = tileCanvas;

        tiles.push({
          id,
          gridX: col,
          gridY: row,
          x: 0,
          y: 0,
          width: TILE_SIZE,
          height: TILE_SIZE,
          isLocked: false,
          imageData,
          sourceX: col * pieceWidth,
          sourceY: row * pieceHeight,
          color: null
        });
      }
    }

    scrambleTiles(tiles);
    tilesRef.current = tiles;
    setGameState(prev => ({ ...prev, tiles, gameStarted: true }));
  };

  // Load puzzle image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      backgroundRef.current = img;
      generateTiles(img);
    };
    img.onerror = () => {
      console.warn('Failed to load /level_3_puzzle.jpeg, using placeholder');
      generatePlaceholderTiles();
    };
    img.src = '/level_3_puzzle.jpeg';
  }, []);

  // Load lock sound
  useEffect(() => {
    const audio = new Audio('/src/assets/audio/lock_click.mp3');
    audio.volume = 0.5;
    audio.preload = 'auto';
    lockSoundRef.current = audio;

    return () => {
      if (lockSoundRef.current) {
        lockSoundRef.current = null;
      }
    };
  }, []);

  // Load background image
  useEffect(() => {
    const bg = new Image();
    bg.onload = () => {
      backgroundImageRef.current = bg;
    };
    bg.onerror = () => {
      console.warn('Failed to load background: /level_3.jpeg');
    };
    bg.src = '/level_3.jpeg';
  }, []);

  // Play lock sound
  const playLockSound = () => {
    if (lockSoundRef.current) {
      lockSoundRef.current.currentTime = 0;
      lockSoundRef.current.play().catch(e => console.warn('Audio play failed:', e));
    }
  };

  // Trigger particle effect
  const triggerParticleEffect = (x, y) => {
    const newParticles = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 60,
        color: ['#FFD700', '#FF8C00', '#FFA500'][Math.floor(Math.random() * 3)]
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Update particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 1
        })).filter(p => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState.gameStarted) return;

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const clickedTile = [...tilesRef.current].reverse().find(tile =>
        !tile.isLocked &&
        mouseX >= tile.x &&
        mouseX <= tile.x + tile.width &&
        mouseY >= tile.y &&
        mouseY <= tile.y + tile.height
      );

      if (clickedTile) {
        // Update ref for rendering (move clicked tile to end for z-index)
        const newTiles = tilesRef.current.filter(t => t.id !== clickedTile.id);
        newTiles.push(clickedTile);
        tilesRef.current = newTiles;

        // Update state for dragging tracking
        setGameState(prev => ({
          ...prev,
          tiles: newTiles,
          draggingTile: clickedTile.id,
          dragOffset: {
            x: mouseX - clickedTile.x,
            y: mouseY - clickedTile.y
          }
        }));
      }
    };

    const handleMouseMove = (e) => {
      if (gameState.draggingTile === null) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // PERFORMANCE FIX: Only update ref, no setState = no re-render
      tilesRef.current = tilesRef.current.map(tile => {
        if (tile.id === gameState.draggingTile) {
          return {
            ...tile,
            x: mouseX - gameState.dragOffset.x,
            y: mouseY - gameState.dragOffset.y
          };
        }
        return tile;
      });
    };

    const handleMouseUp = () => {
      if (gameState.draggingTile === null) return;

      const draggedTile = tilesRef.current.find(t => t.id === gameState.draggingTile);
      if (!draggedTile) {
        setGameState(prev => ({ ...prev, draggingTile: null }));
        return;
      }

      const targetX = GRID_ORIGIN.x + draggedTile.gridX * TILE_SIZE;
      const targetY = GRID_ORIGIN.y + draggedTile.gridY * TILE_SIZE;
      const distance = Math.sqrt(
        Math.pow(draggedTile.x - targetX, 2) +
        Math.pow(draggedTile.y - targetY, 2)
      );

      if (distance < SNAP_THRESHOLD) {
        // Update ref first
        const newTiles = tilesRef.current.map(tile => {
          if (tile.id === draggedTile.id) {
            return {
              ...tile,
              x: targetX,
              y: targetY,
              isLocked: true
            };
          }
          return tile;
        });
        tilesRef.current = newTiles;

        const newCorrectCount = newTiles.filter(t => t.isLocked).length;

        playLockSound();
        triggerParticleEffect(targetX + TILE_SIZE/2, targetY + TILE_SIZE/2);

        // Then update state for React logic
        setGameState(prev => ({
          ...prev,
          tiles: newTiles,
          correctCount: newCorrectCount,
          draggingTile: null
        }));
      } else {
        setGameState(prev => ({ ...prev, draggingTile: null }));
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameState.draggingTile, gameState.dragOffset, gameState.gameStarted]);

  // Check win condition
  useEffect(() => {
    if (gameState.correctCount === 25 && !gameState.levelCompleted) {
      setGameState(prev => ({
        ...prev,
        levelCompleted: true,
        showCelebration: true
      }));

      for (let i = 0; i < 100; i++) {
        triggerParticleEffect(
          GRID_ORIGIN.x + PUZZLE_SIZE / 2,
          GRID_ORIGIN.y + PUZZLE_SIZE / 2
        );
      }

      setTimeout(() => {
        onComplete({
          title: "Puzzle of Us",
          type: "text",
          content: "A little piece of my heart for every piece of this puzzle. [Placeholder for special photo - user will add later]"
        });
      }, 2000);
    }
  }, [gameState.correctCount, gameState.levelCompleted, onComplete]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // Draw background image or fallback gradient
      if (backgroundImageRef.current) {
        ctx.drawImage(backgroundImageRef.current, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      } else {
        // Fallback gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        gradient.addColorStop(0, '#2C1810');
        gradient.addColorStop(1, '#1A0F0A');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }

      // Add white semi-transparent overlay on puzzle grid area
      if (gameState.gameStarted) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(GRID_ORIGIN.x, GRID_ORIGIN.y, PUZZLE_SIZE, PUZZLE_SIZE);
      }

      // Draw grid overlay
      if (!gameState.levelCompleted && gameState.gameStarted) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
          const x = GRID_ORIGIN.x + i * TILE_SIZE;
          ctx.beginPath();
          ctx.moveTo(x, GRID_ORIGIN.y);
          ctx.lineTo(x, GRID_ORIGIN.y + PUZZLE_SIZE);
          ctx.stroke();
        }

        for (let i = 0; i <= 5; i++) {
          const y = GRID_ORIGIN.y + i * TILE_SIZE;
          ctx.beginPath();
          ctx.moveTo(GRID_ORIGIN.x, y);
          ctx.lineTo(GRID_ORIGIN.x + PUZZLE_SIZE, y);
          ctx.stroke();
        }
      }

      // Draw tiles (OPTIMIZED: use refs and pre-rendered canvases)
      tilesRef.current.forEach(tile => {
        // Use pre-rendered canvas if available, otherwise fallback to color
        if (tileCanvasesRef.current[tile.id]) {
          ctx.drawImage(tileCanvasesRef.current[tile.id], tile.x, tile.y, tile.width, tile.height);
        } else if (tile.color) {
          ctx.fillStyle = tile.color;
          ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        }

        // Draw border
        if (tile.isLocked && !gameState.levelCompleted) {
          // Golden glow for locked pieces (only when puzzle incomplete)
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 10;
          ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
          ctx.shadowBlur = 0;
        } else if (tile.id === gameState.draggingTile) {
          // White border for dragging tile
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
        } else if (!gameState.levelCompleted) {
          // Subtle border for unlocked pieces (only when puzzle incomplete)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
        }
      });

      // Draw particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        ctx.globalAlpha = 1;
      });

      // Progress bar
      if (gameState.gameStarted) {
        const barWidth = 300;
        const barHeight = 30;
        const barX = (SCREEN_WIDTH - barWidth) / 2;
        const barY = 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 10, barY - 10, barWidth + 20, barHeight + 20);

        const progress = gameState.correctCount / 25;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`${gameState.correctCount} / 25`, SCREEN_WIDTH / 2, barY + barHeight + 25);
      }

      // Title
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 250, 50);
      ctx.fillStyle = '#FFB6C1';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText('Puzzle of Us', 20, 40);

      // Instructions
      if (!gameState.levelCompleted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, SCREEN_HEIGHT - 60, SCREEN_WIDTH, 60);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('Drag pieces to solve the puzzle', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 35);
        ctx.fillText('Pieces lock when placed correctly', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 15);
      }

      // Celebration
      if (gameState.showCelebration) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = '#FFD700';
        ctx.font = '48px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.fillText('COMPLETED!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        ctx.shadowBlur = 0;
      }

      // CRITICAL FIX: Store animation ID for proper cleanup
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, particles]);

  // ======= DEBUG FUNCTION - EASY TO REMOVE =======
  const debugCompletePuzzle = () => {
    const completedTiles = tilesRef.current.map(tile => ({
      ...tile,
      x: GRID_ORIGIN.x + tile.gridX * TILE_SIZE,
      y: GRID_ORIGIN.y + tile.gridY * TILE_SIZE,
      isLocked: true
    }));

    tilesRef.current = completedTiles;
    setGameState(prev => ({
      ...prev,
      tiles: completedTiles,
      correctCount: 25
    }));
  };
  // ======= END DEBUG FUNCTION =======

  return (
    <>
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={{ cursor: gameState.draggingTile !== null ? 'grabbing' : 'grab' }}
      />
      <button
        onClick={onReturnToHub}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: '2px solid white',
          cursor: 'pointer',
          fontFamily: '"Press Start 2P"',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        Return to Hub
      </button>
      {/* ======= DEBUG BUTTON - EASY TO REMOVE ======= */}
      {!gameState.levelCompleted && (
        <button
          onClick={debugCompletePuzzle}
          style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            padding: '10px 20px',
            background: 'red',
            color: 'white',
            border: '2px solid white',
            cursor: 'pointer',
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            zIndex: 1000
          }}
        >
          🐛 DEBUG: Complete Puzzle
        </button>
      )}
      {/* ======= END DEBUG BUTTON ======= */}
    </>
  );
}

export default Level3_PuzzleOfUs;
