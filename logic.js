// Game data - will be populated from CSV
let gameData = {
    languages: [],
    todaysLanguage: null
};

let currentClueIndex = 0;
let guessCount = 1;
let gameEnded = false;

// Initialize game
async function initGame() {
    try {
        await loadGameData();
        populateLanguageSelect();
        setupEventListeners();
        showNextClue(); // Show first clue after data is loaded
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showError('Failed to load game data. Please refresh the page.');
    }
}

// for finding a random row in the case that today doesn't exist in the CSV
function fallbackRow(rows, today) {
    // Simple hash → 32-bit int
    let h = 0;
    for (let i = 0; i < today.length; i++)
        h = ((h << 5) - h + today.charCodeAt(i)) | 0; // bit-level hash

    // Map hash to 0 … rows.length-1
    const idx = Math.abs(h) % rows.length;
    return rows[idx];
}

// Load and parse CSV data
async function loadGameData() {
    try {
        const response = await fetch('game_data.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        // Parse CSV
        const rows = parseCSV(csvText);
        if (rows.length === 0) {
            throw new Error('No data found in CSV file');
        }
        
        // Get today's date in YYYY-MM-DD format
        const today = localISODate();

        // Find today's row
        const todaysRow = rows.find(row => row.date === today);
        if (!todaysRow) {
            console.warn(`No row for ${today}; falling back to a random entry.`);
            todaysRow = fallbackRow(rows, today);
        }
        
        // Set game data
        gameData = {
            // languages: uniqueLanguages,
            languages: ['Afrikaans', 'Albanian', 'Armenian', 'Bulgarian', 'Cantonese', 'Catalan', 'Chinese', 'Czech', 'Danish', 'Dutch', 'Esperanto', 'Estonian', 'Finnish', 'French', 'Georgian', 'German', 'Greek', 'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Irish', 'Italian', 'Latvian', 'Lithuanian', 'Macedonian', 'Malayalam', 'Nepali', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Slovak', 'Spanish', 'Swahili', 'Swedish', 'Tamil', 'Turkish', 'Vietnamese', 'Welsh'],
            todaysLanguage: todaysRow
        };
        
        console.log('Game data loaded successfully:', gameData);
        
    } catch (error) {
        console.error('Error loading CSV data:', error);
        throw error;
    }
}

// Get local date in YYYY-MM-DD format
function localISODate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Simple CSV parser
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    // Get headers
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            rows.push(row);
        }
    }
    
    return rows;
}

// Parse a single CSV line (handles quoted values with commas)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values.map(value => value.replace(/"/g, ''));
}

function showError(message) {
    const gameContainer = document.querySelector('.game-container');
    gameContainer.innerHTML = `
        <h1 class="game-title">Langr</h1>
        <div style="padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Retry
            </button>
        </div>
    `;
}

function populateLanguageSelect() {
    const select = document.getElementById('languageSelect');
    gameData.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        select.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('guessBtn').addEventListener('click', makeGuess);
    document.getElementById('languageSelect').addEventListener('change', function() {
        document.getElementById('guessBtn').disabled = !this.value;
    });
}

function makeGuess() {
    if (gameEnded) return;

    const selectedLanguage = document.getElementById('languageSelect').value;
    const incorrectMessage = document.getElementById('incorrectMessage');
    
    if (!selectedLanguage) return;

    if (selectedLanguage === gameData.todaysLanguage.language) {
        showCelebration();
        gameEnded = true;
    } else {
        // Show incorrect message
        incorrectMessage.textContent = `Incorrect! "${selectedLanguage}" is not the right answer.`;
        incorrectMessage.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(() => {
            incorrectMessage.style.display = 'none';
        }, 3000);

        // Show next clue
        showNextClue();
        guessCount++;
        document.getElementById('guessCount').textContent = guessCount;
    }

    // Reset selection
    document.getElementById('languageSelect').value = '';
    document.getElementById('guessBtn').disabled = true;
}

