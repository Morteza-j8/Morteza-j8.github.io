document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const rowsInput = document.getElementById('rows-input');
    const rowConfigsContainer = document.getElementById('row-configs-container');
    const createBoardBtn = document.getElementById('create-board-btn');
    const boardContainer = document.getElementById('board-container');
    const paletteContainer = document.getElementById('palette-container');
    const colorPalette = document.getElementById('color-palette');
    const setupContainer = document.getElementById('setup-container');
    const finishSetupBtn = document.getElementById('finish-setup-btn');
    const playControls = document.getElementById('play-controls');
    const solveBtn = document.getElementById('solve-btn');
    const resetBtn = document.getElementById('reset-puzzle-btn');
    const newPuzzleBtn = document.getElementById('new-puzzle-btn');
    const solutionControls = document.getElementById('solution-controls');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const moveCounter = document.getElementById('move-counter');
    const statusMessage = document.getElementById('status-message');
    const moveCountSpan = document.getElementById('move-count');

    // State Variables
    let boardState = [];
    let activeSlot = null;
    let activeColor = null;
    let solutionMoves = [];
    let currentMoveIndex = 0;
    const TUBE_CAPACITY = 4;
    let COLORS = [];
    let COLOR_DATA = [];

    // Load colors from JSON file
    async function loadColors() {
        try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`colors.json?t=${timestamp}`);
            const data = await response.json();
            COLOR_DATA = data;
            COLORS = COLOR_DATA.map(color => color.hex);
            console.log('Colors loaded:', COLORS);
        } catch (error) {
            console.error('Error loading colors:', error);
            // Fallback colors if JSON fails to load
            COLORS = ['#FF0000', '#00FF00', '#FF00FF', '#0000FF', '#FFDAB9', '#F5F5DC', '#FFFF00', '#C0C0C0', '#FFA500', '#00BFFF', '#800080'];
            COLOR_DATA = COLORS.map(hex => ({ hex, name: hex }));
        }
    }

    // Event Listeners
    rowsInput.addEventListener('input', generateRowConfigs);
    createBoardBtn.addEventListener('click', createBoard);
    finishSetupBtn.addEventListener('click', finishSetup);
    
    // Debug the solve button
    console.log('Looking for solve button...');
    console.log('solveBtn element:', solveBtn);
    
    if (solveBtn) {
        console.log('Solve button found, adding click listener');
        solveBtn.addEventListener('click', function(e) {
            console.log('SOLVE BUTTON CLICKED!!!', e);
            e.preventDefault();
            showSolution();
        });
        
        // Test if button is clickable
        setTimeout(() => {
            console.log('Button visible?', !solveBtn.classList.contains('hidden'));
            console.log('Button parent visible?', !solveBtn.parentElement.classList.contains('hidden'));
        }, 1000);
    } else {
        console.error('Solve button not found!');
    }
    
    resetBtn.addEventListener('click', resetPuzzle);
    newPuzzleBtn.addEventListener('click', createNewPuzzle);
    nextBtn.addEventListener('click', () => navigateSolution(1));
    prevBtn.addEventListener('click', () => navigateSolution(-1));

    // Generate row configuration inputs
    function generateRowConfigs() {
        rowConfigsContainer.innerHTML = '';
        for (let i = 1; i <= parseInt(rowsInput.value) || 0; i++) {
            const group = document.createElement('div');
            group.className = 'row-config-group';
            group.innerHTML = `<label for="row-${i}-cols">Tubes in Row ${i}:</label>
                             <input type="number" id="row-${i}-cols" min="1" max="12" value="6">`;
            rowConfigsContainer.appendChild(group);
        }
    }

    // Create the board
    function createBoard() {
        boardContainer.innerHTML = '';
        let tubeIndex = 0;

        rowConfigsContainer.querySelectorAll('input').forEach(input => {
            const cols = parseInt(input.value) || 0;
            const rowEl = document.createElement('div');
            rowEl.className = 'board-row';

            for (let c = 0; c < cols; c++) {
                const tubeEl = document.createElement('div');
                tubeEl.className = 'tube';
                tubeEl.dataset.index = tubeIndex;

                for (let i = 0; i < TUBE_CAPACITY; i++) {
                    const slotEl = document.createElement('div');
                    slotEl.className = 'layer-slot';
                    slotEl.addEventListener('click', onSlotClick);
                    tubeEl.appendChild(slotEl);
                }
                rowEl.appendChild(tubeEl);
                tubeIndex++;
            }
            boardContainer.appendChild(rowEl);
        });

        populatePalette();
        setupContainer.classList.add('hidden');
        paletteContainer.classList.remove('hidden');
        statusMessage.textContent = 'Click slots and colors to build your puzzle';
    }

    // Create color palette
    function populatePalette() {
        colorPalette.innerHTML = '';
        COLOR_DATA.forEach(colorData => {
            const colorEl = document.createElement('div');
            colorEl.className = 'color-option';
            colorEl.style.backgroundColor = colorData.hex;
            colorEl.dataset.color = colorData.hex;
            colorEl.title = colorData.name; // Show color name on hover
            
            // Add border for colors that need it
            if (colorData.needsBorder) {
                colorEl.style.border = '3px solid #999';
            }
            
            colorEl.addEventListener('click', onColorClick);
            colorPalette.appendChild(colorEl);
        });
        
        const emptyEl = document.createElement('div');
        emptyEl.className = 'color-option';
        emptyEl.textContent = 'X';
        emptyEl.dataset.color = 'empty';
        emptyEl.style.lineHeight = '34px';
        emptyEl.style.border = '3px solid #666';
        emptyEl.style.fontSize = '20px';
        emptyEl.style.fontWeight = 'bold';
        emptyEl.addEventListener('click', onColorClick);
        colorPalette.appendChild(emptyEl);
    }

    // Handle slot clicks
    function onSlotClick(event) {
        if (activeSlot) activeSlot.classList.remove('selected');
        activeSlot = event.target;
        activeSlot.classList.add('selected');
        if (activeColor) applyColorToSlot();
    }

    // Handle color clicks
    function onColorClick(event) {
        if(activeColor) activeColor.classList.remove('active');
        activeColor = event.target;
        activeColor.classList.add('active');
        if (activeSlot) applyColorToSlot();
    }

    // Apply color to slot
    function applyColorToSlot() {
        if (!activeSlot || !activeColor) return;
        const color = activeColor.dataset.color;

        activeSlot.className = 'layer-slot';
        if (color !== 'empty') {
            activeSlot.classList.add('liquid-layer');
            activeSlot.style.backgroundColor = color;
            // Add border for colors that need it
            const colorData = COLOR_DATA.find(c => c.hex === color);
            if (colorData && colorData.needsBorder) {
                activeSlot.style.border = '2px solid #999';
            } else {
                activeSlot.style.border = 'none';
            }
        } else {
            activeSlot.style.backgroundColor = '';
            activeSlot.style.border = 'none';
        }

        activeSlot.classList.remove('selected');
        activeSlot = null;
    }

    // Finish setup and prepare for solving
    function finishSetup() {
        boardState = readBoardStateFromDOM();
        
        if (boardState.flat().length === 0) {
            statusMessage.textContent = 'Please add some colors first!';
            statusMessage.style.color = '#ff5252';
            return;
        }

        paletteContainer.classList.add('hidden');
        playControls.classList.remove('hidden');
        statusMessage.textContent = 'Puzzle ready! Click "Show Solution" to solve it step by step.';
        statusMessage.style.color = 'var(--primary-color)';
    }

    // Convert RGB to hex
    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb.toUpperCase();
        
        const result = rgb.match(/\d+/g);
        if (result && result.length >= 3) {
            return '#' + result.slice(0, 3).map(x => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('').toUpperCase();
        }
        return rgb;
    }

    // Read current board state from DOM
    function readBoardStateFromDOM() {
        const newBoardState = [];
        const tubes = boardContainer.querySelectorAll('.tube');
        tubes.forEach(tube => {
            const tubeData = [];
            const slots = tube.querySelectorAll('.layer-slot');
            slots.forEach(slot => {
                if(slot.classList.contains('liquid-layer')) {
                    const color = rgbToHex(slot.style.backgroundColor);
                    tubeData.push(color);
                }
            });
            newBoardState.push(tubeData);
        });
        console.log('Read board state:', newBoardState);
        return newBoardState;
    }

    // Show solution step by step
    function showSolution() {
        console.log('=== SHOW SOLUTION FUNCTION CALLED ===');
        console.log('Board state:', boardState);
        
        statusMessage.textContent = 'Solving...';
        statusMessage.style.color = 'var(--primary-color)';

        setTimeout(() => {
            console.log('Starting solver...');
            const solution = findSolution(JSON.parse(JSON.stringify(boardState)));
            console.log('Solution result:', solution);
            
            if (solution && solution.length > 0) {
                console.log('Solution found with', solution.length, 'moves');
                solutionMoves = solution;
                currentMoveIndex = 0;
                updateSolutionUI();
                solutionControls.classList.remove('hidden');
                statusMessage.textContent = `Solution found! ${solution.length} steps. Use Next/Previous buttons.`;
            } else {
                console.log('No solution found');
                statusMessage.textContent = 'No solution found or puzzle already solved.';
                statusMessage.style.color = '#ff5252';
            }
        }, 100);
    }

    // Simple BFS solver
    function findSolution(initialBoard) {
        console.log('Solver input board:', initialBoard);
        
        if (isSolved(initialBoard)) {
            console.log('Board already solved!');
            return [];
        }
        
        const queue = [{ board: initialBoard, moves: [] }];
        const visited = new Set();
        const getBoardCode = (board) => JSON.stringify(board);
        visited.add(getBoardCode(initialBoard));
        
        let iterations = 0;

        while (queue.length > 0 && iterations < 10000) {
            iterations++;
            const { board, moves } = queue.shift();
            if (moves.length > 15) continue; // Limit depth
            
            for (let from = 0; from < board.length; from++) {
                for (let to = 0; to < board.length; to++) {
                    if (from === to || !canMove(board, from, to)) continue;
                    
                    const newBoard = JSON.parse(JSON.stringify(board));
                    const colorsToMove = getMovableColors(newBoard, from);
                    
                    for (let i = 0; i < colorsToMove.length; i++) {
                        newBoard[to].push(newBoard[from].pop());
                    }
                    
                    if (isSolved(newBoard)) {
                        console.log('Solution found after', iterations, 'iterations');
                        return [...moves, { from, to, count: colorsToMove.length }];
                    }
                    
                    const boardCode = getBoardCode(newBoard);
                    if (!visited.has(boardCode)) {
                        visited.add(boardCode);
                        queue.push({ 
                            board: newBoard, 
                            moves: [...moves, { from, to, count: colorsToMove.length }] 
                        });
                    }
                }
            }
        }
        console.log('No solution found after', iterations, 'iterations');
        return null;
    }

    // Check if move is valid
    function canMove(board, from, to) {
        const fromTube = board[from];
        const toTube = board[to];
        if (fromTube.length === 0 || toTube.length === TUBE_CAPACITY) return false;
        
        const colorsToMove = getMovableColors(board, from);
        if (TUBE_CAPACITY - toTube.length < colorsToMove.length) return false;
        
        return toTube.length === 0 || fromTube[fromTube.length - 1] === toTube[toTube.length - 1];
    }

    // Get movable colors from top of tube
    function getMovableColors(board, fromIndex) {
        const fromTube = board[fromIndex];
        if (fromTube.length === 0) return [];
        
        const topColor = fromTube[fromTube.length - 1];
        const movable = [];
        for (let i = fromTube.length - 1; i >= 0; i--) {
            if (fromTube[i] === topColor) {
                movable.push(topColor);
            } else {
                break;
            }
        }
        return movable;
    }

    // Check if puzzle is solved
    function isSolved(board) {
        return board.every(tube => 
            tube.length === 0 || 
            (tube.length === TUBE_CAPACITY && new Set(tube).size === 1)
        );
    }

    // Navigate through solution steps
    async function navigateSolution(direction) {
        if (direction === 1 && currentMoveIndex < solutionMoves.length) {
            const move = solutionMoves[currentMoveIndex];
            await animateMove(move.from, move.to, move.count);
            currentMoveIndex++;
        } else if (direction === -1 && currentMoveIndex > 0) {
            currentMoveIndex--;
            const move = solutionMoves[currentMoveIndex];
            await animateMove(move.to, move.from, move.count);
        }
        updateSolutionUI();
    }

    // Update solution UI
    function updateSolutionUI() {
        moveCounter.textContent = `Step: ${currentMoveIndex} / ${solutionMoves.length}`;
        moveCountSpan.textContent = currentMoveIndex;
        prevBtn.disabled = currentMoveIndex === 0;
        nextBtn.disabled = currentMoveIndex === solutionMoves.length;
    }

    // Animate move with water pouring effect
    async function animateMove(fromIndex, toIndex, count) {
        const fromTubeEl = document.querySelector(`.tube[data-index='${fromIndex}']`);
        const toTubeEl = document.querySelector(`.tube[data-index='${toIndex}']`);

        // Tilt the source tube
        const tiltDirection = toIndex > fromIndex ? 'right' : 'left';
        fromTubeEl.style.transformOrigin = 'bottom center';
        fromTubeEl.style.transition = 'transform 0.3s ease-out';
        fromTubeEl.style.transform = `rotate(${tiltDirection === 'right' ? '25deg' : '-25deg'})`;

        await new Promise(resolve => setTimeout(resolve, 300));

        // Pour each layer
        for (let i = 0; i < count; i++) {
            await performWaterPourAnimation(fromTubeEl, toTubeEl);
        }

        // Return tube to normal
        fromTubeEl.style.transform = 'rotate(0deg)';
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Perform water pouring animation
    function performWaterPourAnimation(fromTube, toTube) {
        return new Promise(resolve => {
            const fromLayers = fromTube.querySelectorAll('.liquid-layer');
            const layerToMove = fromLayers[fromLayers.length - 1];
            if (!layerToMove) {
                resolve();
                return;
            }

            const color = layerToMove.style.backgroundColor;
            const border = layerToMove.style.border;

            // Create liquid stream element
            const liquidStream = document.createElement('div');
            liquidStream.className = 'liquid-stream';
            liquidStream.style.position = 'fixed';
            liquidStream.style.width = '8px';
            liquidStream.style.backgroundColor = color;
            liquidStream.style.borderRadius = '4px';
            liquidStream.style.zIndex = '1000';
            liquidStream.style.pointerEvents = 'none';
            document.body.appendChild(liquidStream);

            // Get positions
            const fromRect = layerToMove.getBoundingClientRect();
            const toLayers = toTube.querySelectorAll('.liquid-layer');
            const toSlots = toTube.querySelectorAll('.layer-slot');
            const targetSlot = toSlots[toLayers.length];
            const toRect = targetSlot ? targetSlot.getBoundingClientRect() : toTube.getBoundingClientRect();

            // Remove from source immediately
            layerToMove.className = 'layer-slot';
            layerToMove.style.backgroundColor = '';
            layerToMove.style.border = 'none';

            // Animate the liquid stream
            animateLiquidStream(liquidStream, fromRect, toRect, color).then(() => {
                // Add to destination
                if (targetSlot) {
                    targetSlot.className = 'layer-slot liquid-layer';
                    targetSlot.style.backgroundColor = color;
                    targetSlot.style.border = border;
                    
                    // Add splash effect
                    createSplashEffect(toRect, color);
                }

                // Remove stream element
                liquidStream.remove();
                resolve();
            });
        });
    }

    // Animate liquid stream with arc motion
    function animateLiquidStream(streamElement, startRect, endRect, color) {
        return new Promise(resolve => {
            const startX = startRect.left + startRect.width / 2;
            const startY = startRect.top + startRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;

            // Control point for arc (higher than both points)
            const controlX = (startX + endX) / 2;
            const controlY = Math.min(startY, endY) - 80;

            const duration = 600;
            const startTime = performance.now();

            function animateFrame(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Quadratic bezier curve
                const t = progress;
                const currentX = Math.pow(1-t, 2) * startX + 2*(1-t)*t * controlX + Math.pow(t, 2) * endX;
                const currentY = Math.pow(1-t, 2) * startY + 2*(1-t)*t * controlY + Math.pow(t, 2) * endY;

                // Dynamic height for streaming effect
                const streamHeight = 30 + Math.sin(progress * Math.PI) * 20;
                
                streamElement.style.left = (currentX - 4) + 'px';
                streamElement.style.top = currentY + 'px';
                streamElement.style.height = streamHeight + 'px';
                
                // Add slight wobble
                const wobble = Math.sin(elapsed * 0.01) * 2;
                streamElement.style.transform = `translateX(${wobble}px)`;

                if (progress < 1) {
                    requestAnimationFrame(animateFrame);
                } else {
                    resolve();
                }
            }

            requestAnimationFrame(animateFrame);
        });
    }

    // Create splash effect when liquid lands
    function createSplashEffect(rect, color) {
        const splash = document.createElement('div');
        splash.className = 'splash-effect';
        splash.style.position = 'fixed';
        splash.style.left = (rect.left + rect.width / 2 - 15) + 'px';
        splash.style.top = (rect.top - 5) + 'px';
        splash.style.width = '30px';
        splash.style.height = '10px';
        splash.style.backgroundColor = color;
        splash.style.borderRadius = '50%';
        splash.style.opacity = '0.8';
        splash.style.transform = 'scale(0.5)';
        splash.style.transition = 'all 0.2s ease-out';
        splash.style.zIndex = '999';
        splash.style.pointerEvents = 'none';
        document.body.appendChild(splash);

        // Animate splash
        setTimeout(() => {
            splash.style.transform = 'scale(1.5)';
            splash.style.opacity = '0';
        }, 50);

        // Remove splash
        setTimeout(() => {
            splash.remove();
        }, 250);
    }

    // Reset puzzle to original state
    function resetPuzzle() {
        currentMoveIndex = 0;
        solutionControls.classList.add('hidden');
        statusMessage.textContent = 'Puzzle reset. Click "Show Solution" to solve again.';
        // Restore original board state here if needed
    }

    // Create new puzzle
    function createNewPuzzle() {
        setupContainer.classList.remove('hidden');
        paletteContainer.classList.add('hidden');
        playControls.classList.add('hidden');
        solutionControls.classList.add('hidden');
        boardContainer.innerHTML = '';
        currentMoveIndex = 0;
        statusMessage.textContent = 'Create your puzzle';
        generateRowConfigs();
    }

    // Initialize
    statusMessage.textContent = 'Loading colors...';
    
    // Load colors first, then initialize
    await loadColors();
    
    statusMessage.textContent = 'Welcome! Set up your puzzle:';
    generateRowConfigs();
    
    // Make function globally accessible for testing
    window.testShowSolution = showSolution;
    window.testBoardState = () => console.log('Current board state:', boardState);
});