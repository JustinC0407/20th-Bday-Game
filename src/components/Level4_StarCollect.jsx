import React, { useRef, useState, useEffect } from 'react';

// ============ CONSTANTS ============
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

const PLAYER_WIDTH = 80;
const PLAYER_HEIGHT = 80;
const PLAYER_Y = SCREEN_HEIGHT - 140; // On platform at bottom (adjusted for larger hitbox)

const PLAYER_SPEED = 700; 

const ITEM_SIZE = 50; 
const TOTAL_STARS = 25;
const STARS_NEEDED = 20;

const INITIAL_FALL_SPEED = 3; 
const MAX_FALL_SPEED = 10; 

const STAR_SPAWN_INTERVAL_MIN = 1.5;
const STAR_SPAWN_INTERVAL_MAX = 2.5;
const OBSTACLE_SPAWN_INTERVAL_START = 3.0; 
const OBSTACLE_SPAWN_INTERVAL_END = 0.25; 

const OBSTACLE_TYPES = ['RENT', 'HOMEWORK', 'TAXES'];
const OBSTACLE_COLORS = { RENT: '#FF0000', HOMEWORK: '#0000FF', TAXES: '#800080' };
const VERTICAL_SAFE_ZONE = 150; 

function Level4_StarCollect({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const backgroundRef = useRef(null);
  const keysRef = useRef({});

  // Timestamp-based timing
  const lastFrameTimeRef = useRef(0);
  const timeSinceLastStarRef = useRef(0);
  const timeSinceLastObstacleRef = useRef(0);
  const nextStarSpawnIntervalRef = useRef(STAR_SPAWN_INTERVAL_MIN);
  const nextObstacleSpawnIntervalRef = useRef(OBSTACLE_SPAWN_INTERVAL_START);

  // Logic Counter
  const starsSpawnedRef = useRef(0);

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

  // Image references for game objects
  const itemImageRefs = useRef({
    star: null,
    bad1: null,
    bad2: null,
    bad3: null
  });

  // Animation state for character
  const [animationState, setAnimationState] = useState('idle');
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationTimerRef = useRef(0);

  // PERFORMANCE FIX: Use refs to prevent game loop issues
  const animationStateRef = useRef('idle');
  const animationFrameRef = useRef(0);

  // ============ GAME STATE ============
  const [gameState, setGameState] = useState({
    player: { x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2 },
    stars: [],
    obstacles: [],
    particles: [],
    starsSpawned: 0,
    starsCollected: 0,
    score: 0,
    gameStarted: true,
    gameOver: false,
    levelCompleted: false,
    flashMessage: null
  });

  // ============ INPUT HANDLING ============
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code)) {
        keysRef.current[e.code] = true;
      }
      if (e.code === 'KeyR' && gameState.gameOver) handleRetry();
      if (e.code === 'KeyH' && gameState.gameOver) handleReturnToHub();
    };

    const handleKeyUp = (e) => keysRef.current[e.code] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameOver]);

  // Sync animation refs to state for rendering
  useEffect(() => {
    const syncInterval = setInterval(() => {
      // Only update state when values actually change
      if (animationStateRef.current !== animationState) {
        setAnimationState(animationStateRef.current);
      }
      if (animationFrameRef.current !== animationFrame) {
        setAnimationFrame(animationFrameRef.current);
      }
    }, 1000/60); // Check at 60 FPS

    return () => clearInterval(syncInterval);
  }, [animationState, animationFrame]);

  // Load character sprites
  useEffect(() => {
    const spriteFiles = {
      standing: '/sprites/standing.png',
      runLeft1: '/sprites/runleft1.png',
      runLeft2: '/sprites/runleft2.png',
      runLeft3: '/sprites/runleft3.png',
      runRight1: '/sprites/runright1.png',
      runRight2: '/sprites/runright2.png',
      runRight3: '/sprites/runright3.png'
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

  // Load background image
  useEffect(() => {
    const bg = new Image();
    bg.onload = () => { backgroundRef.current = bg; };
    bg.onerror = () => { console.warn('Failed to load /level_4.png'); };
    bg.src = '/level_4.png';
  }, []);

  // Load item images
  useEffect(() => {
    const itemImages = {
      star: '/photos/level_4_star.png',
      bad1: '/photos/level_4_bad_1.png',
      bad2: '/photos/level_4_bad_2.png',
      bad3: '/photos/level_4_bad_3.png'
    };

    Object.entries(itemImages).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        itemImageRefs.current[key] = img;
      };
      img.onerror = () => {
        console.warn(`Failed to load item image: ${src}`);
      };
      img.src = src;
    });
  }, []);

  // Initialize background music
  useEffect(() => {
    const audio = new Audio('/audio/level_4.mp3');
    audio.loop = true;
    audio.volume = 0.4; // 40% volume (upbeat but not overpowering)
    audio.preload = 'auto';

    backgroundMusicRef.current = audio;

    // Start playing immediately since gameStarted is always true
    audio.play().catch(err => {
      console.warn('Background music playback failed:', err);
    });

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  // ============ HELPER FUNCTIONS ============
  const checkCollision = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

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

  const spawnParticles = (x, y, color, count) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: x + ITEM_SIZE / 2,
        y: y + ITEM_SIZE / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        life: 30
      });
    }
    return newParticles;
  };

  // ============ GAME LOOP ============
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.levelCompleted) return;

    lastFrameTimeRef.current = performance.now();

    const gameLoop = (now) => {
      const deltaTimeRaw = (now - lastFrameTimeRef.current) / 1000;
      const deltaTime = Math.min(deltaTimeRaw, 0.1); 
      lastFrameTimeRef.current = now;

      // 1. UPDATE TIMERS (Outside setState)
      timeSinceLastStarRef.current += deltaTime;
      timeSinceLastObstacleRef.current += deltaTime;

      // 2. DETERMINE SPAWNS (Outside setState)
      let shouldSpawnStar = false;
      let shouldSpawnObstacle = false;

      // Check Star Spawn
      if (timeSinceLastStarRef.current >= nextStarSpawnIntervalRef.current && starsSpawnedRef.current < TOTAL_STARS) {
        shouldSpawnStar = true;
        timeSinceLastStarRef.current = 0; 
        starsSpawnedRef.current += 1; 
        nextStarSpawnIntervalRef.current = Math.random() * (STAR_SPAWN_INTERVAL_MAX - STAR_SPAWN_INTERVAL_MIN) + STAR_SPAWN_INTERVAL_MIN;
      }

      // Check Obstacle Spawn
      if (timeSinceLastObstacleRef.current >= nextObstacleSpawnIntervalRef.current) {
        shouldSpawnObstacle = true;
        timeSinceLastObstacleRef.current = 0; 
      }

      setGameState(prevState => {
        if (prevState.gameOver || prevState.levelCompleted) return prevState;

        // CRITICAL FIX: Fully clone arrays to prevent mutation in Strict Mode
        const newState = { 
            ...prevState,
            stars: [...prevState.stars],
            obstacles: [...prevState.obstacles],
            particles: [...prevState.particles]
        };

        // Sync UI counter
        newState.starsSpawned = starsSpawnedRef.current;

        // === DIFFICULTY ===
        const progress = Math.min(newState.starsSpawned / TOTAL_STARS, 1);
        const fallSpeed = INITIAL_FALL_SPEED + (progress * (MAX_FALL_SPEED - INITIAL_FALL_SPEED));
        const obstacleInterval = OBSTACLE_SPAWN_INTERVAL_START - 
          (progress * (OBSTACLE_SPAWN_INTERVAL_START - OBSTACLE_SPAWN_INTERVAL_END));

        // === EXECUTE SPAWNS ===
        
        // Add Star
        if (shouldSpawnStar) {
          newState.stars.push({
            id: Date.now() + Math.random(),
            x: Math.random() * (SCREEN_WIDTH - ITEM_SIZE),
            y: -ITEM_SIZE,
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            speed: fallSpeed
          });
        }

        // Add Obstacle
        if (shouldSpawnObstacle) {
          nextObstacleSpawnIntervalRef.current = obstacleInterval;

          if (newState.starsSpawned < TOTAL_STARS || newState.stars.length > 0) {
              const proposedX = Math.random() * (SCREEN_WIDTH - ITEM_SIZE);
              
              const isSafe = !newState.stars.some(star => 
                Math.abs(star.x - proposedX) < ITEM_SIZE && 
                star.y < VERTICAL_SAFE_ZONE
              );

              if (isSafe) {
                const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
                newState.obstacles.push({
                  id: Date.now() + Math.random(),
                  x: proposedX,
                  y: -ITEM_SIZE,
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  speed: fallSpeed,
                  type
                });
              }
          }
        }

        // === MOVEMENT ===
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) {
          newState.player.x = Math.max(0, newState.player.x - (PLAYER_SPEED * deltaTime));
        }
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) {
          newState.player.x = Math.min(SCREEN_WIDTH - PLAYER_WIDTH, newState.player.x + (PLAYER_SPEED * deltaTime));
        }

        const moveItem = (item) => ({ ...item, y: item.y + (item.speed * 60 * deltaTime) });
        newState.stars = newState.stars.map(moveItem);
        newState.obstacles = newState.obstacles.map(moveItem);

        // === COLLISIONS ===
        const playerBox = { x: newState.player.x, y: PLAYER_Y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };

        newState.stars = newState.stars.filter(star => {
          if (checkCollision(playerBox, star)) {
            newState.score++;
            newState.starsCollected++;
            newState.particles.push(...spawnParticles(star.x, star.y, '#FFD700', 8));
            return false;
          }
          return true;
        });

        newState.obstacles = newState.obstacles.filter(obstacle => {
          if (checkCollision(playerBox, obstacle)) {
            newState.score--;
            newState.flashMessage = { text: '−1 Point!', timestamp: Date.now() };
            newState.particles.push(...spawnParticles(obstacle.x, obstacle.y, '#FF0000', 8));
            return false;
          }
          return true;
        });

        // Cleanup
        newState.stars = newState.stars.filter(s => s.y < SCREEN_HEIGHT + 100);
        newState.obstacles = newState.obstacles.filter(o => o.y < SCREEN_HEIGHT + 100);

        newState.particles = newState.particles
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
          .filter(p => p.life > 0);

        // === GAME END CHECKS ===
        const allSpawned = newState.starsSpawned >= TOTAL_STARS;
        const allCleared = newState.stars.length === 0;

        if (allSpawned && allCleared && !newState.levelCompleted && !newState.gameOver) {
          if (newState.score >= STARS_NEEDED) {
            newState.levelCompleted = true;
            setTimeout(() => {
              onComplete({
                title: "Look How Far You've Come!",
                type: "photo",
                content: "/photos/level_4_win.jpeg"
              });
            }, 500);
          } else {
            newState.gameOver = true;
          }
        }

        return newState;
      });

      // === ANIMATION STATE UPDATES (Using refs like LevelHub) ===
      // Determine animation state based on movement
      let newAnimationState = 'idle';
      let isMoving = false;

      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) {
        newAnimationState = 'runLeft';
        isMoving = true;
      } else if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) {
        newAnimationState = 'runRight';
        isMoving = true;
      }

      // Update refs if animation state changed
      if (newAnimationState !== animationStateRef.current) {
        animationStateRef.current = newAnimationState;
        animationFrameRef.current = 0;
        animationTimerRef.current = 0;
      }

      // Handle frame animation timing for running animations
      if (isMoving) {
        animationTimerRef.current += 1;
        if (animationTimerRef.current >= 12) { // 12 frames = ~200ms at 60fps
          animationTimerRef.current = 0;
          animationFrameRef.current = (animationFrameRef.current + 1) % 3;
        }
      } else {
        // Reset to idle frame when not moving
        animationFrameRef.current = 0;
        animationTimerRef.current = 0;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState.gameStarted, gameState.gameOver, gameState.levelCompleted, onComplete]);

  // ============ RENDERING ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Background
    if (backgroundRef.current && backgroundRef.current.complete) {
      ctx.drawImage(backgroundRef.current, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    } else {
      // Fallback: sky blue
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // Platform
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, SCREEN_HEIGHT - 80, SCREEN_WIDTH, 80);

    // Stars
    gameState.stars.forEach(star => {
      if (itemImageRefs.current.star) {
        // Draw image if loaded
        ctx.drawImage(
          itemImageRefs.current.star,
          star.x,
          star.y,
          star.width,
          star.height
        );
      } else {
        // Fallback: yellow rectangle (current rendering)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(star.x, star.y, star.width, star.height);
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.strokeRect(star.x, star.y, star.width, star.height);
      }
    });

    // Obstacles
    gameState.obstacles.forEach(obstacle => {
      // Map obstacle type to image
      let imageKey = null;
      if (obstacle.type === 'RENT') imageKey = 'bad1';
      else if (obstacle.type === 'HOMEWORK') imageKey = 'bad2';
      else if (obstacle.type === 'TAXES') imageKey = 'bad3';

      if (imageKey && itemImageRefs.current[imageKey]) {
        // Draw image 50% bigger but centered on hitbox
        const visualSize = obstacle.width * 1.5; // 50% bigger (75px)
        const offset = (visualSize - obstacle.width) / 2; // Center offset (12.5px)
        ctx.drawImage(
          itemImageRefs.current[imageKey],
          obstacle.x - offset,
          obstacle.y - offset,
          visualSize,
          visualSize
        );
      } else {
        // Fallback: colored rectangle with text (current rendering)
        ctx.fillStyle = OBSTACLE_COLORS[obstacle.type];
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obstacle.type, obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
      }
    });

    // Player (with sprite or fallback)
    const currentSprite = getCurrentSprite();
    if (currentSprite) {
      // Draw 120x120 sprite centered in 80px hitbox
      const spriteSize = 120; // 3/4 of original 160 size
      const offsetX = (PLAYER_WIDTH - spriteSize) / 2; // Centers 120px sprite in 80px width
      const offsetY = -spriteSize + PLAYER_HEIGHT; // Position sprite so bottom aligns with player hitbox bottom
      ctx.drawImage(
        currentSprite,
        gameState.player.x + offsetX,
        PLAYER_Y + offsetY,
        spriteSize,
        spriteSize
      );
    } else {
      // Fallback: Orange box if sprites not loaded
      ctx.fillStyle = '#FFA500';
      ctx.fillRect(gameState.player.x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(gameState.player.x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT);
    }

    // Particles
    gameState.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    // Flash Message
    if (gameState.flashMessage && Date.now() - gameState.flashMessage.timestamp < 500) {
      ctx.fillStyle = '#FF0000';
      ctx.font = '30px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(gameState.flashMessage.text, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
      ctx.shadowBlur = 0;
    }

  }, [gameState]);

  // ============ CONTROLS ============
  const handleRetry = () => {
    onResetLives();

    // Reset and restart music
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
      backgroundMusicRef.current.volume = 0.4; // Reset volume to 40%
      backgroundMusicRef.current.play().catch(err => {
        console.warn('Music restart failed:', err);
      });
    }

    lastFrameTimeRef.current = performance.now();
    timeSinceLastStarRef.current = 0;
    timeSinceLastObstacleRef.current = 0;
    starsSpawnedRef.current = 0;

    // Reset animation state and refs
    setAnimationState('idle');
    setAnimationFrame(0);
    animationTimerRef.current = 0;
    animationStateRef.current = 'idle';
    animationFrameRef.current = 0;

    setGameState({
      player: { x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2 },
      stars: [],
      obstacles: [],
      particles: [],
      starsSpawned: 0,
      starsCollected: 0,
      score: 0,
      gameStarted: true,
      gameOver: false,
      levelCompleted: false,
      flashMessage: null
    });
  };

  const handleReturnToHub = () => onReturnToHub();

  const fadeOutMusic = () => {
    if (!backgroundMusicRef.current) return;

    const audio = backgroundMusicRef.current;
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

  // Fade out music when level completes or player loses
  useEffect(() => {
    if ((gameState.levelCompleted || gameState.gameOver) && backgroundMusicRef.current) {
      fadeOutMusic();
    }
  }, [gameState.levelCompleted, gameState.gameOver]);

  // ======= DEBUG FUNCTION - COMMENTED OUT =======
  // const debugWin = () => {
  //   starsSpawnedRef.current = TOTAL_STARS;
  //   setGameState(prev => ({
  //     ...prev,
  //     score: STARS_NEEDED,
  //     starsSpawned: TOTAL_STARS,
  //     stars: [],
  //     obstacles: []
  //   }));
  // };
  // ======= END DEBUG FUNCTION =======

  return (
    <div className="canvas-container">
      <div className="level-title-header" style={{ color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        <h2>⭐ Level 4: 20 Stars for Your 20th Birthday</h2>
        <p>Collect 20 stars, avoid the bad Catalina items!</p>
      </div>

      <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} className="game-canvas" />

      <div className="game-ui">
        <div className="game-counter" style={{ color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          <span style={{ marginRight: '20px' }}>⭐ Stars: {gameState.starsCollected}/20</span>
          <span style={{ marginRight: '20px' }}>Score: {gameState.score}</span>
          <span>Spawned: {gameState.starsSpawned}/25</span>
        </div>
      </div>

      <button onClick={handleReturnToHub} style={{ position: 'absolute', bottom: '20px', right: '20px', padding: '10px' }}>
        Return to Hub
      </button>

      {/* ======= DEBUG BUTTON - COMMENTED OUT ======= */}
      {/* {!gameState.levelCompleted && (
        <button onClick={debugWin} style={{ position: 'absolute', top: '100px', right: '20px', background: 'red', color: 'white' }}>
          🐛 DEBUG WIN
        </button>
      )} */}
      {/* ======= END DEBUG BUTTON ======= */}

      {gameState.gameOver && (
        <div className="game-over-overlay" style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="game-over-dialog" style={{ background: '#D2691E', padding: '40px', borderRadius: '10px', textAlign: 'center' }}>
            <h2 style={{ color: '#FFF' }}>Not Quite Aiden :(</h2>
            <p style={{ color: '#FFF' }}>You got {gameState.score}/20 stars</p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={handleRetry} style={{ padding: '10px 20px', background: '#FFD700', cursor: 'pointer' }}>Try Again (R)</button>
              <button onClick={handleReturnToHub} style={{ padding: '10px 20px', background: '#8B4513', color: 'white', cursor: 'pointer' }}>Exit (H)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Level4_StarCollect;