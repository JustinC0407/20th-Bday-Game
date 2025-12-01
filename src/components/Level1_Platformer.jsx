import { useRef, useEffect, useState } from 'react';

// ============ CONSTANTS ============
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const LEVEL_WIDTH = SCREEN_WIDTH * 3; // 48:9 ratio (3x wider)
const LEVEL_HEIGHT = SCREEN_HEIGHT;

const GRAVITY = 0.5;
const JUMP_FORCE = -12; // Max height approx 144px
const MOVE_SPEED = 5;
const TOTAL_HEARTS = 20;

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 80;

function Level1_Platformer({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({});
  
  // Sprite references
  const spriteRefs = useRef({
    standing: null,
    runLeft1: null,
    runLeft2: null,
    runLeft3: null,
    runRight1: null,
    runRight2: null,
    runRight3: null,
    heart: null
  });
  
  const backgroundRef = useRef(null);
  const grassBlockRef = useRef(null);
  const audioRef = useRef(null);
  const jumpSoundRef = useRef(null);
  const heartPickupSoundRef = useRef(null);
  const deathSoundRef = useRef(null);

  // Animation state
  const [animationState, setAnimationState] = useState('idle');
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationTimerRef = useRef(0);
  
  // Physics/Game Refs
  const activeCheckpointRef = useRef({ x: 100, y: LEVEL_HEIGHT - 200 });
  
  // ============ GAME STATE ============
  const [gameState, setGameState] = useState({
    player: {
      x: 100,
      y: LEVEL_HEIGHT - 200,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      velocityX: 0,
      velocityY: 0,
      grounded: false,
      invincible: false,
      invincibilityTime: 0
    },
    camera: { x: 0, y: 0 },
    checkpoints: [],
    activeCheckpoint: { x: 100, y: LEVEL_HEIGHT - 200 },
    hearts: [],
    platforms: [],
    hazards: [],
    heartsCollected: 0,
    levelCompleted: false,
    gameStarted: false,
    gameOver: false
  });

  // ============ ASSET LOADING ============
  useEffect(() => {
    const spriteFiles = {
      standing: '/src/assets/sprites/standing.png',
      runLeft1: '/src/assets/sprites/runleft1.png',
      runLeft2: '/src/assets/sprites/runleft2.png',
      runLeft3: '/src/assets/sprites/runleft3.png',
      runRight1: '/src/assets/sprites/runright1.png',
      runRight2: '/src/assets/sprites/runright2.png',
      runRight3: '/src/assets/sprites/runright3.png',
      heart: '/heart.png'
    };

    Object.entries(spriteFiles).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => { spriteRefs.current[key] = img; };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${src}`);
        spriteRefs.current[key] = null;
      };
      img.src = src;
    });

    const bg = new Image();
    bg.onload = () => { backgroundRef.current = bg; };
    bg.src = '/level_1.jpeg';

    const grassBlock = new Image();
    grassBlock.onload = () => { grassBlockRef.current = grassBlock; };
    grassBlock.onerror = () => {
      console.warn('Failed to load grass block texture');
      grassBlockRef.current = null;
    };
    grassBlock.src = '/src/assets/photos/level_1_grass_block.png';
  }, []);

  // Initialize background music
  useEffect(() => {
    const audio = new Audio('/src/assets/audio/level_1.mp3');
    audio.loop = true;
    audio.volume = 0.3; // 30% volume (quiet background music)
    audio.preload = 'auto';

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // Load jump sound
  useEffect(() => {
    const audio = new Audio('/src/assets/audio/level_1_jump.mp3');
    audio.volume = 0.2; // 30% volume
    audio.preload = 'auto';
    jumpSoundRef.current = audio;

    return () => {
      if (jumpSoundRef.current) {
        jumpSoundRef.current = null;
      }
    };
  }, []);

  // Load heart pickup sound
  useEffect(() => {
    const audio = new Audio('/src/assets/audio/level_1_heart.mp3');
    audio.volume = 0.5; // 70% volume (celebratory)
    audio.preload = 'auto';
    heartPickupSoundRef.current = audio;

    return () => {
      if (heartPickupSoundRef.current) {
        heartPickupSoundRef.current = null;
      }
    };
  }, []);

  // Load death sound
  useEffect(() => {
    const audio = new Audio('/src/assets/audio/level_1_death.mp3');
    audio.volume = 0.5; // 50% volume (not aggressive)
    audio.preload = 'auto';
    deathSoundRef.current = audio;

    return () => {
      if (deathSoundRef.current) {
        deathSoundRef.current = null;
      }
    };
  }, []);

  const getCurrentSprite = () => {
    const sprites = spriteRefs.current;
    switch (animationState) {
      case 'runLeft':
        return [sprites.runLeft1, sprites.runLeft2, sprites.runLeft3][animationFrame] || null;
      case 'runRight':
        return [sprites.runRight1, sprites.runRight2, sprites.runRight3][animationFrame] || null;
      default:
        return sprites.standing || null;
    }
  };

  // Start background music when level begins
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.levelCompleted && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.warn('Background music playback failed:', err);
      });
    }
  }, [gameState.gameStarted, gameState.gameOver, gameState.levelCompleted]);

  // ============ LEVEL INITIALIZATION (VERTICAL HARD MODE) ============
  const initializeLevel = () => {
    // 1. PLATFORMS: Designed for verticality
    const platforms = [
      // --- START AREA ---
      { x: 0, y: LEVEL_HEIGHT - 100, width: LEVEL_WIDTH * 0.10, height: 100 }, // Base
      
      // --- THE CLIMB (Vertical Zig Zag) ---
      // Jump 1: Up and Right
      { x: LEVEL_WIDTH * 0.13, y: LEVEL_HEIGHT - 210, width: LEVEL_WIDTH * 0.05, height: 30 },
      // Jump 2: Up and Left (Backtracking slightly)
      { x: LEVEL_WIDTH * 0.08, y: LEVEL_HEIGHT - 320, width: LEVEL_WIDTH * 0.05, height: 30 },
      // Jump 3: Up and Right (High Peak)
      { x: LEVEL_WIDTH * 0.15, y: LEVEL_HEIGHT - 430, width: LEVEL_WIDTH * 0.04, height: 30 }, 

      // --- THE DESCENT (Precision Falls) ---
      // Long jump to the right from the peak
      { x: LEVEL_WIDTH * 0.25, y: LEVEL_HEIGHT - 350, width: LEVEL_WIDTH * 0.04, height: 30 },
      { x: LEVEL_WIDTH * 0.30, y: LEVEL_HEIGHT - 250, width: LEVEL_WIDTH * 0.08, height: 30 }, // Checkpoint Landing

      // --- THE GRID (Tight Jumps over pits) ---
      { x: LEVEL_WIDTH * 0.42, y: LEVEL_HEIGHT - 250, width: LEVEL_WIDTH * 0.04, height: 30 }, // Tiny platform
      { x: LEVEL_WIDTH * 0.49, y: LEVEL_HEIGHT - 200, width: LEVEL_WIDTH * 0.04, height: 30 }, // Low platform
      { x: LEVEL_WIDTH * 0.56, y: LEVEL_HEIGHT - 280, width: LEVEL_WIDTH * 0.04, height: 30 }, // High platform
      
      // --- THE GAUNTLET (Moving blockers) ---
      { x: LEVEL_WIDTH * 0.65, y: LEVEL_HEIGHT - 200, width: LEVEL_WIDTH * 0.10, height: 40 }, // Safe zone 2
      { x: LEVEL_WIDTH * 0.78, y: LEVEL_HEIGHT - 200, width: LEVEL_WIDTH * 0.05, height: 30 }, // Gap jump
      
      // --- FINAL ASCENT (Stairs to Heaven) ---
      { x: LEVEL_WIDTH * 0.85, y: LEVEL_HEIGHT - 280, width: LEVEL_WIDTH * 0.04, height: 30 },
      { x: LEVEL_WIDTH * 0.89, y: LEVEL_HEIGHT - 360, width: LEVEL_WIDTH * 0.04, height: 30 },
      { x: LEVEL_WIDTH * 0.93, y: LEVEL_HEIGHT - 440, width: LEVEL_WIDTH * 0.07, height: 440 }, // GOAL TOWER
    ];

    // 2. CHECKPOINTS (Placed on safe platforms)
    const checkpoints = [
      { x: LEVEL_WIDTH * 0.31, y: LEVEL_HEIGHT - 270, width: 40, height: 20, activated: false },
      { x: LEVEL_WIDTH * 0.66, y: LEVEL_HEIGHT - 220, width: 40, height: 20, activated: false } 
    ];

    // 3. HAZARDS (Cruel placement)
    const hazards = [
      // Floor Spikes (Punishment for falling from The Climb)
      { type: 'spike', x: LEVEL_WIDTH * 0.12, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },
      { type: 'spike', x: LEVEL_WIDTH * 0.14, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },
      
      // Spike on the very top peak (Don't overshoot!)
      { type: 'spike', x: LEVEL_WIDTH * 0.18, y: LEVEL_HEIGHT - 430, width: 16, height: 16 },

      // Moving Block guarding the descent
      { 
        type: 'moving_block', 
        x: LEVEL_WIDTH * 0.22, y: LEVEL_HEIGHT - 300, width: 40, height: 40, 
        baseX: LEVEL_WIDTH * 0.22, moveRange: 0, moveOffset: 0, direction: 1,
        vertical: true, verticalRange: 80, verticalY: LEVEL_HEIGHT - 300
      },

      // Spikes between "The Grid" platforms
      { type: 'spike', x: LEVEL_WIDTH * 0.45, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },
      { type: 'spike', x: LEVEL_WIDTH * 0.52, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },

      // Interceptor Block in "The Grid"
      { 
        type: 'moving_block', 
        x: LEVEL_WIDTH * 0.52, y: LEVEL_HEIGHT - 240, width: 30, height: 30, 
        baseX: LEVEL_WIDTH * 0.52, moveRange: 50, moveOffset: 0, direction: 1
      },

      // Ground spikes under final gap
      { type: 'spike', x: LEVEL_WIDTH * 0.70, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },
      { type: 'spike', x: LEVEL_WIDTH * 0.72, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },
      { type: 'spike', x: LEVEL_WIDTH * 0.74, y: LEVEL_HEIGHT - 40, width: 20, height: 40 },

      // Final Guard (Vertical movement on the final tower climb)
      {
        type: 'moving_block',
        x: LEVEL_WIDTH * 0.87, y: LEVEL_HEIGHT - 320, width: 30, height: 30,
        baseX: LEVEL_WIDTH * 0.87, moveRange: 40, moveOffset: 0, direction: 1,
        vertical: false
      },

      // --- NEW MOVING OBSTACLES (Difficulty Enhancement) ---

      // Obstacle 5: Checkpoint Exit Guard (guards exit from checkpoint safe zone)
      {
        type: 'moving_block',
        x: LEVEL_WIDTH * 0.34, y: LEVEL_HEIGHT - 320, width: 30, height: 30,
        baseX: LEVEL_WIDTH * 0.34, moveRange: 0, moveOffset: Math.PI, direction: 1,
        vertical: true, verticalRange: 60, verticalY: LEVEL_HEIGHT - 320
      },

      // Obstacle 6: Grid Exit Interceptor (guards transition from grid to gauntlet)
      {
        type: 'moving_block',
        x: LEVEL_WIDTH * 0.59, y: LEVEL_HEIGHT - 240, width: 30, height: 30,
        baseX: LEVEL_WIDTH * 0.59, moveRange: 50, moveOffset: 0, direction: 1,
        vertical: false
      },

      // Obstacle 7: Climb Peak Guardian (guards descent from climb peak)
      {
        type: 'moving_block',
        x: LEVEL_WIDTH * 0.17, y: LEVEL_HEIGHT - 400, width: 30, height: 30,
        baseX: LEVEL_WIDTH * 0.17, moveRange: 40, moveOffset: Math.PI / 2, direction: 1,
        vertical: false
      },
    ];

    // 4. HEARTS (High and Risky) - DIFFICULTY ENHANCED
    const hearts = [
      // Intro (EASY - progression marker)
      { id: 1, x: LEVEL_WIDTH * 0.05, y: LEVEL_HEIGHT - 150, pattern: 'static' },

      // The Climb (Vertical Hearts)
      { id: 2, x: LEVEL_WIDTH * 0.13, y: LEVEL_HEIGHT - 270, pattern: 'static' }, // RISK: Above spike gap
      { id: 3, x: LEVEL_WIDTH * 0.09, y: LEVEL_HEIGHT - 370, pattern: 'float', baseY: LEVEL_HEIGHT - 370, floatOffset: 0 }, // EASY: Float pattern practice
      { id: 4, x: LEVEL_WIDTH * 0.16, y: LEVEL_HEIGHT - 450, pattern: 'static' }, // FIXED: Lowered to be reachable

      // The Descent
      { id: 5, x: LEVEL_WIDTH * 0.27, y: LEVEL_HEIGHT - 380, pattern: 'static' }, // EASY: Safe transition
      { id: 6, x: LEVEL_WIDTH * 0.32, y: LEVEL_HEIGHT - 290, pattern: 'horizontal', baseX: LEVEL_WIDTH * 0.32, moveOffset: 0 }, // PRECISION: Moving during checkpoint

      // The Grid (Precision)
      { id: 7, x: LEVEL_WIDTH * 0.43, y: LEVEL_HEIGHT - 300, pattern: 'static' }, // EASY: Grid entry
      { id: 8, x: LEVEL_WIDTH * 0.51, y: LEVEL_HEIGHT - 260, pattern: 'static' }, // RISK: In interceptor block path
      { id: 9, x: LEVEL_WIDTH * 0.57, y: LEVEL_HEIGHT - 330, pattern: 'static' }, // High platform

      // The Gauntlet
      { id: 10, x: LEVEL_WIDTH * 0.62, y: LEVEL_HEIGHT - 250, pattern: 'horizontal', baseX: LEVEL_WIDTH * 0.62, moveOffset: 0 }, // EASY: Moving pattern practice
      { id: 11, x: LEVEL_WIDTH * 0.68, y: LEVEL_HEIGHT - 250, pattern: 'circular', centerX: LEVEL_WIDTH * 0.68, centerY: LEVEL_HEIGHT - 250, angle: 0 }, // PRECISION: Orbiting pattern

      // Gap Jump
      { id: 12, x: LEVEL_WIDTH * 0.74, y: LEVEL_HEIGHT - 250, pattern: 'circular', centerX: LEVEL_WIDTH * 0.74, centerY: LEVEL_HEIGHT - 250, angle: 0 },

      // Final Ascent (High Hearts)
      { id: 13, x: LEVEL_WIDTH * 0.86, y: LEVEL_HEIGHT - 320, pattern: 'static' }, // RISK: Near final guard block
      { id: 14, x: LEVEL_WIDTH * 0.89, y: LEVEL_HEIGHT - 410, pattern: 'float', baseY: LEVEL_HEIGHT - 410, floatOffset: Math.PI },
      { id: 15, x: LEVEL_WIDTH * 0.94, y: LEVEL_HEIGHT - 460, pattern: 'static' }, // FIXED: Lowered to be reachable from goal tower

      // Fillers (Hard to reach spots)
      { id: 16, x: LEVEL_WIDTH * 0.22, y: LEVEL_HEIGHT - 300, pattern: 'static' }, // STRATEGY: Backtrack through moving block
      { id: 17, x: LEVEL_WIDTH * 0.46, y: LEVEL_HEIGHT - 280, pattern: 'static' }, // FIXED: Raised from spike danger zone
      { id: 18, x: LEVEL_WIDTH * 0.52, y: LEVEL_HEIGHT - 350, pattern: 'float', baseY: LEVEL_HEIGHT - 350, floatOffset: 0 }, // High above interceptor
      { id: 19, x: LEVEL_WIDTH * 0.80, y: LEVEL_HEIGHT - 240, pattern: 'static' }, // FIXED: Raised from ground spike zone
      { id: 20, x: LEVEL_WIDTH * 0.91, y: LEVEL_HEIGHT - 380, pattern: 'static' }, // STRATEGY: Risky tower jump
    ];

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
  };

  // ============ INPUT & LOGIC ============
  useEffect(() => {
    const handleKeyDown = (e) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const checkCollision = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  const updateCamera = (player) => {
    const targetCameraX = player.x - SCREEN_WIDTH / 2;
    return {
      x: Math.max(0, Math.min(LEVEL_WIDTH - SCREEN_WIDTH, targetCameraX)),
      y: 0
    };
  };

  // ============ GAME LOOP ============
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const gameLoop = () => {
      setGameState(prevState => {
        if (prevState.levelCompleted || prevState.gameOver) return prevState;

        const newState = { ...prevState };
        const player = { ...newState.player };
        
        // Invincibility
        if (player.invincible) {
          player.invincibilityTime -= 1;
          if (player.invincibilityTime <= 0) {
            player.invincible = false;
            player.invincibilityTime = 0;
          }
        }
        
        // Input
        const keys = keysRef.current;
        let newAnimationState = 'idle';
        let isMoving = false;
        
        if (keys['ArrowLeft'] || keys['KeyA']) {
          player.velocityX = -MOVE_SPEED;
          newAnimationState = 'runLeft';
          isMoving = true;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
          player.velocityX = MOVE_SPEED;
          newAnimationState = 'runRight';
          isMoving = true;
        } else {
          player.velocityX *= 0.8;
        }

        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.grounded) {
          player.velocityY = JUMP_FORCE;
          player.grounded = false;
          playJumpSound();
        }
        
        // Animation
        if (newAnimationState !== animationState) {
          setAnimationState(newAnimationState);
          setAnimationFrame(0);
          animationTimerRef.current = 0;
        }
        if (isMoving) {
          animationTimerRef.current += 1;
          if (animationTimerRef.current >= 12) {
            animationTimerRef.current = 0;
            setAnimationFrame(prev => (prev + 1) % 3);
          }
        } else {
          setAnimationFrame(0);
          animationTimerRef.current = 0;
        }

        // Physics
        player.velocityY += GRAVITY;
        player.x += player.velocityX;
        player.y += player.velocityY;

        // Platform Collisions
        player.grounded = false;
        for (const platform of newState.platforms) {
          if (checkCollision(player, platform)) {
            if (player.velocityY > 0 && player.y < platform.y) {
              player.y = platform.y - player.height;
              player.velocityY = 0;
              player.grounded = true;
            } else if (player.velocityY < 0 && player.y > platform.y) {
              player.y = platform.y + platform.height;
              player.velocityY = 0;
            } else if (player.velocityX > 0) {
              player.x = platform.x - player.width;
            } else if (player.velocityX < 0) {
              player.x = platform.x + platform.width;
            }
          }
        }

        // Boundaries
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > LEVEL_WIDTH) player.x = LEVEL_WIDTH - player.width;
        
        // Falling off screen
        if (player.y > LEVEL_HEIGHT && !player.invincible) {
          player.x = activeCheckpointRef.current.x;
          player.y = activeCheckpointRef.current.y;
          player.velocityX = 0;
          player.velocityY = 0;
          player.grounded = false;
          player.invincible = true;
          player.invincibilityTime = 120;
          playDeathSound();
          onLoseLife();
        }

        // Checkpoints
        for (let i = 0; i < newState.checkpoints.length; i++) {
          const checkpoint = newState.checkpoints[i];
          if (!checkpoint.activated && checkCollision(player, checkpoint)) {
            newState.checkpoints[i] = { ...checkpoint, activated: true };
            const newActiveCheckpoint = { x: checkpoint.x + 10, y: checkpoint.y - 20 };
            activeCheckpointRef.current = newActiveCheckpoint;
            newState.activeCheckpoint = newActiveCheckpoint;
          }
        }

        // Heart Logic
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

        const collectedHearts = [];
        const remainingHearts = updatedHearts.filter(heart => {
          if (checkCollision(player, { x: heart.x, y: heart.y, width: 20, height: 20 })) {
            collectedHearts.push(heart);
            return false;
          }
          return true;
        });
        if (collectedHearts.length > 0) {
          newState.heartsCollected += collectedHearts.length;
          playHeartPickupSound();
        }

        // Hazard Logic
        const updatedHazards = newState.hazards.map(hazard => {
          if (hazard.type === 'moving_block') {
            const newHazard = { ...hazard };
            if (hazard.vertical) {
               newHazard.moveOffset += 0.02;
               newHazard.y = hazard.verticalY + Math.sin(newHazard.moveOffset) * hazard.verticalRange;
            } else {
               newHazard.moveOffset += 0.02;
               newHazard.x = hazard.baseX + Math.sin(newHazard.moveOffset) * hazard.moveRange;
            }
            return newHazard;
          }
          return hazard;
        });

        // Hazard Collision
        if (!player.invincible) {
          for (const hazard of updatedHazards) {
            if (checkCollision(player, hazard)) {
              player.x = activeCheckpointRef.current.x;
              player.y = activeCheckpointRef.current.y;
              player.velocityX = 0;
              player.velocityY = 0;
              player.grounded = false;
              player.invincible = true;
              player.invincibilityTime = 120;
              playDeathSound();
              onLoseLife();
              break;
            }
          }
        }

        // Camera & Win
        newState.camera = updateCamera(player);
        if (newState.heartsCollected >= TOTAL_HEARTS && player.x > LEVEL_WIDTH * 0.9) {
          newState.levelCompleted = true;
          setTimeout(() => {
            onComplete({
              title: "How We Met",
              type: "text",
              content: "Every moment with you started right here. [Placeholder for intro video/text]"
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
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gameState.gameStarted, gameState.gameOver, onComplete, onLoseLife, animationState]);

  // ============ RENDERING ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState.gameStarted) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // Background
      if (backgroundRef.current) {
        ctx.drawImage(backgroundRef.current, -gameState.camera.x, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E6F3FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }

      ctx.save();
      ctx.translate(-gameState.camera.x, 0);

      // Draw Platforms (with grass block texture at consistent scale)
      const grassBlock = grassBlockRef.current;
      gameState.platforms.forEach(p => {
        if (grassBlock && grassBlock.complete) {
          // Determine the actual image dimensions
          const imageSize = grassBlock.width; // Assume square image
          const GRASS_SCALE = 0.5; // 0.75 = show at 75% size (see more of texture)

          // Calculate how much of the source image to slice
          // Image portion is centered horizontally, starts from top
          const maxSourceWidth = p.width / GRASS_SCALE;    // Scale factor applied
          const maxSourceHeight = p.height / GRASS_SCALE;  // Scale factor applied

          // Center the image horizontally within the platform
          const sourceX = Math.max(0, (imageSize - maxSourceWidth) / 2);
          const sourceY = 0; // Always start from top (grass side)
          const sourceWidth = Math.min(maxSourceWidth, imageSize);
          const sourceHeight = Math.min(maxSourceHeight, imageSize);

          // Draw with scale applied
          ctx.drawImage(
            grassBlock,
            sourceX,          // sx: horizontal center of image
            sourceY,          // sy: start from top
            sourceWidth,      // sWidth: how much to take from source
            sourceHeight,     // sHeight: how much to take from source
            p.x,              // dx: destination x
            p.y,              // dy: destination y
            p.width,          // dWidth: actual platform width (keeps platform size)
            p.height          // dHeight: actual platform height (keeps platform size)
          );
        } else {
          // Fallback: brown rectangles if image not loaded
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(p.x, p.y, p.width, p.height);
          ctx.strokeStyle = '#654321';
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x, p.y, p.width, p.height);
        }
      });

      // Draw Checkpoints
      gameState.checkpoints.forEach(c => {
        ctx.fillStyle = c.activated ? '#00FF00' : '#FFD700';
        ctx.fillRect(c.x, c.y, c.width, c.height);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(c.x, c.y, c.width, c.height);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(c.activated ? '✓' : '🚩', c.x + 12, c.y + 15);
      });

      // Draw Hearts (using heart.png sprite)
      const heartSprite = spriteRefs.current.heart;
      gameState.hearts.forEach(h => {
        if (heartSprite) {
          // Draw heart sprite (24x24 size)
          ctx.drawImage(heartSprite, h.x - 2, h.y - 2, 24, 24);
        } else {
          // Fallback if sprite not loaded
          ctx.fillStyle = '#FF1493';
          ctx.fillRect(h.x, h.y, 20, 20);
          ctx.fillStyle = '#FFF';
          ctx.font = '16px Arial';
          ctx.fillText('♥', h.x + 2, h.y + 16);
        }
      });

      // Draw Hazards
      gameState.hazards.forEach(h => {
        if (h.type === 'spike') {
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.moveTo(h.x + h.width/2, h.y);
          ctx.lineTo(h.x, h.y + h.height);
          ctx.lineTo(h.x + h.width, h.y + h.height);
          ctx.closePath();
          ctx.fill();
        } else if (h.type === 'moving_block') {
          ctx.fillStyle = '#8B0000';
          ctx.fillRect(h.x, h.y, h.width, h.height);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(h.x, h.y, h.width, h.height);
          // Angry eyes
          ctx.fillStyle = '#FFF';
          ctx.fillRect(h.x + 8, h.y + 10, 8, 8);
          ctx.fillRect(h.x + 24, h.y + 10, 8, 8);
        }
      });

      // Draw Player
      const shouldFlash = gameState.player.invincible && Math.floor(gameState.player.invincibilityTime / 10) % 2 === 0;
      if (!shouldFlash) {
        const currentSprite = getCurrentSprite();
        if (currentSprite) {
          const offsetX = (PLAYER_WIDTH - 80) / 2;
          ctx.drawImage(currentSprite, gameState.player.x + offsetX, gameState.player.y, 80, 80);
        } else {
          ctx.fillStyle = '#4169E1';
          ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);
        }
      }

      // Goal
      if (gameState.heartsCollected >= TOTAL_HEARTS) {
        const goalX = LEVEL_WIDTH * 0.9;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(goalX, 0, LEVEL_WIDTH * 0.1, LEVEL_HEIGHT);
        ctx.fillStyle = '#FFD700';
        ctx.font = '32px Arial';
        ctx.fillText('GOAL!', goalX + 20, 80);
      }
      ctx.restore();
    };

    render();
  }, [gameState, animationState, animationFrame]);

  // ============ HELPERS ============
  const debugCollectAllHearts = () => {
    setGameState(prevState => ({ ...prevState, heartsCollected: TOTAL_HEARTS }));
  };

  const handleRetry = () => {
    onResetLives();
    activeCheckpointRef.current = { x: 100, y: LEVEL_HEIGHT - 200 };

    // Reset and restart music
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.3; // Reset volume to 30% (in case it was faded)
    }

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
      activeCheckpoint: { x: 100, y: LEVEL_HEIGHT - 200 },
      heartsCollected: 0,
      gameOver: false,
      checkpoints: prev.checkpoints.map(checkpoint => ({ ...checkpoint, activated: false })),
      hearts: []
    }));
    setAnimationState('idle');
    setAnimationFrame(0);
    animationTimerRef.current = 0;
    setTimeout(() => { initializeLevel(); }, 100);
  };

  const handleReturnToHub = () => {
    onReturnToHub();
  };

  const fadeOutMusic = () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const fadeDuration = 1500; // 1.5 seconds
    const fadeInterval = 50; // Update every 50ms
    const steps = fadeDuration / fadeInterval;
    const volumeStep = audio.volume / steps;

    const fadeTimer = setInterval(() => {
      if (audio.volume > volumeStep) {
        audio.volume = Math.max(0, audio.volume - volumeStep);
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(fadeTimer);
      }
    }, fadeInterval);
  };

  const playJumpSound = () => {
    if (jumpSoundRef.current) {
      jumpSoundRef.current.currentTime = 0; // Reset for rapid replays
      jumpSoundRef.current.play().catch(e => console.warn('Jump sound failed:', e));
    }
  };

  const playHeartPickupSound = () => {
    if (heartPickupSoundRef.current) {
      heartPickupSoundRef.current.currentTime = 0;
      heartPickupSoundRef.current.play().catch(e => console.warn('Heart pickup sound failed:', e));
    }
  };

  const playDeathSound = () => {
    if (deathSoundRef.current) {
      deathSoundRef.current.currentTime = 0;
      deathSoundRef.current.play().catch(e => console.warn('Death sound failed:', e));
    }
  };

  useEffect(() => {
    if (lives <= 0 && gameState.gameStarted && !gameState.levelCompleted && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
    }
  }, [lives, gameState.gameStarted, gameState.levelCompleted, gameState.gameOver]);

  // Fade out music when player wins or loses
  useEffect(() => {
    if ((gameState.levelCompleted || gameState.gameOver) && audioRef.current) {
      fadeOutMusic();
    }
  }, [gameState.levelCompleted, gameState.gameOver]);

  // ============ INITIALIZE ON START ============
  useEffect(() => {
    if (!gameState.gameStarted) {
      initializeLevel();
    }
  }, [gameState.gameStarted]);

  return (
    <div className="canvas-container">
      <div className="level-title-header">
        <h2>❤️ Level 1: Heart Collect Run (Extreme Mode)</h2>
        <p>Collect all {TOTAL_HEARTS} hearts! Watch out for guards!</p>
      </div>

      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        className="game-canvas"
      />

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
              fontWeight: 'bold',
              marginTop: '10px'
            }}
          >
            🐛 DEBUG: Collect All Hearts
          </button>
        )}
      </div>

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

      {gameState.levelCompleted && (
        <div className="completion-overlay">
          <h2>🎉 Level Complete! 🎉</h2>
          <p>You collected all {TOTAL_HEARTS} hearts! A memory is being unlocked...</p>
        </div>
      )}

      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h2>Game Over</h2>
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