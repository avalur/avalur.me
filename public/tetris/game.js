    //-------------------------------------------------------------------------
    // base helper methods
    //-------------------------------------------------------------------------

    function get(id)        { return document.getElementById(id);  }
    function hide(id)       { get(id).style.visibility = 'hidden'; }
    function show(id)       { get(id).style.visibility = null;     }
    function html(id, html) { get(id).innerHTML = html;            }

    function timestamp()           { return new Date().getTime();                             }
    function random(min, max)      { return (min + (Math.random() * (max - min)));            }
    function randomChoice(choices) { return choices[Math.round(random(0, choices.length-1))]; }

    if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
    }

    // Initialize the Tetris court
    function initializeBoard(nx, ny) {
        let board = [];
        for (let x = 0; x < nx; x++) {
            board[x] = [];
            for (let y = 0; y < ny; y++) {
                board[x][y] = 0;
            }
        }
        return board;
    }

    //-------------------------------------------------------------------------
    // game constants
    //-------------------------------------------------------------------------

    var KEY     = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, M: 77, P: 80 },
    DIR     = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3, AI: -1},
    stats   = new Stats(),
    canvas  = get('canvas'),
    ctx     = canvas.getContext('2d'),
    ucanvas = get('upcoming'),
    uctx    = ucanvas.getContext('2d'),
    speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // how long before piece drops by 1 row (seconds)
    aiStep  = 0.15, // how long between two moves of the AI when the AI mode is on (seconds)
    nx      = 10, // width of tetris court (in blocks)
    ny      = 20, // height of tetris court (in blocks)
    nu      = 5;  // width/height of upcoming preview (in blocks)

    // everything above is kept in sync with TetrisConfig (see config.js) by syncConfig()

    //-------------------------------------------------------------------------
    // game variables (initialized during reset)
    //-------------------------------------------------------------------------

    var dx, dy,    // pixel size of a single tetris block
    du,            // pixel size of a block in the next-piece preview
    blocks,        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    actions,       // queue of user actions (inputs)
    playing,       // true|false - game is in progress
    paused,        // true|false - game is paused
    aiMode,        // true|false - the AI plays on its own
    aidt,          // time since the last AI move
    dt,            // time since starting this game
    current,       // the current piece
    next,          // the next piece
    score,         // the current score
    vscore,        // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
    rows,          // number of completed rows in the current game
    step;          // how long before current piece drops by 1 row

    //-------------------------------------------------------------------------
    // tetris pieces
    // blocks: each element represents a rotation of the piece (0, 90, 180, 270)
    //         each element is a 16-bit integer where the 16 bits represent
    //         a 4x4 set of blocks, e.g. j.blocks[0] = 0x44C0
    //
    //             0100 = 0x4 << 3 = 0x4000
    //             0100 = 0x4 << 2 = 0x0400
    //             1100 = 0xC << 1 = 0x00C0
    //             0000 = 0x0 << 0 = 0x0000
    //                               ------
    //                               0x44C0
    //-------------------------------------------------------------------------
    const i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
    const j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
    const l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
    const o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
    const s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
    const t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
    const z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

    // named pieces, so that the config (and the chat agent) can recolor them
    var pieceTypes = { i: i, j: j, l: l, o: o, s: s, t: t, z: z };

    //------------------------------------------------
    // do the bit manipulation and iterate through each
    // occupied block (x,y) for a given piece
    //------------------------------------------------
    function eachblock(type, x, y, dir, fn) {
        var bit, row = 0, col = 0, blocks = type.blocks[dir];
        for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
            if (blocks & bit) {
                fn(x + col, y + row);
            }
            if (++col === 4) {
                col = 0;
                ++row;
            }
        }
    }

    //-----------------------------------------------------
    // check if a piece can fit into a position in the grid
    //-----------------------------------------------------
    function occupied(type, x, y, dir, board) {
        var result = false
        eachblock(type, x, y, dir, function(x, y) {
            if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || board[x][y])
                result = true;
        });
        return result;
    }

    //-----------------------------------------
    // start with 4 instances of each piece and
    // pick randomly until the 'bag is empty'
    //-----------------------------------------
    var pieces = [];
    function randomPiece() {
        if (pieces.length === 0)
            pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
        var type = pieces.splice(random(0, pieces.length-1), 1)[0];
        return { type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0 };
    }


    //-------------------------------------------------------------------------
    // GAME LOOP
    //-------------------------------------------------------------------------

    function run() {

        showStats(); // initialize FPS counter
        addEvents(); // attach keydown and resize events

        var now;
        var last = now = timestamp();
        function frame() {
            now = timestamp();
            update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able
            // to handle large delta's caused when it 'hibernates' in a background or non-visible tab
            draw();
            stats.update();
            last = now;
            requestAnimationFrame(frame);
        }

        syncConfig(); // pull the settings out of TetrisConfig (this also sizes everything)
        reset();      // reset the per-game variables
        frame();      // start the first frame

    }

    //-------------------------------------------------------------------------
    // CONFIGURATION
    //
    // syncConfig() copies TetrisConfig into the variables the game loop uses.
    // Call it (or rather applyConfig() from config.js) after changing anything.
    //-------------------------------------------------------------------------

    function syncConfig() {
        var c = TetrisConfig;
        var resized = (nx !== c.board.width) || (ny !== c.board.height);

        nx     = c.board.width;
        ny     = c.board.height;
        speed  = c.speed;
        aiStep = c.ai.step;
        aiMode = c.ai.enabled;

        for (var name in pieceTypes) {
            if (c.colors[name])
                pieceTypes[name].color = c.colors[name];
        }

        applyPageStyle();
        resize();

        if (resized && blocks)  // the board array no longer matches the new size
            reset();
        else
            setRows(rows || 0); // recompute the drop speed

        invalidate();
        invalidateNext();
        invalidateScore();
        drawStatus();
    }

    //-----------------------------------------------------
    // push the page-level colors and fonts into the DOM
    //-----------------------------------------------------
    function applyPageStyle() {
        var p = TetrisConfig.page, style = get('tetris-theme');
        if (!style) {
            style = document.createElement('style');
            style.id = 'tetris-theme';
            document.head.appendChild(style);
        }
        style.innerHTML =
            'body    { background: ' + p.background + '; color: ' + p.textColor +
            '; font-family: ' + p.fontFamily + '; }' +
            '#tetris { background: ' + p.panelBackground + '; border-color: ' + p.panelBorder + '; }' +
            // the legend and the preview follow the theme, otherwise a dark
            // theme leaves dark text on a dark panel
            '#legend, #legend h2, #menu p a { color: ' + p.textColor + '; }' +
            '#legend kbd { background: ' + p.panelBackground + '; color: ' + p.textColor +
            '; border-color: ' + p.panelBorder + '; }' +
            '#upcoming { background: ' + TetrisConfig.court.gridBackground + '; }';
        canvas.style.background = TetrisConfig.court.texture ? 'url(/tetris/texture.jpg)' : 'none';
    }

    function showStats() {
        stats.domElement.id = 'stats';
        get('menu').appendChild(stats.domElement);
    }

    function addEvents() {
        document.addEventListener('keydown', keydown, false);
        window.addEventListener('resize', resize, false);
    }

    function resize(event) {
        var block = blockSize();

        dx = block; // pixel size of a single tetris block
        dy = block; // (ditto)

        canvas.width        = nx * block;
        canvas.height       = ny * block;
        canvas.style.width  = canvas.width  + 'px';
        canvas.style.height = canvas.height + 'px';

        du = Math.min(block, Math.floor(200 / nu)); // the preview must fit the menu column
        ucanvas.width        = nu * du;
        ucanvas.height       = nu * du;
        ucanvas.style.width  = ucanvas.width  + 'px';
        ucanvas.style.height = ucanvas.height + 'px';

        invalidate();
        invalidateNext();
    }

    //---------------------------------------------------------------
    // a block is either the size asked for in the config, or as big
    // as the window can fit
    //---------------------------------------------------------------
    function blockSize() {
        var configured = TetrisConfig.board.blockSize;
        if (typeof configured === 'number')
            return Math.max(4, Math.round(configured));

        // measure the columns standing next to the board instead of guessing,
        // so the chat panel and the legend always keep their space
        var box = get('tetris'), taken = 0, n;
        for (n = 0; box && box.children && n < box.children.length; n++) {
            if (box.children[n] !== canvas)
                taken += (box.children[n].offsetWidth || 0) + 16; // column plus the flex gap
        }
        var room = Math.min((window.innerHeight - 80) / ny,
                            (window.innerWidth - taken - 60) / nx);
        return Math.max(8, Math.min(40, Math.floor(room)));
    }

    function keydown(ev) {
        var handled = false;
        if (playing) {
            switch(ev.keyCode) { // these work even while the game is paused
                case KEY.P:      togglePause();           handled = true; break;
                case KEY.M:      toggleAi();              handled = true; break;
                case KEY.ESC:    lose();                  handled = true; break;
            }
            if (!handled && !paused) {
                switch(ev.keyCode) {
                    case KEY.LEFT:   actions.push(DIR.LEFT);  handled = true; break;
                    case KEY.RIGHT:  actions.push(DIR.RIGHT); handled = true; break;
                    case KEY.UP:     actions.push(DIR.UP);    handled = true; break;
                    case KEY.DOWN:   actions.push(DIR.DOWN);  handled = true; break; // hard drop
                    case KEY.SPACE:  actions.push(DIR.AI);    handled = true; break; // a single AI move
                }
            }
        }
        else if (ev.keyCode == KEY.SPACE) {
            play();
            handled = true;
        }
        if (handled)
            ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
    }

    //-------------------------------------------------------------------------
    // GAME LOGIC
    //-------------------------------------------------------------------------

    function play() { hide('start'); reset();          playing = true;  drawStatus(); }
    function lose() { show('start'); setVisualScore(); playing = false; drawStatus(); }

    function togglePause() { paused = !paused; invalidate(); drawStatus(); }
    function toggleAi()    { aiMode = !aiMode; aidt = 0; TetrisConfig.ai.enabled = aiMode; drawStatus(); }

    //---------------------------------------------------------
    // show the pause / AI state next to the controls legend
    //---------------------------------------------------------
    function drawStatus() {
        var state = [];
        if (playing && paused) state.push('PAUSED');
        if (aiMode)            state.push('AI MODE ON');
        html('status', state.join(' &middot; '));
    }

    function setVisualScore(n)      { vscore = n || score; invalidateScore(); }
    function setScore(n)            { score = n; setVisualScore(n);  }
    function addScore(n)            { score = score + n;   }
    function clearScore()           { setScore(0); }
    function clearRows()            { setRows(0); }
    function setRows(n)             { rows = n; step = Math.max(speed.min, speed.start - (speed.decrement*rows)); invalidateRows(); }
    function addRows(n)             { setRows(rows + n); }
    function getBlock(x,y)          { return (blocks && blocks[x] ? blocks[x][y] : null); }
    function setBlock(x,y,type)     { blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate(); }
    function clearBlocks()          { blocks = initializeBoard(nx, ny); invalidate(); }
    function clearActions()         { actions = []; }
    function setCurrentPiece(piece) { current = piece || randomPiece(); invalidate();     }
    function setNextPiece(piece)    { next    = piece || randomPiece(); invalidateNext(); }

    function reset() {
        dt = 0;
        aidt = 0;
        paused = false;
        clearActions();
        clearBlocks();
        clearRows();
        clearScore();
        setCurrentPiece(next);
        setNextPiece();
    }

    function update(idt) {
        if (playing && !paused) {
            if (vscore < score)
                setVisualScore(vscore + 1);
            handle(actions.shift());
            if (aiMode) {
                aidt = aidt + idt;
                if (aidt > aiStep) {
                    aidt = 0;
                    agent();
                }
            }
            dt = dt + idt;
            if (dt > step) {
                dt = dt - step;
                drop();
            }
        }
    }

    function handle(action) {
        switch(action) {
            case DIR.LEFT:  move(DIR.LEFT);  break;
            case DIR.RIGHT: move(DIR.RIGHT); break;
            case DIR.UP:    rotate();        break;
            case DIR.DOWN:  hardDrop();      break;
            case DIR.AI:    agent();         break;
        }
    }

    //-------------------------------------------------
    // drop the piece all the way down and lock it there
    //-------------------------------------------------
    function hardDrop() {
        while (move(DIR.DOWN)) { /* fall until something is in the way */ }
        drop(); // drop() cannot move any further, so it locks the piece
    }

    function move(dir) {
        var x = current.x, y = current.y;
        switch(dir) {
            case DIR.RIGHT: x = x + 1; break;
            case DIR.LEFT:  x = x - 1; break;
            case DIR.DOWN:  y = y + 1; break;
        }
        if (!occupied(current.type, x, y, current.dir, blocks)) {
            current.x = x;
            current.y = y;
            invalidate();
            return true;
        }
        else {
            return false;
        }
    }

    function rotate() {
        var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
        if (!occupied(current.type, current.x, current.y, newdir, blocks)) {
            current.dir = newdir;
            invalidate();
        }
    }

    //-------------------------------------------------
    // the row where the current piece would land
    //-------------------------------------------------
    function getGhostY() {
        var y = current.y;
        while (!occupied(current.type, current.x, y + 1, current.dir, blocks))
            y = y + 1;
        return y;
    }

    function drop() {
        if (!move(DIR.DOWN)) {
            addScore(TetrisConfig.scoring.drop);
            dropPiece();
            removeLines();
            setCurrentPiece(next);
            setNextPiece(randomPiece());
            clearActions();
            if (occupied(current.type, current.x, current.y, current.dir, blocks)) {
                lose();
            }
        }
    }

    function dropPiece() {
        eachblock(current.type, current.x, current.y, current.dir, function(x, y) {
            setBlock(x, y, current.type);
        });
    }

    function removeLines() {
        var x, y, complete, n = 0;
        for(y = ny ; y > 0 ; --y) {
            complete = true;
            for(x = 0 ; x < nx ; ++x) {
                if (!getBlock(x, y)) {
                    complete = false;
                    break;
                }
            }
            if (complete) {
                removeLine(y);
                y = y + 1; // recheck same line
                n++;
            }
        }
        if (n > 0) {
            addRows(n);
            addScore(TetrisConfig.scoring.line*Math.pow(2,n-1)); // 1: 100, 2: 200, 3: 400, 4: 800
        }
    }

    function removeLine(n) {
        var x, y;
        for(y = n ; y >= 0 ; --y) {
            for(x = 0 ; x < nx ; ++x)
                setBlock(x, y, (y == 0) ? 0 : getBlock(x, y-1));
        }
    }

    //-------------------------------------------------------------------------
    // RENDERING
    //-------------------------------------------------------------------------

    var invalid = {};

    function invalidate()         { invalid.court  = true; }
    function invalidateNext()     { invalid.next   = true; }
    function invalidateScore()    { invalid.score  = true; }
    function invalidateRows()     { invalid.rows   = true; }

    function draw() {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.translate(0.5, 0.5); // for crisp 1px black lines
        drawCourt();
        drawNext();
        drawScore();
        drawRows();
        ctx.restore();
    }

    function drawCourt() {
        if (invalid.court) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (TetrisConfig.court.showGrid)
                drawGrid();
            var x, y, block;
            for(y = 0 ; y < ny ; y++) {
                for (x = 0 ; x < nx ; x++) {
                    if (block = getBlock(x, y))
                        drawBlock(ctx, x, y, block.color);
                }
            }
            if (playing) {
                if (TetrisConfig.court.showGhost) {
                    var ghosty = getGhostY();
                    if (ghosty != current.y) // no point in drawing the ghost under the piece itself
                        drawGhostPiece(ctx, current.type, current.x, ghosty, current.dir);
                }
                drawPiece(ctx, current.type, current.x, current.y, current.dir);
            }
            ctx.strokeStyle = TetrisConfig.court.borderColor;
            ctx.strokeRect(0, 0, nx*dx - 1, ny*dy - 1); // court boundary
            if (playing && paused)
                drawPaused();
            invalid.court = false;
        }
    }

    //---------------------------------------------------
    // gray grid background, same as the pygame renderer
    //---------------------------------------------------
    function drawGrid() {
        var n;
        ctx.fillStyle = TetrisConfig.court.gridBackground;
        ctx.fillRect(0, 0, nx*dx, ny*dy);
        ctx.strokeStyle = TetrisConfig.court.gridLineColor;
        ctx.beginPath();
        for(n = 0 ; n <= nx ; n++) {
            ctx.moveTo(n*dx, 0);
            ctx.lineTo(n*dx, ny*dy);
        }
        for(n = 0 ; n <= ny ; n++) {
            ctx.moveTo(0, n*dy);
            ctx.lineTo(nx*dx, n*dy);
        }
        ctx.stroke();
    }

    function drawPaused() {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, nx*dx, ny*dy);
        ctx.fillStyle = 'white';
        ctx.font = 'bold ' + Math.round(dx) + 'px Helvetica, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', nx*dx/2, ny*dy/2);
        ctx.restore();
    }

    function drawNext() {
        if (invalid.next) {
            var padding = (nu - next.type.size) / 2; // half-arsed attempt at centering next piece display
            var bx = dx, by = dy;
            dx = dy = du; // drawBlock works in dx/dy, and the preview has its own block size
            uctx.save();
            uctx.translate(0.5, 0.5);
            uctx.clearRect(0, 0, nu*dx, nu*dy);
            drawPiece(uctx, next.type, padding, padding, next.dir);
            uctx.strokeStyle = TetrisConfig.court.borderColor;
            uctx.strokeRect(0, 0, nu*dx - 1, nu*dy - 1);
            uctx.restore();
            dx = bx; dy = by;
            invalid.next = false;
        }
    }

    function drawScore() {
        if (invalid.score) {
            html('score', ("00000000" + Math.floor(vscore)).slice(-8));
            invalid.score = false;
        }
    }

    function drawRows() {
        if (invalid.rows) {
            html('rows', rows);
            invalid.rows = false;
        }
    }

    function drawPiece(ctx, type, x, y, dir) {
        eachblock(type, x, y, dir, function(x, y) {
            drawBlock(ctx, x, y, type.color);
        });
    }

    function drawBlock(ctx, x, y, color) {
        var b = TetrisConfig.blocks, px = x*dx, py = y*dy;

        ctx.save();
        ctx.fillStyle   = color;
        ctx.strokeStyle = b.borderColor;
        ctx.lineWidth   = b.borderWidth;

        switch(b.style) {
            case 'rounded':
                roundedRect(ctx, px, py, dx, dy, Math.min(b.cornerRadius, dx/2));
                ctx.fill();
                if (b.borderWidth > 0) ctx.stroke();
                break;

            case 'glow':
                ctx.shadowColor = color;
                ctx.shadowBlur  = dx * 0.7;
                ctx.fillRect(px, py, dx, dy);
                ctx.shadowBlur  = 0;
                if (b.borderWidth > 0) ctx.strokeRect(px, py, dx, dy);
                break;

            case 'outline':
                ctx.globalAlpha = 0.25;
                ctx.fillRect(px, py, dx, dy);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = color;
                ctx.lineWidth   = Math.max(2, b.borderWidth);
                ctx.strokeRect(px, py, dx, dy);
                break;

            case 'bevel':
                ctx.fillRect(px, py, dx, dy);
                ctx.fillStyle = 'rgba(255,255,255,0.45)'; // lit top-left edge
                ctx.fillRect(px, py, dx, dy*0.15);
                ctx.fillRect(px, py, dx*0.15, dy);
                ctx.fillStyle = 'rgba(0,0,0,0.35)';       // shaded bottom-right edge
                ctx.fillRect(px, py + dy*0.85, dx, dy*0.15);
                ctx.fillRect(px + dx*0.85, py, dx*0.15, dy);
                if (b.borderWidth > 0) ctx.strokeRect(px, py, dx, dy);
                break;

            default: // 'flat'
                ctx.fillRect(px, py, dx, dy);
                if (b.borderWidth > 0) ctx.strokeRect(px, py, dx, dy);
        }
        ctx.restore();
    }

    function roundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
    }

    //-------------------------------------------------------
    // the semi-transparent preview of where the piece will land
    //-------------------------------------------------------
    function drawGhostPiece(ctx, type, x, y, dir) {
        ctx.save();
        ctx.fillStyle   = type.color;
        ctx.strokeStyle = type.color;
        ctx.lineWidth   = 2;
        eachblock(type, x, y, dir, function(x, y) {
            ctx.globalAlpha = TetrisConfig.court.ghostAlpha;
            ctx.fillRect(x*dx, y*dy, dx, dy);
            ctx.globalAlpha = 1;
            ctx.strokeRect(x*dx, y*dy, dx, dy);
        });
        ctx.restore();
    }

    function agent() {
        let bestMove = selectBestMove(current, next);
        if (bestMove) {
            let dropY = getDropPosition(bestMove.piece, bestMove.x);
            current.x = bestMove.x;
            current.y = dropY;
            current.dir = bestMove.piece.dir;
            drop();
        }
    }
