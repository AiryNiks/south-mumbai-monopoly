/**
 * South Mumbai Monopoly Game - Client Side Logic
 * Handles UI interactions, game state, and real-time board updates
 */

// ==================== GAME STATE ====================
const gameState = {
    players: [],
    currentPlayerIdx: 0,
    boardData: null,
    turn: 1,
    gameActive: false,
    lastDiceRoll: { die1: 0, die2: 0 },
    selectedProperty: null,
    gameLog: []
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    loadBoardData();
    setupEventListeners();
    renderBoard();
});

function initializeGame() {
    // Initialize players
    gameState.players = [
        { name: 'Player 1', cash: 1500, position: 0, properties: [], status: 'active' },
        { name: 'Player 2', cash: 1500, position: 0, properties: [], status: 'active' },
        { name: 'Player 3', cash: 1500, position: 0, properties: [], status: 'active' },
        { name: 'Player 4', cash: 1500, position: 0, properties: [], status: 'active' }
    ];
    
    gameState.gameActive = true;
    updatePlayersList();
    updateGameStatus();
}

function loadBoardData() {
    // In a real implementation, fetch from board_layout.json
    gameState.boardData = generateBoardData();
}

function generateBoardData() {
    // Generate board data based on board_layout.json structure
    const board = [];
    const cornerSpaces = [
        { position: 0, name: 'Go', type: 'corner', color: null },
        { position: 10, name: 'Go to Jail', type: 'go_to_jail', color: null },
        { position: 20, name: 'Free Parking', type: 'free_parking', color: null },
        { position: 30, name: 'Go to Jail', type: 'go_to_jail', color: null }
    ];
    
    const properties = [
        // Brown
        { position: 1, name: 'Colaba Causeway Road', type: 'property', color: 'brown', price: 60 },
        { position: 3, name: 'Mandai Road', type: 'property', color: 'brown', price: 60 },
        
        // Light Blue
        { position: 6, name: 'Flora Fountain', type: 'property', color: 'light-blue', price: 100 },
        { position: 8, name: 'Horniman Circle', type: 'property', color: 'light-blue', price: 100 },
        { position: 9, name: 'Apollo Bunder', type: 'property', color: 'light-blue', price: 120 },
        
        // Pink
        { position: 11, name: 'Grant Road', type: 'property', color: 'pink', price: 140 },
        { position: 13, name: 'Esplanade', type: 'property', color: 'pink', price: 140 },
        { position: 14, name: 'Fort Street', type: 'property', color: 'pink', price: 160 },
        
        // Orange
        { position: 16, name: 'Strand Road', type: 'property', color: 'orange', price: 180 },
        { position: 18, name: 'Ballard Pier', type: 'property', color: 'orange', price: 180 },
        { position: 19, name: 'Princess Street', type: 'property', color: 'orange', price: 200 },
        
        // Red
        { position: 21, name: 'Kala Ghoda', type: 'property', color: 'red', price: 220 },
        { position: 23, name: 'Ramspart Row', type: 'property', color: 'red', price: 220 },
        { position: 24, name: 'Meadows Street', type: 'property', color: 'red', price: 240 },
        
        // Yellow
        { position: 26, name: 'Frere Road', type: 'property', color: 'yellow', price: 260 },
        { position: 27, name: 'Elphinstone Road', type: 'property', color: 'yellow', price: 260 },
        { position: 29, name: 'Thackersey Road', type: 'property', color: 'yellow', price: 280 },
        
        // Green
        { position: 31, name: 'Mayo Road', type: 'property', color: 'green', price: 300 },
        { position: 33, name: 'Bentinck Road', type: 'property', color: 'green', price: 300 },
        { position: 34, name: 'Lansdowne Road', type: 'property', color: 'green', price: 320 },
        
        // Dark Blue
        { position: 37, name: 'Oval Maidan', type: 'property', color: 'dark-blue', price: 350 },
        { position: 39, name: 'The Esplanade', type: 'property', color: 'dark-blue', price: 400 }
    ];
    
    const railways = [
        { position: 5, name: 'Central Railway Station', type: 'railway', price: 200 },
        { position: 15, name: 'Fort Railway Station', type: 'railway', price: 200 },
        { position: 25, name: 'Churchgate Railway Station', type: 'railway', price: 200 },
        { position: 35, name: 'Grant Road Railway Station', type: 'railway', price: 200 }
    ];
    
    const utilities = [
        { position: 12, name: 'Fort Port Authority', type: 'utility', price: 150 },
        { position: 28, name: 'Grant Road Municipality', type: 'utility', price: 150 }
    ];
    
    const specialSpaces = [
        { position: 2, name: 'Community Chest', type: 'community_chest' },
        { position: 4, name: 'Income Tax', type: 'tax' },
        { position: 7, name: 'Chance', type: 'chance' },
        { position: 17, name: 'Community Chest', type: 'community_chest' },
        { position: 22, name: 'Chance', type: 'chance' },
        { position: 36, name: 'Chance', type: 'chance' },
        { position: 38, name: 'Luxury Tax', type: 'tax' }
    ];
    
    for (let i = 0; i < 40; i++) {
        const corner = cornerSpaces.find(s => s.position === i);
        const property = properties.find(s => s.position === i);
        const railway = railways.find(s => s.position === i);
        const utility = utilities.find(s => s.position === i);
        const special = specialSpaces.find(s => s.position === i);
        
        if (corner) board.push(corner);
        else if (property) board.push(property);
        else if (railway) board.push(railway);
        else if (utility) board.push(utility);
        else if (special) board.push(special);
    }
    
    return board;
}

