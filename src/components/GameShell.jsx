function GameShell({ progress, lives, showProgressBar, showLives = true }) {
  if (!showProgressBar) {
    return null; // Don't show progress bar on hub
  }

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        >
          <span className="progress-heart">
            {progress > 5 && '❤️'}
          </span>
        </div>
      </div>

      {/* Lives display - only show if showLives is true */}
      {showLives && (
        <div className="lives-display">
          <span className="lives-label">Lives: </span>
          {[...Array(3)].map((_, index) => (
            <span
              key={index}
              className={`life-heart ${index < lives ? 'active' : 'lost'}`}
            >
              ❤️
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default GameShell;