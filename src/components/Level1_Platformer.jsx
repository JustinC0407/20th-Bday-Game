import { useRef, useEffect, useState, useCallback } from 'react';

// Constants for 48:9 side-scrolling level
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const LEVEL_WIDTH = SCREEN_WIDTH * 3; // 48:9 ratio (3x wider)
const LEVEL_HEIGHT = SCREEN_HEIGHT;

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const TOTAL_HEARTS = 20;

// Character constants (50x80px sprites - adjusted for PNG whitespace)
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 80;

function Level1_Platformer({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
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
  
  // Background image reference
  const backgroundRef = useRef(null);
  
  // Animation state for character
  const [animationState, setAnimationState] = useState('idle');
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationTimerRef = useRef(0);
  
  // Use ref for activeCheckpoint to ensure immediate updates
  const activeCheckpointRef = useRef({ x: 100, y: LEVEL_HEIGHT - 200 });
  
  // Game state
  const [gameState, setGameState] = useState({
    player: {
      x: 100, // Start position
      y: LEVEL_HEIGHT - 200,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      velocityX: 0,
      velocityY: 0,
      grounded: false,
      invincible: false,
      invincibilityTime: 0
    },
    camera: {
      x: 0, // Camera position
      y: 0
    },
    checkpoints: [],
    activeCheckpoint: { x: 100, y: LEVEL_HEIGHT - 200 }, // Starting checkpoint
    hearts: [],
    platforms: [],
    hazards: [],
    heartsCollected: 0,
    levelCompleted: false,
    gameStarted: false,
    gameOver: false
  });

  // Load sprites and background
  useEffect(() => {
    // Load character sprites
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
    
    // Load background image
    const bg = new Image();
    bg.onload = () => {
      backgroundRef.current = bg;
    };
    bg.onerror = () => {
      console.warn('Failed to load background: /level_1.jpeg');
    };
    bg.src = '/level_1.jpeg';
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

  // Initialize level data
  const initializeLevel = () => {
    // Platforms designed for 48:9 level with proper spacing and logical progression
    const platforms = [
      // Section 1 (0-33%): Starting area with ground-level progression
      { x: 0, y: LEVEL_HEIGHT - 120, width: LEVEL_WIDTH * 0.18, height: 60 }, // Starting ground platform
      { x: LEVEL_WIDTH * 0.22, y: LEVEL_HEIGHT - 120, width: LEVEL_WIDTH * 0.08, height: 40 }, // Small step up
      { x: LEVEL_WIDTH * 0.25, y: LEVEL_HEIGHT - 240, width: LEVEL_WIDTH * 0.08, height: 30 }, // Higher platform
      { x: LEVEL_WIDTH * 0.18, y: LEVEL_HEIGHT - 320, width: LEVEL_WIDTH * 0.06, height: 30 }, // Upper level access
      { x: LEVEL_WIDTH * 0.09, y: LEVEL_HEIGHT - 240, width: LEVEL_WIDTH * 0.05, height: 30 }, // Return path
      
      // Checkpoint 1 platform - safe and accessible
      { x: LEVEL_WIDTH * 0.32, y: LEVEL_HEIGHT - 160, width: LEVEL_WIDTH * 0.08, height: 40 }, // Checkpoint 1 platform
      
      // Section 2 (33-66%): Moderate difficulty with clear progression
      { x: LEVEL_WIDTH * 0.42, y: LEVEL_HEIGHT - 180, width: LEVEL_WIDTH * 0.07, height: 35 },
      { x: LEVEL_WIDTH * 0.51, y: LEVEL_HEIGHT - 260, width: LEVEL_WIDTH * 0.06, height: 30 },
      { x: LEVEL_WIDTH * 0.45, y: LEVEL_HEIGHT - 340, width: LEVEL_WIDTH * 0.05, height: 30 },
      { x: LEVEL_WIDTH * 0.54, y: LEVEL_HEIGHT - 200, width: LEVEL_WIDTH * 0.06, height: 30 },
      { x: LEVEL_WIDTH * 0.62, y: LEVEL_HEIGHT - 280, width: LEVEL_WIDTH * 0.05, height: 30 },
      
      // Checkpoint 2 platform - safe and accessible  
      { x: LEVEL_WIDTH * 0.65, y: LEVEL_HEIGHT - 140, width: LEVEL_WIDTH * 0.08, height: 40 }, // Checkpoint 2 platform
      
      // Section 3 (66-100%): Final challenge area
      { x: LEVEL_WIDTH * 0.75, y: LEVEL_HEIGHT - 200, width: LEVEL_WIDTH * 0.05, height: 30 },
      { x: LEVEL_WIDTH * 0.82, y: LEVEL_HEIGHT - 300, width: LEVEL_WIDTH * 0.04, height: 25 },
      { x: LEVEL_WIDTH * 0.78, y: LEVEL_HEIGHT - 380, width: LEVEL_WIDTH * 0.04, height: 25 },
      { x: LEVEL_WIDTH * 0.86, y: LEVEL_HEIGHT - 220, width: LEVEL_WIDTH * 0.05, height: 30 },
      { x: LEVEL_WIDTH * 0.93, y: LEVEL_HEIGHT - 160, width: LEVEL_WIDTH * 0.07, height: 50 }, // Final goal platform
    ];

    // Checkpoints positioned ON TOP of platform surfaces
    const checkpoints = [
      { x: LEVEL_WIDTH * 0.33, y: LEVEL_HEIGHT - 160 - 20, width: 40, height: 20, activated: false }, // ON TOP of checkpoint 1 platform
      { x: LEVEL_WIDTH * 0.66, y: LEVEL_HEIGHT - 140 - 20, width: 40, height: 20, activated: false }  // ON TOP of checkpoint 2 platform
    ];

    // 20 Hearts distributed safely across 3 sections, away from spikes
    const hearts = [];
    
    // Section 1 (0-33%): Simple static and floating hearts (7 hearts) - positioned on/near platforms
    hearts.push(
      { id: 1, x: LEVEL_WIDTH * 0.05, y: LEVEL_HEIGHT - 200, pattern: 'static' }, // On starting platform
      { id: 2, x: LEVEL_WIDTH * 0.15, y: LEVEL_HEIGHT - 180, pattern: 'static' }, // Safe air space
      { id: 3, x: LEVEL_WIDTH * 0.20, y: LEVEL_HEIGHT - 280, pattern: 'float', baseY: LEVEL_HEIGHT - 280, floatOffset: 0 }, // Above platform area
      { id: 4, x: LEVEL_WIDTH * 0.26, y: LEVEL_HEIGHT - 180, pattern: 'static' }, // On step platform
      { id: 5, x: LEVEL_WIDTH * 0.27, y: LEVEL_HEIGHT - 270, pattern: 'float', baseY: LEVEL_HEIGHT - 270, floatOffset: Math.PI }, // Above higher platform
      { id: 6, x: LEVEL_WIDTH * 0.14, y: LEVEL_HEIGHT - 270, pattern: 'static' }, // On return path platform
      { id: 7, x: LEVEL_WIDTH * 0.35, y: LEVEL_HEIGHT - 200, pattern: 'static' } // On checkpoint 1 platform
    );
    
    // Section 2 (33-66%): Moving patterns (7 hearts) - positioned safely
    hearts.push(
      { id: 8, x: LEVEL_WIDTH * 0.44, y: LEVEL_HEIGHT - 220, pattern: 'horizontal', baseX: LEVEL_WIDTH * 0.44, moveOffset: 0 }, // Above platforms
      { id: 9, x: LEVEL_WIDTH * 0.48, y: LEVEL_HEIGHT - 300, pattern: 'static' }, // Above safe air
      { id: 10, x: LEVEL_WIDTH * 0.53, y: LEVEL_HEIGHT - 290, pattern: 'float', baseY: LEVEL_HEIGHT - 290, floatOffset: 0 }, // Above platform
      { id: 11, x: LEVEL_WIDTH * 0.47, y: LEVEL_HEIGHT - 370, pattern: 'circular', centerX: LEVEL_WIDTH * 0.47, centerY: LEVEL_HEIGHT - 370, angle: 0 }, // High safe area
      { id: 12, x: LEVEL_WIDTH * 0.56, y: LEVEL_HEIGHT - 230, pattern: 'horizontal', baseX: LEVEL_WIDTH * 0.56, moveOffset: Math.PI }, // Between platforms
      { id: 13, x: LEVEL_WIDTH * 0.64, y: LEVEL_HEIGHT - 310, pattern: 'float', baseY: LEVEL_HEIGHT - 310, floatOffset: Math.PI/2 }, // Above platforms
      { id: 14, x: LEVEL_WIDTH * 0.68, y: LEVEL_HEIGHT - 180, pattern: 'static' } // On checkpoint 2 platform
    );
    
    // Section 3 (66-100%): Complex patterns (6 hearts) - challenging but safe
    hearts.push(
      { id: 15, x: LEVEL_WIDTH * 0.77, y: LEVEL_HEIGHT - 240, pattern: 'circular', centerX: LEVEL_WIDTH * 0.77, centerY: LEVEL_HEIGHT - 240, angle: 0 }, // Between platforms
      { id: 16, x: LEVEL_WIDTH * 0.80, y: LEVEL_HEIGHT - 330, pattern: 'float', baseY: LEVEL_HEIGHT - 330, floatOffset: 0 }, // High above spikes
      { id: 17, x: LEVEL_WIDTH * 0.84, y: LEVEL_HEIGHT - 340, pattern: 'horizontal', baseX: LEVEL_WIDTH * 0.84, moveOffset: 0 }, // High platform area
      { id: 18, x: LEVEL_WIDTH * 0.81, y: LEVEL_HEIGHT - 410, pattern: 'circular', centerX: LEVEL_WIDTH * 0.81, centerY: LEVEL_HEIGHT - 410, angle: Math.PI }, // Very high, safe
      { id: 19, x: LEVEL_WIDTH * 0.88, y: LEVEL_HEIGHT - 250, pattern: 'float', baseY: LEVEL_HEIGHT - 250, floatOffset: Math.PI }, // Above final platforms
      { id: 20, x: LEVEL_WIDTH * 0.95, y: LEVEL_HEIGHT - 210, pattern: 'static' } // On final goal platform
    );

    // Hazards positioned away from hearts and in logical challenge areas
    const hazards = [
      // Section 1: Minimal hazards in safe gaps
      { type: 'spike', x: LEVEL_WIDTH * 0.19, y: LEVEL_HEIGHT - 140, width: 16, height: 16 }, // Between platforms, not under hearts
      { type: 'spike', x: LEVEL_WIDTH * 0.195, y: LEVEL_HEIGHT - 140, width: 16, height: 16 },
      
      // Section 2: Moderate hazards + moving blocks in strategic locations
      { type: 'spike', x: LEVEL_WIDTH * 0.40, y: LEVEL_HEIGHT - 200, width: 16, height: 16 }, // Platform gap area
      { type: 'spike', x: LEVEL_WIDTH * 0.405, y: LEVEL_HEIGHT - 200, width: 16, height: 16 },
      { 
        type: 'moving_block', 
        x: LEVEL_WIDTH * 0.49, y: LEVEL_HEIGHT - 240, width: 40, height: 40, // Between platform sections
        baseX: LEVEL_WIDTH * 0.49, moveRange: 60, moveOffset: 0, direction: 1
      },
      { type: 'spike', x: LEVEL_WIDTH * 0.58, y: LEVEL_HEIGHT - 220, width: 16, height: 16 }, // Safe from hearts above
      { type: 'spike', x: LEVEL_WIDTH * 0.585, y: LEVEL_HEIGHT - 220, width: 16, height: 16 },
      
      // Section 3: Dense hazards creating platforming challenges
      { type: 'spike', x: LEVEL_WIDTH * 0.72, y: LEVEL_HEIGHT - 240, width: 16, height: 16 }, // Below platform level
      { type: 'spike', x: LEVEL_WIDTH * 0.725, y: LEVEL_HEIGHT - 240, width: 16, height: 16 },
      { type: 'spike', x: LEVEL_WIDTH * 0.73, y: LEVEL_HEIGHT - 240, width: 16, height: 16 },
      { 
        type: 'moving_block', 
        x: LEVEL_WIDTH * 0.79, y: LEVEL_HEIGHT - 320, width: 40, height: 40, // High patrol area
        baseX: LEVEL_WIDTH * 0.79, moveRange: 80, moveOffset: Math.PI, direction: 1
      },
      { type: 'spike', x: LEVEL_WIDTH * 0.89, y: LEVEL_HEIGHT - 250, width: 16, height: 16 }, // Final challenge area
      { type: 'spike', x: LEVEL_WIDTH * 0.895, y: LEVEL_HEIGHT - 250, width: 16, height: 16 },
      { 
        type: 'moving_block', 
        x: LEVEL_WIDTH * 0.91, y: LEVEL_HEIGHT - 200, width: 40, height: 40, // Final moving obstacle
        baseX: LEVEL_WIDTH * 0.91, moveRange: 50, moveOffset: 0, direction: 1
      }
    ];

    console.log('🎮 INITIALIZING LEVEL 1');
    console.log('  - Platforms:', platforms.length);
    console.log('  - Hearts:', hearts.length);
    console.log('  - Hazards:', hazards.length);
    console.log('  - Checkpoints:', checkpoints.length);
    console.log('  - Level width:', LEVEL_WIDTH);
    console.log('  - Starting activeCheckpoint:', { x: 100, y: LEVEL_HEIGHT - 200 });
    console.log('  - Checkpoint positions:');
    checkpoints.forEach((cp, i) => {
      console.log(`    Checkpoint ${i + 1}: x=${cp.x}, y=${cp.y}`);
    });
    
    setGameState(prev => ({
      ...prev,
      platforms,
      hearts,
      hazards,
      checkpoints,
      gameStarted: true,
      heartsCollected: 0,
      levelCompleted: false
    }));
    
    console.log('✅ Level initialization complete');
  };

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Collision detection
  const checkCollision = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  // Update camera position with smooth following and edge clamping
  const updateCamera = (player) => {
    const targetCameraX = player.x - SCREEN_WIDTH / 2;
    
    // Clamp camera to level boundaries
    const clampedCameraX = Math.max(0, Math.min(LEVEL_WIDTH - SCREEN_WIDTH, targetCameraX));
    
    return { x: clampedCameraX, y: 0 };
  };

  // ======= DEBUG FUNCTION - EASY TO REMOVE =======
  const debugCollectAllHearts = () => {
    setGameState(prevState => ({
      ...prevState,
      heartsCollected: TOTAL_HEARTS
    }));
    console.log('DEBUG: Collected all hearts instantly!');
  };
  // ======= END DEBUG FUNCTION =======

  // Game over detection - check when lives reach 0
  useEffect(() => {
    if (lives <= 0 && gameState.gameStarted && !gameState.levelCompleted && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
    }
  }, [lives, gameState.gameStarted, gameState.levelCompleted, gameState.gameOver]);

  // Handle game over dialog actions
  const handleRetry = () => {
    // Reset lives to 3 in App.jsx
    onResetLives();
    
    // Reset level to beginning with no hearts collected
    console.log('Game retry - resetting all progress and checkpoints');
    
    // Reset the activeCheckpoint ref
    activeCheckpointRef.current = { x: 100, y: LEVEL_HEIGHT - 200 };
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        x: 100,
        y: LEVEL_HEIGHT - 200,
        velocityX: 0,
        velocityY: 0,
        grounded: false,
        invincible: false,
        invincibilityTime: 0
      },
      camera: { x: 0, y: 0 },
      activeCheckpoint: { x: 100, y: LEVEL_HEIGHT - 200 }, // Start at beginning
      heartsCollected: 0,
      gameOver: false,
      // Reset checkpoints to unactivated state
      checkpoints: prev.checkpoints.map(checkpoint => ({ ...checkpoint, activated: false })),
      // Reset hearts to original positions (re-initialize)
      hearts: [] // Will be re-initialized by initializeLevel effect
    }));
    
    // Reset animation state
    setAnimationState('idle');
    setAnimationFrame(0);
    animationTimerRef.current = 0;
    
    // Trigger re-initialization
    setTimeout(() => {
      initializeLevel();
    }, 100);
  };

  const handleReturnToHub = () => {
    onReturnToHub();
  };

  // Initialize level on mount
  useEffect(() => {
    if (!gameState.gameStarted) {
      console.log('🔄 Running initializeLevel (gameStarted is false)');
      initializeLevel();
    }
  }, [gameState.gameStarted]);

  // Game loop
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const gameLoop = () => {
      setGameState(prevState => {
        if (prevState.levelCompleted || prevState.gameOver) return prevState;

        const newState = { ...prevState };
        const player = { ...newState.player };
        
        // Debug: Log current activeCheckpoint at start of game loop
        if (Math.floor(Date.now() / 5000) !== Math.floor((Date.now() - 16) / 5000)) {
          console.log('🔄 Game loop - Current activeCheckpoint:', prevState.activeCheckpoint);
        }
        
        // Handle invincibility timer
        if (player.invincible) {
          player.invincibilityTime -= 1;
          if (player.invincibilityTime <= 0) {
            player.invincible = false;
            player.invincibilityTime = 0;
          }
        }
        
        // Handle animation state
        const keys = keysRef.current;
        let newAnimationState = 'idle';
        let isMoving = false;
        
        // Input handling
        if (keys['ArrowLeft'] || keys['KeyA']) {
          player.velocityX = -MOVE_SPEED;
          newAnimationState = 'runLeft';
          isMoving = true;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
          player.velocityX = MOVE_SPEED;
          newAnimationState = 'runRight';
          isMoving = true;
        } else {
          player.velocityX *= 0.8; // Friction
        }

        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.grounded) {
          player.velocityY = JUMP_FORCE;
          player.grounded = false;
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

        // Apply gravity
        player.velocityY += GRAVITY;

        // Update position
        player.x += player.velocityX;
        player.y += player.velocityY;

        // Platform collision
        player.grounded = false;
        for (const platform of newState.platforms) {
          if (checkCollision(player, platform)) {
            // Landing on top
            if (player.velocityY > 0 && player.y < platform.y) {
              player.y = platform.y - player.height;
              player.velocityY = 0;
              player.grounded = true;
            }
            // Hit from below
            else if (player.velocityY < 0 && player.y > platform.y) {
              player.y = platform.y + platform.height;
              player.velocityY = 0;
            }
            // Hit from sides
            else if (player.velocityX > 0) {
              player.x = platform.x - player.width;
            } else if (player.velocityX < 0) {
              player.x = platform.x + platform.width;
            }
          }
        }

        // Level boundary collision
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > LEVEL_WIDTH) player.x = LEVEL_WIDTH - player.width;
        if (player.y > LEVEL_HEIGHT && !player.invincible) {
          // Fell off screen - respawn at active checkpoint and lose life
          console.log('💀 PLAYER FELL OFF SCREEN!');
          console.log('  - Current activeCheckpoint (ref):', activeCheckpointRef.current);
          console.log('  - Current activeCheckpoint (state):', newState.activeCheckpoint);
          console.log('  - Respawning at:', activeCheckpointRef.current);
          player.x = activeCheckpointRef.current.x;
          player.y = activeCheckpointRef.current.y;
          player.velocityX = 0;
          player.velocityY = 0;
          player.grounded = false;
          player.invincible = true;
          player.invincibilityTime = 120; // 2 seconds at 60 FPS
          onLoseLife();
        }

        // Checkpoint collision
        for (let i = 0; i < newState.checkpoints.length; i++) {
          const checkpoint = newState.checkpoints[i];
          if (!checkpoint.activated && checkCollision(player, checkpoint)) {
            // Activate checkpoint - spawn player ON TOP of the platform the checkpoint sits on
            newState.checkpoints[i] = { ...checkpoint, activated: true };
            // Spawn player ON TOP of the platform the checkpoint sits on
            // Checkpoint 1 sits on platform at LEVEL_HEIGHT - 160
            // Checkpoint 2 sits on platform at LEVEL_HEIGHT - 140  
            const platformY = i === 0 ? LEVEL_HEIGHT - 160 : LEVEL_HEIGHT - 140;
            const newActiveCheckpoint = { 
              x: checkpoint.x + 10, // Slight offset from checkpoint button
              y: platformY - player.height  // ON TOP of platform surface
            };
            
            // Update both ref and state
            activeCheckpointRef.current = newActiveCheckpoint;
            newState.activeCheckpoint = newActiveCheckpoint;
            console.log('🚩 CHECKPOINT ACTIVATED!');
            console.log('  - Checkpoint ID:', i + 1);
            console.log('  - Checkpoint position:', { x: checkpoint.x, y: checkpoint.y });
            console.log('  - New activeCheckpoint:', newState.activeCheckpoint);
            console.log('  - Player current position:', { x: player.x, y: player.y });
          }
        }

        // Update hearts with patterns
        const updatedHearts = newState.hearts.map(heart => {
          const newHeart = { ...heart };
          
          switch (heart.pattern) {
            case 'float':
              newHeart.floatOffset += 0.05;
              newHeart.y = heart.baseY + Math.sin(newHeart.floatOffset) * 30;
              break;
            case 'horizontal':
              newHeart.moveOffset += 0.03;
              newHeart.x = heart.baseX + Math.sin(newHeart.moveOffset) * 50;
              break;
            case 'circular':
              newHeart.angle += 0.02;
              newHeart.x = heart.centerX + Math.cos(newHeart.angle) * 40;
              newHeart.y = heart.centerY + Math.sin(newHeart.angle) * 25;
              break;
          }
          
          return newHeart;
        });

        // Heart collection
        const collectedHearts = [];
        const remainingHearts = updatedHearts.filter(heart => {
          const heartRect = { x: heart.x, y: heart.y, width: 20, height: 20 };
          if (checkCollision(player, heartRect)) {
            collectedHearts.push(heart);
            return false;
          }
          return true;
        });

        // Update hearts collected count
        if (collectedHearts.length > 0) {
          newState.heartsCollected += collectedHearts.length;
        }

        // Update moving hazards
        const updatedHazards = newState.hazards.map(hazard => {
          if (hazard.type === 'moving_block') {
            const newHazard = { ...hazard };
            newHazard.moveOffset += 0.02;
            newHazard.x = hazard.baseX + Math.sin(newHazard.moveOffset) * hazard.moveRange;
            return newHazard;
          }
          return hazard;
        });

        // Hazard collision (only if not invincible)
        if (!player.invincible) {
          for (const hazard of updatedHazards) {
            if (checkCollision(player, hazard)) {
              // Reset player position to active checkpoint and lose life
              console.log('⚠️ PLAYER HIT HAZARD!');
              console.log('  - Current activeCheckpoint (ref):', activeCheckpointRef.current);
              console.log('  - Current activeCheckpoint (state):', newState.activeCheckpoint);
              console.log('  - Respawning at:', activeCheckpointRef.current);
              player.x = activeCheckpointRef.current.x;
              player.y = activeCheckpointRef.current.y;
              player.velocityX = 0;
              player.velocityY = 0;
              player.grounded = false;
              player.invincible = true;
              player.invincibilityTime = 120; // 2 seconds at 60 FPS
              
              // Lose a life
              onLoseLife();
              
              break; // Exit hazard loop to avoid multiple hits
            }
          }
        }

        // Update camera position
        newState.camera = updateCamera(player);

        // Win condition - all hearts collected and reached end area
        if (newState.heartsCollected === TOTAL_HEARTS && player.x > LEVEL_WIDTH * 0.9) {
          newState.levelCompleted = true;
          // Trigger memory unlock
          setTimeout(() => {
            onComplete({
              title: "How We Met",
              type: "text",
              content: "Every moment with you started right here. [Placeholder for intro video/text about how we met]"
            });
          }, 500);
        }

        return {
          ...newState,
          player,
          hearts: remainingHearts,
          hazards: updatedHazards
        };
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gameStarted, gameState.gameOver, onComplete, onLoseLife, animationState]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState.gameStarted) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Crisp pixel art

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      
      // Draw background (static, properly positioned for 48:9)
      if (backgroundRef.current) {
        // Position background relative to camera
        const bgX = -gameState.camera.x;
        ctx.drawImage(backgroundRef.current, bgX, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
      } else {
        // Fallback sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E6F3FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }

      // Transform context for camera offset
      ctx.save();
      ctx.translate(-gameState.camera.x, 0);

      // Draw platforms
      ctx.fillStyle = '#8B4513';
      gameState.platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        // Visual border for platforms
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      });

      // Draw checkpoints
      gameState.checkpoints.forEach(checkpoint => {
        ctx.fillStyle = checkpoint.activated ? '#00FF00' : '#FFD700';
        ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
        
        // Checkpoint indicator
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(checkpoint.activated ? '✓' : '🚩', checkpoint.x + 12, checkpoint.y + 15);
      });

      // Draw hearts
      ctx.fillStyle = '#FF1493';
      gameState.hearts.forEach(heart => {
        ctx.fillRect(heart.x, heart.y, 20, 20);
        // Heart symbol
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.fillText('♥', heart.x + 2, heart.y + 16);
        ctx.fillStyle = '#FF1493';
      });

      // Draw hazards
      gameState.hazards.forEach(hazard => {
        if (hazard.type === 'spike') {
          // Draw spike
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.moveTo(hazard.x + hazard.width/2, hazard.y);
          ctx.lineTo(hazard.x, hazard.y + hazard.height);
          ctx.lineTo(hazard.x + hazard.width, hazard.y + hazard.height);
          ctx.closePath();
          ctx.fill();
        } else if (hazard.type === 'moving_block') {
          // Draw moving enemy
          ctx.fillStyle = '#8B0000';
          ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(hazard.x, hazard.y, hazard.width, hazard.height);
        }
      });

      // Draw player (with sprite or fallback)
      const shouldFlash = gameState.player.invincible && Math.floor(gameState.player.invincibilityTime / 10) % 2 === 0;
      if (!shouldFlash) {
        const currentSprite = getCurrentSprite();
        if (currentSprite) {
          // Draw 80x80 sprite centered in 50px width (clips 15px off each side)
          const spriteSize = 80;
          const offsetX = (PLAYER_WIDTH - spriteSize) / 2; // Centers the 80px sprite in 50px width
          ctx.drawImage(
            currentSprite,
            gameState.player.x + offsetX, // Center horizontally
            gameState.player.y,
            spriteSize, // Keep original 80x80 size
            spriteSize
          );
        } else {
          // Fallback to colored rectangle
          ctx.fillStyle = '#4169E1';
          ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);
          ctx.strokeStyle = '#000080';
          ctx.lineWidth = 2;
          ctx.strokeRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);
        }
      }

      // Draw goal area
      if (gameState.heartsCollected === TOTAL_HEARTS) {
        const goalX = LEVEL_WIDTH * 0.9;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(goalX, 0, LEVEL_WIDTH * 0.1, LEVEL_HEIGHT);
        ctx.fillStyle = '#FFD700';
        ctx.font = '32px Arial';
        ctx.fillText('GOAL!', goalX + 20, 80);
      }

      // Restore context
      ctx.restore();
    };

    render();
  }, [gameState, animationState, animationFrame]);

  return (
    <div className="canvas-container">
      {/* Game Title */}
      <div className="level-title-header">
        <h2>❤️ Level 1: Heart Collect Run</h2>
        <p>Collect all {TOTAL_HEARTS} hearts and reach the goal!</p>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        className="game-canvas"
      />

      {/* Game UI */}
      <div className="game-ui">
        <div className="hearts-counter">
          <span className="heart-icon">❤️</span>
          Hearts: {gameState.heartsCollected}/{TOTAL_HEARTS}
        </div>
        <div className="lives-counter">
          <span className="heart-icon">💖</span>
          Lives: {lives}
        </div>
        <div className="checkpoint-indicator">
          <span className="checkpoint-icon">🚩</span>
          Checkpoint: {gameState.checkpoints.filter(c => c.activated).length}/2
        </div>
        {/* ======= DEBUG BUTTON - EASY TO REMOVE ======= */}
        {!gameState.levelCompleted && (
          <button 
            className="debug-button" 
            onClick={debugCollectAllHearts}
            style={{
              backgroundColor: '#ff4444',
              color: 'white',
              border: '2px solid #cc0000',
              padding: '8px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
          >
            🐛 DEBUG: Collect All Hearts
          </button>
        )}
        {/* ======= END DEBUG BUTTON ======= */}
      </div>

      {/* Return to Hub Button - Bottom Right */}
      <button
        onClick={onReturnToHub}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '12px 24px',
          fontSize: '12px',
          fontFamily: '"Press Start 2P", monospace',
          background: '#8B4513',
          color: '#fff',
          border: '3px solid #fff',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          zIndex: 999
        }}
      >
        Return to Hub
      </button>

      {/* Level completion overlay */}
      {gameState.levelCompleted && (
        <div className="completion-overlay">
          <h2>🎉 Level Complete! 🎉</h2>
          <p>You collected all {TOTAL_HEARTS} hearts! A memory is being unlocked...</p>
        </div>
      )}

      {/* Game over dialog */}
      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h2>💔 Game Over 💔</h2>
            <p>You've run out of lives!</p>
            <p>Would you like to try again or return to the hub?</p>
            <div className="game-over-buttons">
              <button className="retry-button" onClick={handleRetry}>
                🔄 Try Again
              </button>
              <button className="hub-button" onClick={handleReturnToHub}>
                🏠 Return to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Level1_Platformer;