// ==================== RENDER FUNCTIONS ====================
function renderBoard() {
    const boardElement = document.getElementById('gameBoard');
    boardElement.innerHTML = '';
    
    // Create board with 10x10 grid but only 40 spaces
    for (let i = 0; i < 40; i++) {
        const spaceData = gameState.boardData[i];
        const spaceElement = createSpaceElement(spaceData);
        boardElement.appendChild(spaceElement);
    }
}

function createSpaceElement(spaceData) {
    const space = document.createElement('div');
    space.className = `space ${spaceData.type}`;
    
    if (spaceData.color) {
        space.classList.add(spaceData.color);
    }
    
    // Add space name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'space-name';
    nameDiv.textContent = spaceData.name.substring(0, 12);
    space.appendChild(nameDiv);
    
    // Add price if applicable
    if (spaceData.price) {
        const priceDiv = document.createElement('div');
        priceDiv.className = 'space-price';
        priceDiv.textContent = `${spaceData.price} MR`;
        space.appendChild(priceDiv);
    }
    
    // Add player tokens
    const playersHere = gameState.players.filter(p => p.position === spaceData.position);
    playersHere.forEach((player, idx) => {
        const token = document.createElement('div');
        token.className = 'player-token';
        token.style.backgroundColor = getPlayerColor(gameState.players.indexOf(player));
        token.title = player.name;
        space.appendChild(token);
    });
    
    space.addEventListener('click', () => {
        gameState.selectedProperty = spaceData;
        showPropertyDetails(spaceData);
    });
    
    return space;
}

function getPlayerColor(playerIdx) {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
    return colors[playerIdx] || '#95a5a6';
}

