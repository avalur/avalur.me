// Heuristic evaluation function
function evaluateBoard(board) {
    let aggregateHeight = 0;
    let completeLines = 0;
    let holes = 0;
    let bumpiness = 0;
    let columnHeights = new Array(nx).fill(0);

    // Calculate aggregate height and column heights
    for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0) {
                columnHeights[x] = ny - y;
                aggregateHeight += columnHeights[x];
                break;
            }
        }
    }

    // Calculate complete lines
    for (let y = 0; y < ny; y++) {
        var complete = true;
        for (let x = 0; x < nx; x++) {
            if (board[x][y] === 0) {
                complete = false;
                break;
            }
        }
        if (complete)
            completeLines++;
    }

    // Calculate holes
    for (let x = 0; x < nx; x++) {
        let blockFound = false;
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0) {
                blockFound = true;
            } else if (blockFound && board[x][y] === 0) {
                holes++;
            }
        }
    }

    // Calculate bumpiness
    for (let x = 0; x < nx - 1; x++) {
        bumpiness += Math.abs(columnHeights[x] - columnHeights[x + 1]);
    }

    // Combine features into a heuristic score
    return -0.51 * aggregateHeight + 0.76 * completeLines - 0.36 * holes - 0.18 * bumpiness;
}

// Function to deep copy the blocks array
function copyBlocks(blocks) {
    let new_blocks = [];
    for (let x = 0; x < nx; x++) {
        new_blocks[x] = [];
        for (let y = 0; y < ny; y++) {
            new_blocks[x][y] = blocks[x][y];
        }
    }
    return new_blocks;
}

// Generate all possible moves for the current piece
function getPossibleMoves(piece, boardState) {
    let moves = [];
    const rotations = [0, 1, 2, 3];
    let currentState = boardState || blocks;

    // For each rotation of the piece
    rotations.forEach(dir => {
         // Create a deep copy of the piece to avoid side effects
         let rotatedPiece = { ...piece, dir };

         // For each horizontal position with shifts
         let xs = [...Array(nx + 3).keys()].map(i => i - 3);
         xs.forEach(x => {
             let y = getDropPosition(rotatedPiece, x, currentState);
             if (!occupied(rotatedPiece.type, x, y, dir, currentState)) {
                 let new_blocks = copyBlocks(currentState);
                 eachblock(rotatedPiece.type, x, y, rotatedPiece.dir, function(x, y) {
                     new_blocks[x][y] = rotatedPiece.type;
                 });
                 moves.push({ piece: rotatedPiece, x: x, y: y, board: new_blocks });
             }
         })
    });

    return moves;
}

// Select the best move based on heuristic evaluation
function selectBestMoveGreedy(piece, nextPiece) {
    let moves = getPossibleMoves(piece);
    let bestMove = null;
    let bestScore = -Infinity;
    moves.forEach(move => {
        let score = evaluateBoard(move.board);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });
    return bestMove;
}

function selectBestMove(piece, nextPiece) {

    let moves = []
    for (let turn = 0; turn < 2; turn++) {
        if (turn === 0) {
            moves = getPossibleMoves(piece, blocks);
            moves.forEach(move => {
                move.father = move;
            });
        } else if (turn === 1) {
            let new_moves = []
            for (let i = 0; i < moves.length; i++) {
                let boardAfterFirstMove = moves[i].board;
                let new_moves_part = getPossibleMoves(nextPiece, boardAfterFirstMove);
                new_moves_part.forEach(move => {move.father = moves[i].father;})
                new_moves.push(...new_moves_part);
            }
            moves = new_moves;
            moves.forEach(move => {
                move.score = evaluateBoard(move.board);
            });
            moves.sort((a, b) => b.score - a.score);
        }
    }
    return moves[0].father;
}

// Function to get the drop position of the piece
function getDropPosition(piece, x, boardState) {
    let y = 0;
    let currentState = boardState || blocks;
    while (!occupied(piece.type, x, y + 1, piece.dir, currentState)) {
        y++;
    }
    return y;
}
