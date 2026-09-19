//-------------------------------------------------------------------------
// The tools the chat agent is allowed to call.
//
// Most requests are served by update_config, which is predictable and easy
// to undo. run_js is the escape hatch for everything the config does not
// cover yet.
//-------------------------------------------------------------------------

var AgentTools = {

    //---------------------------------------------------------------------
    // schemas sent to the model (OpenAI / OpenRouter function-calling format)
    //---------------------------------------------------------------------
    definitions: [
        {
            type: 'function',
            function: {
                name: 'get_config',
                description: 'Read the current game configuration and state. Call this first if you are unsure what the game looks like right now.',
                parameters: { type: 'object', properties: {}, required: [] }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_config',
                description: 'Change the game settings or appearance. Pass a partial config object; it is deep-merged into the current one, so send only the keys you want to change. This is the preferred way to restyle or retune the game.',
                parameters: {
                    type: 'object',
                    properties: {
                        patch: {
                            type: 'object',
                            description: 'Partial TetrisConfig, e.g. {"colors":{"i":"#ff00ff"},"blocks":{"style":"glow"},"speed":{"start":0.3}}',
                            additionalProperties: true
                        }
                    },
                    required: ['patch']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'set_game_state',
                description: 'Start, restart, pause or unpause the game, or switch the self-playing AI on and off.',
                parameters: {
                    type: 'object',
                    properties: {
                        playing: { type: 'boolean', description: 'true starts a new game, false ends the current one' },
                        paused:  { type: 'boolean', description: 'pause or unpause' },
                        aiMode:  { type: 'boolean', description: 'let the heuristic AI play on its own' },
                        restart: { type: 'boolean', description: 'restart from an empty board' }
                    },
                    required: []
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'run_js',
                description: 'Run JavaScript in the page to do something the config cannot express (custom drawing, new key bindings, animations, patched game functions). The code runs in global scope and can read and redefine any game function. Use this only when update_config is not enough.',
                parameters: {
                    type: 'object',
                    properties: {
                        code:        { type: 'string', description: 'The JavaScript to run. Redefine functions by assignment, e.g. drawBlock = function(ctx, x, y, color) { ... }' },
                        description: { type: 'string', description: 'One short line describing what this code does, shown to the user' }
                    },
                    required: ['code', 'description']
                }
            }
        }
    ],

    //---------------------------------------------------------------------
    // execution
    //---------------------------------------------------------------------
    call: function(name, args) {
        args = args || {};
        switch(name) {
            case 'get_config':     return AgentTools.getConfig();
            case 'update_config':  return AgentTools.updateConfig(args);
            case 'set_game_state': return AgentTools.setGameState(args);
            case 'run_js':         return AgentTools.runJs(args);
            default:               return { error: 'unknown tool: ' + name };
        }
    },

    getConfig: function() {
        return { config: cloneConfig(), state: AgentTools.state() };
    },

    state: function() {
        return {
            playing: !!playing,
            paused:  !!paused,
            aiMode:  !!aiMode,
            score:   score,
            rows:    rows,
            board:   { width: nx, height: ny, blockSizePx: dx }
        };
    },

    updateConfig: function(args) {
        var patch = args.patch;
        if (typeof patch === 'string') {
            try { patch = JSON.parse(patch); }
            catch (e) { return { error: 'patch is not valid JSON: ' + e.message }; }
        }
        if (!isPlainObject(patch))
            return { error: 'patch must be an object' };

        try {
            applyConfig(patch);
            return { ok: true, config: cloneConfig() };
        }
        catch (e) {
            return { error: 'applying the patch failed: ' + e.message };
        }
    },

    setGameState: function(args) {
        try {
            if (args.restart) {
                reset();
                if (!playing) play();
            }
            if (typeof args.playing === 'boolean') {
                if (args.playing && !playing)  play();
                if (!args.playing && playing) lose();
            }
            if (typeof args.paused === 'boolean' && !!paused !== args.paused)
                togglePause();
            if (typeof args.aiMode === 'boolean' && !!aiMode !== args.aiMode)
                toggleAi();
            return { ok: true, state: AgentTools.state() };
        }
        catch (e) {
            return { error: e.message };
        }
    },

    runJs: function(args) {
        if (typeof args.code !== 'string')
            return { error: 'code must be a string' };
        try {
            var result = window.eval(args.code); // global scope, so the game internals are visible
            invalidate();
            invalidateNext();
            return {
                ok: true,
                result: result === undefined ? null : String(result).slice(0, 500),
                state: AgentTools.state()
            };
        }
        catch (e) {
            return { error: e.name + ': ' + e.message };
        }
    }
};