function updatePlayersList() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    gameState.players.forEach((player, idx) => {
        const item = document.createElement('div');
        item.className = 'player-item';
        if (idx === gameState.currentPlayerIdx) item.classList.add('current');
        if (player.status === 'bankrupt') item.classList.add('bankrupt');
        
        item.style.borderLeftColor = getPlayerColor(idx);
        item.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-cash">${player.cash} MR</span>
        `;
        playersList.appendChild(item);
    });
}

function updateGameStatus() {
    const currentPlayer = gameState.players[gameState.currentPlayerIdx];
    document.getElementById('playerName').textContent = currentPlayer.name;
    document.getElementById('playerCash').textContent = currentPlayer.cash;
    document.getElementById('playerPosition').textContent = gameState.boardData[currentPlayer.position].name;
    document.getElementById('playerProperties').textContent = currentPlayer.properties.length;
    document.getElementById('turnValue').textContent = gameState.turn;
}

// ==================== GAME ACTIONS ====================
function rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    
    gameState.lastDiceRoll = { die1, die2 };
    
    // Update dice display
    document.getElementById('die1').textContent = die1;
    document.getElementById('die2').textContent = die2;
    
    // Move player
    const currentPlayer = gameState.players[gameState.currentPlayerIdx];
    movePlayer(currentPlayer, die1 + die2);
    
    // Take space action
    setTimeout(() => {
        takeSpaceAction(currentPlayer);
        renderBoard();
    }, 500);
    
    logAction(`${currentPlayer.name} rolled (${die1}, ${die2})`);
}

function movePlayer(player, spaces) {
    const oldPosition = player.position;
    player.position = (player.position + spaces) % 40;
    
    // Check if passed Go
    if (player.position < oldPosition) {
        player.cash += 200;
        logAction(`${player.name} passed Go! Collected 200 MR`);
    }
}

function takeSpaceAction(player) {
    const space = gameState.boardData[player.position];
    
    switch (space.type) {
        case 'corner':
            if (space.position === 0) {
                // Go - already handled
            }
            break;
        case 'go_to_jail':
            player.position = 10;
            logAction(`${player.name} sent to Jail!`);
            break;
        case 'free_parking':
            logAction(`${player.name} is resting at Free Parking`);
            break;
        case 'tax':
            const tax = space.position === 4 ? 200 : 100;
            player.cash -= tax;
            logAction(`${player.name} paid ${tax} MR tax`);
            break;
        case 'chance':
            drawChanceCard(player);
            break;
        case 'community_chest':
            drawCommunityCard(player);
            break;
        case 'property':
        case 'railway':
        case 'utility':
            handlePropertyLanding(player, space);
            break;
    }
}

function handlePropertyLanding(player, space) {
    // Check if player owns it
    const isOwned = player.properties.includes(space.position);
    
    if (!isOwned) {
        logAction(`${player.name} landed on ${space.name}. Price: ${space.price} MR`);
        showBuyPropertyDialog(space);
    } else {
        logAction(`${player.name} landed on their own property`);
    }
}

function drawChanceCard(player) {
    logAction(`${player.name} drew a Chance card!`);
    showChanceCard();
}

function drawCommunityCard(player) {
    logAction(`${player.name} drew a Community Chest card!`);
    showCommunityCard();
}

function endTurn() {
    gameState.currentPlayerIdx = (gameState.currentPlayerIdx + 1) % gameState.players.length;
    gameState.turn++;
    gameState.lastDiceRoll = { die1: 0, die2: 0 };
    
    // Reset dice display
    document.getElementById('die1').textContent = '-';
    document.getElementById('die2').textContent = '-';
    
    updateGameStatus();
    updatePlayersList();
    logAction(`Turn ${gameState.turn}: ${gameState.players[gameState.currentPlayerIdx].name}'s turn`);
}

// ==================== DIALOG FUNCTIONS ====================
function showPropertyDetails(space) {
    const modal = document.getElementById('propertyModal');
    const title = document.getElementById('propertyTitle');
    const details = document.getElementById('propertyDetails');
    
    title.textContent = space.name;
    
    let detailsHTML = '';
    if (space.price) {
        detailsHTML += `<div><span class="label">Price:</span><span class="value">${space.price} MR</span></div>`;
    }
    
    detailsHTML += `<div><span class="label">Type:</span><span class="value">${space.type}</span></div>`;
    
    if (space.color) {
        detailsHTML += `<div><span class="label">Color:</span><span class="value">${space.color}</span></div>`;
    }
    
    details.innerHTML = detailsHTML;
    modal.classList.add('show');
}

function showBuyPropertyDialog(space) {
    const modal = document.getElementById('propertyModal');
    const buyBtn = document.getElementById('buyModalBtn');
    
    showPropertyDetails(space);
    
    buyBtn.onclick = () => {
        const player = gameState.players[gameState.currentPlayerIdx];
        if (player.cash >= space.price) {
            player.cash -= space.price;
            player.properties.push(space.position);
            logAction(`${player.name} bought ${space.name} for ${space.price} MR`);
            modal.classList.remove('show');
            renderBoard();
            updateGameStatus();
        } else {
            alert('Insufficient funds!');
        }
    };
}

function showChanceCard() {
    const cardContent = "You won a prize! Collect 50 MR";
    const modal = document.getElementById('cardModal');
    const message = document.getElementById('cardMessage');
    
    message.textContent = cardContent;
    modal.classList.add('show');
}

function showCommunityCard() {
    const cardContent = "Bank error in your favor! Collect 200 MR";
    const modal = document.getElementById('cardModal');
    const message = document.getElementById('cardMessage');
    
    message.textContent = cardContent;
    modal.classList.add('show');
}

// ==================== UTILITY FUNCTIONS ====================
function logAction(action) {
    gameState.gameLog.push(action);
    const logElement = document.getElementById('gameLog');
    
    const logEntry = document.createElement('p');
    logEntry.className = 'log-entry';
    logEntry.textContent = action;
    logElement.appendChild(logEntry);
    
    // Keep only last 20 entries
    if (gameState.gameLog.length > 20) {
        gameState.gameLog.shift();
        logElement.removeChild(logElement.firstChild);
    }
    
    logElement.scrollTop = logElement.scrollHeight;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    document.getElementById('rollDiceBtn').addEventListener('click', rollDice);
    document.getElementById('endTurnBtn').addEventListener('click', endTurn);
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('propertyModal').classList.remove('show');
    });
    document.getElementById('acknowledgeCardBtn').addEventListener('click', () => {
        document.getElementById('cardModal').classList.remove('show');
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const propertyModal = document.getElementById('propertyModal');
        const cardModal = document.getElementById('cardModal');
        
        if (e.target === propertyModal) propertyModal.classList.remove('show');
        if (e.target === cardModal) cardModal.classList.remove('show');
    });
}
