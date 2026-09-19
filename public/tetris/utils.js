/**
 * Utility functions for Tetris game
 */

/**
 * Automatically plays Tetris multiple times and measures performance
 * @param {number} numGames - Number of games to play
 * @param {function} callback - Callback function to be called with results
 * @returns {void}
 */
function autoPlayTetris(numGames = 5, callback = null) {
    // Variables to track performance
    let totalScore = 0;
    let totalRows = 0;
    let gamesPlayed = 0;
    let currentGame = 0;

    // Function to start a new game
    function startNewGame() {
        // Reset game state
        play();

        // Set up interval to automatically make AI moves
        const intervalId = setInterval(() => {
            if (!playing) {
                // Game over, record results
                totalScore += score;
                totalRows += rows;
                gamesPlayed++;

                clearInterval(intervalId);

                // Check if we need to play more games
                if (gamesPlayed < numGames) {
                    currentGame++;
                    console.log(`Game ${currentGame} completed. Score: ${score}, Rows: ${rows}`);
                    // Start next game after a short delay
                    setTimeout(startNewGame, 500);
                } else {
                    // All games completed, calculate averages
                    const avgScore = totalScore / numGames;
                    const avgRows = totalRows / numGames;

                    console.log(`All ${numGames} games completed.`);
                    console.log(`Average Score: ${avgScore.toFixed(2)}`);
                    console.log(`Average Rows: ${avgRows.toFixed(2)}`);

                    // Call callback with results if provided
                    if (callback && typeof callback === 'function') {
                        callback({
                            games: numGames,
                            totalScore: totalScore,
                            totalRows: totalRows,
                            avgScore: avgScore,
                            avgRows: avgRows
                        });
                    }
                }
            } else {
                // Game is still active, make AI move
                agent();
            }
        }, 10); // Make moves quickly
    }

    // Start the first game
    currentGame++;
    console.log(`Starting game ${currentGame} of ${numGames}...`);
    startNewGame();
}

/**
 * Runs a performance test with the current settings
 * @param {number} numGames - Number of games to play
 */
function runPerformanceTest(numGames = 5) {
    console.log(`Starting performance test with ${numGames} games...`);

    // Get the results div that's already in the HTML
    let resultsDiv = document.getElementById('performance-results');

    // Make it visible and show running status
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<h3>Performance Test Running...</h3>';

    // Run the auto play function with a callback to display results
    autoPlayTetris(numGames, (results) => {
        // Display results in the results div
        resultsDiv.innerHTML = `
            <p><strong>Performance Results</strong></p>
            <p>Games: ${results.games}</p>
            <p>Avg Score: <span style="color: #4CAF50; font-weight: bold;">${results.avgScore.toFixed(2)}</span></p>
            <p>Avg Rows: <span style="color: #2196F3; font-weight: bold;">${results.avgRows.toFixed(2)}</span></p>
            <p><button class="performance-btn" onclick="runPerformanceTest(${numGames})">Run Again</button></p>
        `;
    });
}
