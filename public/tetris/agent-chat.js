//-------------------------------------------------------------------------
// The chat panel on the right.
//
// It talks to the local proxy in server/serve.py, which forwards the request
// to OpenRouter with the API key attached. The tool-calling loop runs here in
// the browser: the model asks for a tool, we run it against the live game and
// send the result back.
//-------------------------------------------------------------------------

var AgentChat = (function() {

    var MAX_TOOL_ROUNDS = 6;    // how many times the model may call tools in one turn
    var MAX_HISTORY     = 40;   // messages kept in the conversation

    var messages  = [];         // conversation in OpenAI format
    var snapshots = [];         // config snapshots, one per user turn, for undo
    var model     = null;
    var busy      = false;
    var online    = false;      // is the local service answering at all
    var abort     = null;       // AbortController of the request in flight
    var cancelled = false;      // the user pressed Stop

    // the status line under the input: which phase we are in and for how long
    var connectionNote = '';
    var phaseText      = '';
    var phaseStart     = 0;
    var phaseTimer     = null;

    //---------------------------------------------------------------------
    // the system prompt, rebuilt on every request so the model always sees
    // the current settings
    //---------------------------------------------------------------------
    function systemPrompt() {
        return [
            'You are a coding agent embedded in a browser Tetris game. The player talks to you in a chat panel next to the board and asks you to change how the game looks and plays. Answer in the language the user writes in.',
            '',
            'You change the game by calling tools, never by telling the user to edit files:',
            '- update_config is the main one. It deep-merges a partial config, so send only the keys you change.',
            '- run_js is for anything the config cannot express. The code runs in global scope, so you can read and reassign the game functions listed below.',
            '- set_game_state starts, restarts, pauses the game or switches the self-playing AI on.',
            '',
            'The full config object (this is the current state of it):',
            JSON.stringify(TetrisConfig, null, 2),
            '',
            'Current game state: ' + JSON.stringify(AgentTools.state()),
            '',
            'Useful globals for run_js: nx, ny (board size in blocks), dx, dy (block size in pixels), blocks (the nx*ny board array), current, next (the pieces), pieceTypes (the seven piece types, each with .color and .blocks), ctx and canvas (the board), uctx and ucanvas (the next-piece preview), score, rows, playing, paused, aiMode.',
            'Redefinable drawing functions: drawBlock(ctx, x, y, color), drawGrid(), drawCourt(), drawPiece(ctx, type, x, y, dir), drawGhostPiece(ctx, type, x, y, dir), drawPaused(). Game functions: move(dir), rotate(), drop(), hardDrop(), agent(), removeLines(), play(), lose(), reset(), invalidate().',
            'Rendering is dirty-flag based: call invalidate() after changing anything visual. The board is only redrawn when it is invalid.',
            '',
            'Rules:',
            '- Prefer update_config over run_js whenever the config already has the knob.',
            '- Make the change immediately, do not ask for confirmation for cosmetic requests.',
            '- After the tools have run, reply with one or two short sentences saying what you changed.',
            '- If a request is impossible, say so plainly instead of pretending it worked.'
        ].join('\n');
    }

    //---------------------------------------------------------------------
    // DOM helpers
    //---------------------------------------------------------------------
    function el(id) { return document.getElementById(id); }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // escape, then turn ```fenced``` sections into code blocks
    function formatText(text) {
        var parts = escapeHtml(text).split('```');
        var out = '';
        for (var n = 0; n < parts.length; n++)
            out += (n % 2) ? '<pre>' + parts[n].replace(/^\w*\n/, '') + '</pre>'
                           : parts[n].replace(/\n/g, '<br>');
        return out;
    }

    function bubble(role, html) {
        var node = document.createElement('div');
        node.className = 'msg ' + role;
        node.innerHTML = html;
        el('chat-log').appendChild(node);
        scrollDown();
        return node;
    }

    function scrollDown() {
        var log = el('chat-log');
        log.scrollTop = log.scrollHeight;
    }

    function setBusy(state) {
        busy = state;
        el('chat-send').textContent = state ? 'Stop' : 'Send';
        el('chat-send').className    = state ? 'stopping' : '';
        el('chat-send').disabled     = state ? false : !online;
    }

    function setConnection(text, ok) {
        online = ok;
        connectionNote = text;
        var dot = el('chat-dot');
        dot.className = ok ? 'online' : 'offline';
        dot.title = text;
        // while a request runs the button says Stop and must stay clickable
        el('chat-send').disabled = busy ? false : !ok;
        renderNote();
    }

    //---------------------------------------------------------------------
    // the status line: what the agent is doing right now, and for how long,
    // so that a request that hangs is visibly hanging
    //---------------------------------------------------------------------
    function elapsed() {
        return ((Date.now() - phaseStart) / 1000).toFixed(1) + 's';
    }

    function renderNote() {
        var node = el('chat-note');
        if (!phaseText) {
            node.textContent = connectionNote;
            return;
        }
        node.innerHTML = '<span class="spin"></span>' + escapeHtml(phaseText) +
                         ' &middot; ' + elapsed();
    }

    function setPhase(text) {
        if (!phaseText)
            phaseStart = Date.now(); // time the whole turn, not each phase
        phaseText = text;
        if (!phaseTimer)
            phaseTimer = setInterval(renderNote, 100);
        renderNote();
    }

    function endPhase(text) {
        clearInterval(phaseTimer);
        phaseTimer = null;
        var note = text ? text + ' · ' + elapsed() : connectionNote;
        phaseText = '';
        el('chat-note').textContent = note;
    }

    //---------------------------------------------------------------------
    // tool call cards
    //---------------------------------------------------------------------
    function renderToolCall(name, args, result) {
        var failed  = result && result.error;
        var summary = name === 'run_js' ? (args.description || 'custom code')
                                        : JSON.stringify(args).slice(0, 300);
        var card = document.createElement('div');
        card.className = 'tool' + (failed ? ' failed' : '');
        card.innerHTML =
            '<div class="tool-name">' + escapeHtml(name) + (failed ? ' &#10007;' : ' &#10003;') + '</div>' +
            '<div class="tool-args">' + escapeHtml(summary) + '</div>' +
            (failed ? '<div class="tool-error">' + escapeHtml(result.error) + '</div>' : '') +
            (name === 'run_js' ? '<pre class="tool-code">' + escapeHtml(args.code || '') + '</pre>' : '');
        el('chat-log').appendChild(card);
        scrollDown();
    }

    //---------------------------------------------------------------------
    // one streamed completion; returns the assistant message and its tool calls
    //---------------------------------------------------------------------
    function streamCompletion(onDelta) {
        var body = {
            model:    model,
            stream:   true,
            messages: [{ role: 'system', content: systemPrompt() }].concat(messages),
            tools:    AgentTools.definitions
        };

        setPhase('sending the request');
        abort = new AbortController();

        return fetch('/api/tetris/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
            signal:  abort.signal
        }).then(function(response) {
            if (!response.ok)
                return response.text().then(function(text) { throw new Error(text || ('HTTP ' + response.status)); });
            setPhase('waiting for the model');
            return readStream(response, onDelta);
        });
    }

    function readStream(response, onDelta) {
        var reader  = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer  = '';
        var content = '';
        var toolCalls = [];
        var failure = null; // an error the provider reported inside the stream

        function step() {
            return reader.read().then(function(chunk) {
                if (failure)
                    throw failure;
                if (chunk.done) {
                    if (!content && !toolCalls.length)
                        throw new Error('The model returned an empty answer. Try another model or ask again.');
                    return { role: 'assistant', content: content, tool_calls: toolCalls.length ? toolCalls : undefined };
                }

                buffer += decoder.decode(chunk.value, { stream: true });
                var events = buffer.split('\n\n');
                buffer = events.pop(); // the last piece may be incomplete

                events.forEach(function(event) {
                    event.split('\n').forEach(function(line) {
                        if (line.indexOf('data:') !== 0)
                            return;
                        var payload = line.slice(5).trim();
                        if (!payload || payload === '[DONE]')
                            return;

                        var frame;
                        try { frame = JSON.parse(payload); }
                        catch (e) { return; } // keep-alive comments and partial frames

                        // an unknown model or a provider outage arrives as an
                        // error inside an otherwise successful stream
                        if (frame.error) {
                            failure = new Error(frame.error.message || JSON.stringify(frame.error));
                            return;
                        }

                        var delta = frame.choices && frame.choices[0] && frame.choices[0].delta;
                        if (!delta)
                            return;

                        if (delta.content) {
                            content += delta.content;
                            setPhase('the model is answering');
                            onDelta(content);
                        }
                        if (delta.tool_calls) {
                            setPhase('the model is preparing a change');
                            collectToolCalls(toolCalls, delta.tool_calls);
                        }
                    });
                });
                return step();
            });
        }
        return step();
    }

    // tool calls arrive in fragments that have to be stitched together by index
    function collectToolCalls(toolCalls, deltas) {
        deltas.forEach(function(delta) {
            var at = delta.index || 0;
            if (!toolCalls[at])
                toolCalls[at] = { id: '', type: 'function', function: { name: '', arguments: '' } };
            if (delta.id)
                toolCalls[at].id = delta.id;
            if (delta.function && delta.function.name)
                toolCalls[at].function.name += delta.function.name;
            if (delta.function && delta.function.arguments)
                toolCalls[at].function.arguments += delta.function.arguments;
        });
    }

    function parseArgs(raw) {
        if (!raw)
            return {};
        try { return JSON.parse(raw); }
        catch (e) { return { __parseError: e.message, __raw: raw }; }
    }

    //---------------------------------------------------------------------
    // a full turn: model -> tools -> model -> ... -> final answer
    //---------------------------------------------------------------------
    function runTurn() {
        var node = bubble('assistant', '<span class="cursor">&#9611;</span>');

        return streamCompletion(function(text) {
            node.innerHTML = formatText(text) + '<span class="cursor">&#9611;</span>';
            scrollDown();
        }).then(function(reply) {
            if (reply.content)
                node.innerHTML = formatText(reply.content);
            else
                node.remove(); // a turn that is only tool calls has nothing to show

            messages.push(reply);

            if (!reply.tool_calls)
                return;
            return runTools(reply.tool_calls);
        });
    }

    // run the tools one by one, giving the browser a moment to paint the
    // status line and the card of each one
    function runTools(toolCalls) {
        var chain = Promise.resolve();

        toolCalls.forEach(function(toolCall) {
            chain = chain.then(function() {
                if (cancelled)
                    return;
                var name = toolCall.function.name;
                setPhase('running ' + name);

                return pause().then(function() {
                    var args   = parseArgs(toolCall.function.arguments);
                    var result = args.__parseError
                        ? { error: 'could not parse the arguments: ' + args.__parseError }
                        : AgentTools.call(name, args);

                    renderToolCall(name, args, result);
                    messages.push({
                        role:         'tool',
                        tool_call_id: toolCall.id,
                        content:      JSON.stringify(result).slice(0, 4000)
                    });
                });
            });
        });

        return chain.then(function() {
            if (cancelled)
                return;
            setPhase('sending the result back');
            return true; // there is more to do
        });
    }

    function pause() {
        return new Promise(function(done) { setTimeout(done, 0); });
    }

    function send(text) {
        if (busy || !text.trim())
            return;

        snapshots.push(cloneConfig());
        el('chat-undo').disabled = false;

        messages.push({ role: 'user', content: text });
        if (messages.length > MAX_HISTORY)
            messages = messages.slice(-MAX_HISTORY);
        bubble('user', formatText(text));

        cancelled = false;
        setBusy(true);

        var round = 0;
        function next(more) {
            if (!more || cancelled || ++round >= MAX_TOOL_ROUNDS)
                return;
            return runTurn().then(next);
        }

        runTurn()
            .then(next)
            .then(function() {
                endPhase(cancelled ? 'stopped after' : 'done in');
            })
            .catch(function(error) {
                if (error.name === 'AbortError') {
                    endPhase('stopped after');
                    bubble('note', 'Request stopped.');
                }
                else {
                    endPhase('failed after');
                    bubble('error', escapeHtml(error.message));
                }
            })
            .then(function() {
                abort = null;
                setBusy(false);
                el('chat-input').focus();
            });
    }

    function stop() {
        cancelled = true;
        if (abort)
            abort.abort();
    }

    //---------------------------------------------------------------------
    // undo
    //---------------------------------------------------------------------
    function undo() {
        if (!snapshots.length)
            return;
        restoreConfig(snapshots.pop());
        el('chat-undo').disabled = !snapshots.length;
        bubble('note', 'Settings restored to the state before the last message. Code run by run_js is not undone &mdash; use Reset for that.');
    }

    //---------------------------------------------------------------------
    // startup: is the proxy running, and which models does it offer?
    //---------------------------------------------------------------------
    function connect() {
        fetch('/api/tetris/status').then(function(r) { return r.json(); }).then(function(status) {
            if (!status.hasKey) {
                setConnection('Proxy is up, but OPENROUTER_API_KEY is not set', false);
                return;
            }
            setConnection('Connected to OpenRouter', true);
            model = status.model;
            loadModels(status.model);
        }).catch(function() {
            setConnection('Agent service is offline (click to retry)', false);
        });
    }

    function loadModels(preferred) {
        var select = el('chat-model');
        fetch('/api/tetris/models').then(function(r) { return r.json(); }).then(function(data) {
            select.innerHTML = '';
            (data.models || []).forEach(function(item) {
                var option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name || item.id;
                select.appendChild(option);
            });
            if (preferred && !(data.models || []).some(function(m) { return m.id === preferred; })) {
                var option = document.createElement('option');
                option.value = option.textContent = preferred;
                select.insertBefore(option, select.firstChild);
            }
            select.value = model = preferred || select.value;
        }).catch(function() {
            select.innerHTML = '<option>' + (preferred || 'no models') + '</option>';
        });
    }

    //---------------------------------------------------------------------
    function init() {
        el('chat-form').addEventListener('submit', function(ev) {
            ev.preventDefault();
            if (busy)          // the Send button turns into Stop while a request runs
                return stop();
            var input = el('chat-input');
            send(input.value);
            input.value = '';
        });

        // Enter sends, Shift+Enter makes a new line
        el('chat-input').addEventListener('keydown', function(ev) {
            ev.stopPropagation(); // do not let the game grab the arrow keys while typing
            if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                el('chat-form').dispatchEvent(new Event('submit'));
            }
        });

        // the service is often started after the page is already open
        el('chat-note').addEventListener('click', function() {
            if (!online && !busy) {
                setConnection('reconnecting...', false);
                connect();
            }
        });

        el('chat-model').addEventListener('change', function(ev) { model = ev.target.value; });
        el('chat-undo').addEventListener('click', undo);
        el('chat-reset').addEventListener('click', function() { location.reload(); });
        el('chat-undo').disabled = true;

        connect();
    }

    return { init: init, send: send, undo: undo, messages: messages };
})();
