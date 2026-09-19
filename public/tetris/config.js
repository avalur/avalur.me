//-------------------------------------------------------------------------
// TetrisConfig - every knob of the game in one place.
//
// The game reads its settings from here, so changing anything in this object
// and calling applyConfig() is enough to restyle or retune the game while it
// is running. That is what the chat agent in agent-chat.js drives.
//-------------------------------------------------------------------------

var TetrisConfig = {

    board: {
        width:     10,     // court width in blocks
        height:    20,     // court height in blocks
        blockSize: 'auto'  // 'auto' to fit the window, or a size in pixels
    },

    speed: {
        start:     0.6,    // seconds before the piece drops by one row
        decrement: 0.005,  // how much faster the game gets per cleared row
        min:       0.1     // fastest the game is allowed to get
    },

    ai: {
        enabled: false,    // the AI keeps playing on its own
        step:    0.15      // seconds between two AI moves
    },

    scoring: {
        drop: 10,          // points for locking a piece
        line: 100          // points for a single line (doubled for each extra line)
    },

    colors: {              // any CSS color works here
        i: 'cyan',
        j: 'blue',
        l: 'orange',
        o: 'yellow',
        s: 'green',
        t: 'purple',
        z: 'red'
    },

    court: {
        showGrid:       true,       // gray grid behind the blocks
        showGhost:      true,       // preview of where the piece will land
        ghostAlpha:     0.3,        // opacity of that preview
        gridBackground: '#C8C8C8',  // same light gray as the pygame renderer
        gridLineColor:  '#808080',
        borderColor:    '#323232',
        texture:        false       // show texture.jpg instead of a plain grid
    },

    blocks: {
        style:        'flat',       // 'flat' | 'rounded' | 'bevel' | 'glow' | 'outline'
        borderColor:  '#000000',
        borderWidth:  1,
        cornerRadius: 4             // only used by the 'rounded' style
    },

    page: {
        background:      '#FFFFFF',
        panelBackground: '#F8F8F8',
        panelBorder:     '#000000',
        textColor:       '#000000',
        fontFamily:      'Helvetica, sans-serif'
    }
};

//-------------------------------------------------------------------------
// merging and applying
//-------------------------------------------------------------------------

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// recursively copy the properties of patch onto target
function deepMerge(target, patch) {
    for (var key in patch) {
        if (!patch.hasOwnProperty(key))
            continue;
        if (isPlainObject(patch[key]) && isPlainObject(target[key]))
            deepMerge(target[key], patch[key]);
        else
            target[key] = patch[key];
    }
    return target;
}

function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config || TetrisConfig));
}

//-----------------------------------------------------------
// merge a partial config and push it into the running game
//-----------------------------------------------------------
function applyConfig(patch) {
    if (patch)
        deepMerge(TetrisConfig, patch);
    syncConfig(); // defined in game.js
    return TetrisConfig;
}

//-----------------------------------------------------------
// go back to a previously taken snapshot
//-----------------------------------------------------------
function restoreConfig(snapshot) {
    var restored = cloneConfig(snapshot);
    for (var key in restored)
        TetrisConfig[key] = restored[key];
    syncConfig();
    return TetrisConfig;
}
