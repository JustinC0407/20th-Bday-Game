import { useState, useEffect, useRef } from 'react';
import './styles/game.css';

// Components
import LevelHub from './components/LevelHub';
import GameShell from './components/GameShell';
import Level1_Platformer from './components/Level1_Platformer';
import Level2_MoulinRouge from './components/Level2_MoulinRouge';
import Level3_PuzzleOfUs from './components/Level3_PuzzleOfUs';
import Level4_StarCollect from './components/Level4_StarCollect';
import Level5_BossFight from './components/Level5_BossFight';
import MemoryCapsule from './components/MemoryCapsule';

const TOTAL_LEVELS = 6;

function App() {
  // Core game state
  const [gameState, setGameState] = useState({
    currentScreen: 'hub', // 'hub', 'level1', 'level2', etc., 'memory'
    currentLevel: 1,
    completedLevels: [],
    unlockedMemories: [],
    lives: 3,
    progress: 0, // 0-100% progress through all levels
    currentMemory: null
  });

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('birthdayGameState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setGameState(prevState => ({
          ...prevState,
          ...parsed,
          // Always start at hub for smooth experience
          currentScreen: 'hub'
        }));
      } catch (error) {
        console.error('Error loading saved game state:', error);
      }
    }
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('birthdayGameState', JSON.stringify(gameState));
  }, [gameState]);

  // Calculate progress percentage
  useEffect(() => {
    const progress = (gameState.completedLevels.length / TOTAL_LEVELS) * 100;
    setGameState(prev => ({ ...prev, progress }));
  }, [gameState.completedLevels]);

  // Game state management functions
  const completeLevel = (levelNumber, memoryData) => {
    setGameState(prev => {
      const newCompletedLevels = [...prev.completedLevels];
      const newUnlockedMemories = [...prev.unlockedMemories];
      
      // Mark level as completed if not already
      if (!newCompletedLevels.includes(levelNumber)) {
        newCompletedLevels.push(levelNumber);
      }
      
      // Add memory if provided
      if (memoryData && !newUnlockedMemories.some(m => m.level === levelNumber)) {
        newUnlockedMemories.push({
          level: levelNumber,
          ...memoryData
        });
      }

      return {
        ...prev,
        completedLevels: newCompletedLevels,
        unlockedMemories: newUnlockedMemories,
        currentScreen: 'memory',
        currentMemory: memoryData,
        lives: 3 // Reset lives for next level
      };
    });
  };

  const startLevel = (levelNumber) => {
    setGameState(prev => ({
      ...prev,
      currentLevel: levelNumber,
      currentScreen: `level${levelNumber}`,
      lives: 3 // Reset lives when starting a level
    }));
  };

  const returnToHub = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'hub'
    }));
  };

  const lastLoseLifeTimeRef = useRef(0);
  
  const loseLife = () => {
    const now = Date.now();
    // Prevent multiple loseLife calls within 100ms (debounce)
    if (now - lastLoseLifeTimeRef.current < 100) {
      return;
    }
    lastLoseLifeTimeRef.current = now;
    
    setGameState(prev => {
      const newLives = prev.lives - 1;
      if (newLives <= 0) {
        // For Level 1, let the level handle game over (has its own dialog)
        // For other levels, return to hub with reset lives
        if (prev.currentScreen === 'level1') {
          return {
            ...prev,
            lives: newLives // Let Level 1 handle the game over state
          };
        } else {
          // Game over for other levels - return to hub with reset lives
          return {
            ...prev,
            lives: 3,
            currentScreen: 'hub'
          };
        }
      }
      return {
        ...prev,
        lives: newLives
      };
    });
  };

  const resetGame = () => {
    const resetState = {
      currentScreen: 'hub',
      currentLevel: 1,
      completedLevels: [],
      unlockedMemories: [],
      lives: 3,
      progress: 0,
      currentMemory: null
    };
    setGameState(resetState);
    localStorage.setItem('birthdayGameState', JSON.stringify(resetState));
  };

  const resetLives = () => {
    setGameState(prev => ({
      ...prev,
      lives: 3
    }));
  };

  const openMemoryRoom = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'memory-room'
    }));
  };

  const closeMemory = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'hub',
      currentMemory: null
    }));
  };

  // Render current screen
  const renderCurrentScreen = () => {
    switch (gameState.currentScreen) {
      case 'hub':
        return (
          <LevelHub
            gameState={gameState}
            onStartLevel={startLevel}
            onOpenMemoryRoom={openMemoryRoom}
            onResetGame={resetGame}
          />
        );
      
      case 'level1':
        return (
          <Level1_Platformer
            lives={gameState.lives}
            onComplete={(memoryData) => completeLevel(1, memoryData)}
            onLoseLife={loseLife}
            onReturnToHub={returnToHub}
            onResetLives={resetLives}
          />
        );

      case 'level2':
        return (
          <Level2_MoulinRouge
            lives={gameState.lives}
            onComplete={(memoryData) => completeLevel(2, memoryData)}
            onLoseLife={loseLife}
            onReturnToHub={returnToHub}
            onResetLives={resetLives}
          />
        );

      case 'level3':
        return (
          <Level3_PuzzleOfUs
            lives={gameState.lives}
            onComplete={(memoryData) => completeLevel(3, memoryData)}
            onLoseLife={loseLife}
            onReturnToHub={returnToHub}
            onResetLives={resetLives}
          />
        );

      case 'level4':
        return (
          <Level4_StarCollect
            lives={gameState.lives}
            onComplete={(memoryData) => completeLevel(4, memoryData)}
            onLoseLife={loseLife}
            onReturnToHub={returnToHub}
            onResetLives={resetLives}
          />
        );

      case 'level5':
        return (
          <Level5_BossFight
            lives={gameState.lives}
            onComplete={(memoryData) => completeLevel(5, memoryData)}
            onLoseLife={loseLife}
            onReturnToHub={returnToHub}
            onResetLives={resetLives}
          />
        );

      case 'memory':
        return (
          <MemoryCapsule
            memory={gameState.currentMemory}
            onClose={closeMemory}
          />
        );
      
      case 'memory-room':
        return (
          <div className="memory-room-screen">
            <h1>🏠 Memory Room</h1>
            <p>All unlocked memories will be displayed here!</p>
            <button onClick={returnToHub}>Return to Hub</button>
          </div>
        );
      
      default:
        return (
          <div className="coming-soon">
            <h2>Level {gameState.currentLevel}</h2>
            <p>Coming soon! This level is under construction.</p>
            <button onClick={returnToHub}>Return to Hub</button>
          </div>
        );
    }
  };

  return (
    <div className="game-container">
      {renderCurrentScreen()}
      
      {/* Global Progress Bar */}
      <GameShell
        progress={gameState.progress}
        lives={gameState.lives}
        showProgressBar={gameState.currentScreen !== 'hub'}
        showLives={gameState.currentScreen !== 'level3'}
      />
    </div>
  );
}

export default App;
