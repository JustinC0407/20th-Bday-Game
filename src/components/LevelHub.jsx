import { useState, useRef, useEffect } from 'react';
// Use direct URL for public assets

function LevelHub({ gameState, onStartLevel, onOpenMemoryRoom, onResetGame }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [character, setCharacter] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    targetX: null,
    targetY: null,
    isMoving: false
  });
  const [nearestLevel, setNearestLevel] = useState(null);
  const [fallingLeaves, setFallingLeaves] = useState([]);
  const keysRef = useRef({});
  
  // Sprite references for character animation
  const spriteRefs = useRef({
    standing: null,
    runLeft1: null,
    runLeft2: null,
    runLeft3: null,
    runRight1: null,
    runRight2: null,
    runRight3: null
  });
  
  // Animation state for character
  const [animationState, setAnimationState] = useState('idle');
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationTimerRef = useRef(0);
  
  const { completedLevels, progress } = gameState;

  // Level data positioned in heart shape (avoiding title area)
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;
  
  // Heart shape coordinates with safe margins
  const levels = [
    // Top left of heart
    { number: 1, title: "Heart Collect", icon: "❤️", x: centerX, y: centerY - screenHeight * 0.05 },
    // Left side of heart  
    { number: 2, title: "Catch Kiss", icon: "💋", x: centerX - screenWidth * 0.15, y: centerY - screenHeight * 0.15 },
    // Bottom left of heart point
    { number: 3, title: "Puzzle of Us", icon: "🧩", x: centerX - screenWidth * 0.225, y: centerY},
    // Bottom right of heart point
    { number: 4, title: "20 Stars", icon: "⭐", x: centerX, y: centerY + screenHeight * 0.35 },
    // Right side of heart
    { number: 5, title: "Boss Fight", icon: "👾", x: centerX + screenWidth * 0.225, y: centerY },
    // Top right of heart
    { number: 6, title: "Pick Memory", icon: "📸", x: centerX + screenWidth * 0.15, y: centerY - screenHeight * 0.15 }
  ];
  
  // Memory room position (positioned above heart shape)
  const memoryRoom = { 
    x: centerX - 40, 
    y: centerY - screenHeight * 0.2,
    width: 80,
    height: 60
  };

  // Check if a level is available to play
  const isLevelAvailable = (levelNumber) => {
    if (levelNumber === 1) return true; // First level always available
    return completedLevels.includes(levelNumber - 1); // Previous level must be completed
  };

  // Check if memory room is available (all levels completed)
  const isMemoryRoomAvailable = () => {
    return completedLevels.length === 6;
  };

  // Get level circle class based on status
  const getLevelCircleClass = (levelNumber) => {
    if (completedLevels.includes(levelNumber)) return "completed";
    if (isLevelAvailable(levelNumber)) return "available";
    return "locked";
  };

  // Get pathway line class
  const getPathwayLineClass = (levelNumber) => {
    return completedLevels.includes(levelNumber) ? "pathway-line completed" : "pathway-line";
  };

  const handleResetGame = () => {
    onResetGame();
    setShowResetConfirm(false);
  };

  // Load player sprites
  useEffect(() => {
    const spriteFiles = {
      standing: '/src/assets/sprites/standing.png',
      runLeft1: '/src/assets/sprites/runleft1.png',
      runLeft2: '/src/assets/sprites/runleft2.png',
      runLeft3: '/src/assets/sprites/runleft3.png',
      runRight1: '/src/assets/sprites/runright1.png',
      runRight2: '/src/assets/sprites/runright2.png',
      runRight3: '/src/assets/sprites/runright3.png'
    };

    Object.entries(spriteFiles).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        spriteRefs.current[key] = img;
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${src}`);
      };
      img.src = src;
    });
  }, []);

  // Sprite selection helper function
  const getCurrentSprite = () => {
    const sprites = spriteRefs.current;
    
    switch (animationState) {
      case 'runLeft':
        const leftSprites = [sprites.runLeft1, sprites.runLeft2, sprites.runLeft3];
        return leftSprites[animationFrame] || null;
      case 'runRight':
        const rightSprites = [sprites.runRight1, sprites.runRight2, sprites.runRight3];
        return rightSprites[animationFrame] || null;
      case 'idle':
      default:
        return sprites.standing || null;
    }
  };

  // Input handling for character movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
      
      // Handle Enter key for level entry
      if (e.code === 'Enter' && nearestLevel) {
        if (nearestLevel.type === 'level') {
          if (isLevelAvailable(nearestLevel.number)) {
            onStartLevel(nearestLevel.number);
          }
        } else if (nearestLevel.type === 'memoryRoom') {
          if (isMemoryRoomAvailable()) {
            onOpenMemoryRoom();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nearestLevel, onStartLevel, onOpenMemoryRoom]);

  // Character movement and collision detection
  useEffect(() => {
    const moveSpeed = 3;
    
    const updateCharacter = () => {
      const keys = keysRef.current;
      
      // Update animation state and frame timing
      let newAnimationState = 'idle';
      let isMoving = false;
      
      if (keys['ArrowLeft'] || keys['KeyA']) {
        newAnimationState = 'runLeft';
        isMoving = true;
      } else if (keys['ArrowRight'] || keys['KeyD']) {
        newAnimationState = 'runRight';
        isMoving = true;
      } else if (keys['ArrowUp'] || keys['KeyW'] || keys['ArrowDown'] || keys['KeyS']) {
        // For up/down movement, prioritize left/right if also pressed, otherwise use right animation
        newAnimationState = 'runRight';
        isMoving = true;
      }
      
      // Update animation state if changed
      if (newAnimationState !== animationState) {
        setAnimationState(newAnimationState);
        setAnimationFrame(0);
        animationTimerRef.current = 0;
      }
      
      // Handle frame animation timing for running animations
      if (isMoving) {
        animationTimerRef.current += 1;
        if (animationTimerRef.current >= 12) { // 12 frames = ~200ms at 60fps
          animationTimerRef.current = 0;
          setAnimationFrame(prev => (prev + 1) % 3);
        }
      } else {
        // Reset to idle frame when not moving
        setAnimationFrame(0);
        animationTimerRef.current = 0;
      }
      
      setCharacter(prev => {
        let newX = prev.x;
        let newY = prev.y;
        
        // Handle WASD and Arrow key movement
        if (keys['ArrowLeft'] || keys['KeyA']) newX -= moveSpeed;
        if (keys['ArrowRight'] || keys['KeyD']) newX += moveSpeed;
        if (keys['ArrowUp'] || keys['KeyW']) newY -= moveSpeed;
        if (keys['ArrowDown'] || keys['KeyS']) newY += moveSpeed;
        
        // Keep character within screen bounds
        newX = Math.max(40, Math.min(window.innerWidth - 40, newX));
        newY = Math.max(40, Math.min(window.innerHeight - 40, newY));
        
        return {
          ...prev,
          x: newX,
          y: newY
        };
      });
    };

    const gameLoop = setInterval(updateCharacter, 1000/60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [animationState]); // Add animationState to dependencies

  // Check proximity to levels and memory room
  useEffect(() => {
    const proximityDistance = 80;
    let nearest = null;
    let minDistance = Infinity;

    // Check distance to levels
    levels.forEach(level => {
      const distance = Math.sqrt(
        Math.pow(character.x - level.x, 2) + 
        Math.pow(character.y - level.y, 2)
      );
      
      if (distance < proximityDistance && distance < minDistance) {
        nearest = { ...level, type: 'level', distance };
        minDistance = distance;
      }
    });

    // Check distance to memory room
    const memoryDistance = Math.sqrt(
      Math.pow(character.x - (memoryRoom.x + memoryRoom.width/2), 2) + 
      Math.pow(character.y - (memoryRoom.y + memoryRoom.height/2), 2)
    );
    
    if (memoryDistance < proximityDistance && memoryDistance < minDistance) {
      nearest = { ...memoryRoom, type: 'memoryRoom', distance: memoryDistance };
    }

    setNearestLevel(nearest);
  }, [character.x, character.y]);

  // Generate falling leaves
  useEffect(() => {
    const generateLeaf = () => {
      const leafTypes = ['🍂', '🍁', '🍃'];
      const animationClasses = ['leaf-1', 'leaf-2', 'leaf-3'];
      
      const newLeaf = {
        id: Date.now() + Math.random(),
        type: leafTypes[Math.floor(Math.random() * leafTypes.length)],
        animationClass: animationClasses[Math.floor(Math.random() * animationClasses.length)],
        x: Math.random() * window.innerWidth,
        delay: Math.random() * 1000 // Reduced delay for more immediate visibility
      };

      setFallingLeaves(prev => [...prev, newLeaf]);

      // Remove leaf after animation completes (max 8 seconds + delay)
      setTimeout(() => {
        setFallingLeaves(prev => prev.filter(leaf => leaf.id !== newLeaf.id));
      }, 9000 + newLeaf.delay);
    };

    // Generate a leaf every 0.5-1.5 seconds for testing
    const leafInterval = setInterval(() => {
      generateLeaf();
    }, 500 + Math.random() * 1000);

    // Generate some initial leaves
    for (let i = 0; i < 5; i++) {
      setTimeout(generateLeaf, i * 800);
    }

    return () => clearInterval(leafInterval);
  }, []);


  return (
    <div 
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
        backgroundImage: 'url(/home_screen.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated'
      }}
    >

      {/* Game Title */}
      <div className="game-title">
        <h1>Level 20:Aiden's Birthday Adventure!</h1>
      </div>

      {/* Level Circles with proper curved positioning */}
      {levels.map((level) => (
        <div
          key={level.number}
          className={`level-circle-container ${getLevelCircleClass(level.number)}`}
          style={{
            position: 'absolute',
            left: level.x,
            top: level.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 25
          }}
          title={`${level.title} ${completedLevels.includes(level.number) ? '(Completed)' : isLevelAvailable(level.number) ? '(Available)' : '(Locked)'}`}
        >
          <div className="level-circle">
            {completedLevels.includes(level.number) ? '✓' : level.number}
          </div>
          <div className="level-title">
            <span className="level-icon">{level.icon}</span>
            <span className="level-name">{level.title}</span>
          </div>
        </div>
      ))}

      {/* Positioned Memory Room */}
      <div
        className={`positioned-memory-room memory-room ${isMemoryRoomAvailable() ? 'available' : 'locked'}`}
        style={{
          position: 'absolute',
          left: memoryRoom.x,
          top: memoryRoom.y
        }}
        title={`Memory Room ${isMemoryRoomAvailable() ? '(Available)' : '(Complete all levels to unlock)'}`}
      >
        🏠
        <div className="memory-room-title">Memory Room</div>
      </div>

      {/* Falling Leaves */}
      {fallingLeaves.map(leaf => (
        <div
          key={leaf.id}
          className={`falling-leaf ${leaf.animationClass}`}
          style={{
            left: leaf.x,
            animationDelay: `${leaf.delay}ms`
          }}
        >
          {leaf.type}
        </div>
      ))}

      {/* Moveable Character */}
      <div
        className="game-character"
        style={{
          position: 'absolute',
          left: character.x - 40,
          top: character.y - 40,
          transform: 'translate(-50%, -50%)',
          width: '80px',
          height: '80px'
        }}
      >
        {(() => {
          const currentSprite = getCurrentSprite();
          if (currentSprite) {
            return (
              <img
                src={currentSprite.src}
                alt="Character"
                style={{
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated'
                }}
              />
            );
          } else {
            // Fallback to emoji if sprites not loaded
            return <span style={{ fontSize: '60px' }}>🚶‍♂️</span>;
          }
        })()}
      </div>

      {/* Proximity Prompt */}
      {nearestLevel && (
        <div
          className="proximity-prompt"
          style={{
            position: 'absolute',
            left: character.x,
            top: character.y - 50,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="prompt-bubble">
            Press ENTER to {nearestLevel.type === 'level' ? 'enter level' : 'open memory room'}
          </div>
        </div>
      )}

      {/* Control Instructions */}
      <div className="hub-control-instructions">
        <h4>🎮 Hub Controls</h4>
        <p><strong>Move:</strong> WASD or Arrow Keys</p>
        <p><strong>Enter Level:</strong> Walk near a level and press Enter</p>
        <p><strong>Goal:</strong> Complete all 6 levels :D</p>
      </div>

      {/* Progress Display */}
      <div className="progress-display">
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-value">{completedLevels.length}/6</span>
            <span className="stat-label">Levels</span>
          </div>
          <div className="stat">
            <span className="stat-value">{gameState.unlockedMemories.length}</span>
            <span className="stat-label">Memories</span>
          </div>
        </div>
      </div>

      {/* Game Options */}
      <div className="game-options">
        {!showResetConfirm ? (
          <button 
            className="reset-button" 
            onClick={() => setShowResetConfirm(true)}
            title="Reset all progress and start over"
          >
            🔄 Reset
          </button>
        ) : (
          <div className="reset-confirm">
            <p>Reset all progress?</p>
            <div className="confirm-buttons">
              <button className="confirm-yes" onClick={handleResetGame}>
                Yes
              </button>
              <button className="confirm-no" onClick={() => setShowResetConfirm(false)}>
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LevelHub;