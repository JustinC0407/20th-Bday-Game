import React, { useState } from 'react';

const CORRECT_PASSWORD = "iloveyou";

// All 5 levels with default data
const ALL_LEVELS = [
  { level: 1, title: 'Level 1 Memory', type: 'text' },
  { level: 2, title: 'Level 2 Memory', type: 'photo' },
  { level: 3, title: 'Level 3 Memory', type: 'text' },
  { level: 4, title: 'Level 4 Memory', type: 'text' },
  { level: 5, title: 'Level 5 Memory', type: 'text' }
];

function MemoryRoomScreen({ unlockedMemories, onReturnToHub }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showError, setShowError] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput.toLowerCase() === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setShowError(false);
    } else {
      setShowError(true);
      setPasswordInput('');
    }
  };

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="memory-room-screen">
        <div className="password-modal">
          <h1>🔒 Memory Room</h1>
          <p>Enter the password to access your memories</p>

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
              className="password-input"
              autoFocus
            />
            <button type="submit" className="submit-button">
              Unlock
            </button>
          </form>

          {showError && (
            <p className="error-message">❌ Incorrect password. Try again!</p>
          )}

          <button onClick={onReturnToHub} className="back-button">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  // Show memory grid after authentication
  return (
    <div className="memory-room-screen authenticated">
      <h1>🏠 Memory Room</h1>
      <p className="subtitle">Your memories ❤️</p>

      <div className="memory-grid">
        {ALL_LEVELS.map((levelData) => {
          // Get memory data if it exists, otherwise use default
          const memoryData = unlockedMemories.find(m => m.level === levelData.level) || levelData;

          return (
            <div key={levelData.level} className="memory-card">
              <div className="memory-card-header">
                <span className="memory-icon">
                  {memoryData.type === 'text' && '📝'}
                  {memoryData.type === 'photo' && '📸'}
                  {memoryData.type === 'video' && '🎥'}
                  {memoryData.type === 'montage' && '🖼️'}
                </span>
                <h3>Level {levelData.level}</h3>
              </div>
              <div className="memory-card-content">
                <h4>{memoryData.title}</h4>
                <p className="memory-preview">{memoryData.content || 'Memory from Level ' + levelData.level}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onReturnToHub} className="hub-button">
        Return to Hub
      </button>
    </div>
  );
}

export default MemoryRoomScreen;