function showNextClue() {
    const cluesSection = document.getElementById('cluesSection');
    const clues = [
        {
            type: 'audio',
            header: '🔊 Audio Clue',
            content: createAudioClue()
        },
        {
            type: 'transcription',
            header: '👂 Phonetic Transcription',
            content: `<div class="text-content">${gameData.todaysLanguage.IPA}</div>`
        },
        {
            type: 'translation',
            header: '🔤 English Translation',
            content: `<div class="text-content">${gameData.todaysLanguage.translation}</div>`
        },
        {
            type: 'family',
            header: '🌳 Language Family',
            content: createFamilyClue()
        },
        {
            type: 'text',
            header: '📝 Original Text',
            content: `<div class="text-content">${gameData.todaysLanguage.sentence}</div>`
        }
    ];

    if (currentClueIndex < clues.length) {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'clue';
        clueDiv.innerHTML = `
            <div class="clue-header">${clues[currentClueIndex].header}</div>
            ${clues[currentClueIndex].content}
        `;
        cluesSection.appendChild(clueDiv);
        currentClueIndex++;
    }
}

function createAudioClue() {
    // Get today's date in YYYY-MM-DD format
    const today = localISODate();

    console.log('Today is:', today);
    console.log('Audio file for today:', gameData.todaysLanguage.wave);

    // Get audio file
    const audioId = "audio-clue-" + today; 
    const srcPath = `assets/audio/${gameData.todaysLanguage.wave}`;

    return `
        <div class="audio-player">
            <audio id="${audioId}" src="${srcPath}"></audio>

            <button class="play-btn" onclick="togglePlay('${audioId}', this)">
                ▶
            </button>

            <div class="audio-info">
                <div>Audio sample</div>
                <div>Sample rate: ${gameData.todaysLanguage.sampling_rate} Hz</div>
            </div>
        </div>
    `;
}

function togglePlay(audioId, btn) {
    const player = document.getElementById(audioId);

    if (player.paused) {
        // ensure we always start from the beginning when replaying
        player.currentTime = 0;
        player.play();
        btn.textContent = "⏸";
        player.onended = () => (btn.textContent = "▶");
    } else {
        player.pause();
        btn.textContent = "▶";
    }
}

function createFamilyClue() {
    const families = [
        gameData.todaysLanguage.family_0,
        gameData.todaysLanguage.family_1,
        gameData.todaysLanguage.family_2
    ].filter(f => f && f.trim() !== '');
    
    return `<div class="text-content">${families.join(' → ')}</div>`;
}

function playAudio() {
    // Play the actual audio file
    const playBtn = event.target;
    const audioFile = gameData.todaysLanguage.wave;
    
    if (audioFile && audioFile.trim() !== '') {
        try {
            const audio = new Audio(audioFile);
            
            // Update button to show playing state
            playBtn.innerHTML = '⏸';
            playBtn.style.background = '#e74c3c';
            
            // Play audio
            audio.play().catch(error => {
                console.error('Error playing audio:', error);
                alert('Could not play audio file. Make sure the file exists and is accessible.');
            });
            
            // Reset button when audio ends
            audio.addEventListener('ended', () => {
                playBtn.innerHTML = '▶';
                playBtn.style.background = '#27ae60';
            });
            
            // Reset button after 30 seconds max (in case audio doesn't fire 'ended' event)
            setTimeout(() => {
                playBtn.innerHTML = '▶';
                playBtn.style.background = '#27ae60';
            }, 30000);
            
        } catch (error) {
            console.error('Error creating audio element:', error);
            alert('Could not load audio file.');
            playBtn.innerHTML = '▶';
            playBtn.style.background = '#27ae60';
        }
    } else {
        alert('No audio file specified for today\'s language.');
    }
}

function showCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    celebration.innerHTML = `
        <div class="celebration-content">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">🎉 Congratulations! 🎉</h2>
            <p style="font-size: 18px; margin-bottom: 10px;">You guessed it correctly!</p>
            <p style="font-size: 24px; font-weight: 600; color: #3498db;">The language was ${gameData.todaysLanguage.language}!</p>
            <p style="margin-top: 20px; color: #666;">You solved it in ${guessCount} guess${guessCount > 1 ? 'es' : ''}!</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Play Again</button>
        </div>
    `;
    
    // Add confetti
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6'][Math.floor(Math.random() * 5)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        celebration.appendChild(confetti);
    }
    
    document.body.appendChild(celebration);
}

// Start the game
initGame(); // This will now load CSV data first, then show the first clue

// Instructions modal functions
function showInstructions() {
    document.getElementById('instructionsModal').classList.add('active');
}

function hideInstructions() {
    document.getElementById('instructionsModal').classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('instructionsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideInstructions();
    }
});