// Game data - will be populated from CSV
let gameData = {
    languages: [],
    todaysLanguage: null,
    allRows: [] // Store all CSV data for date exploration
};

let currentClueIndex = 0;
let guessCount = 1;
let gameEnded = false;
let previousGuesses = [];
let currentDate = null; // Track current game date
let isExploringPastDate = false;

document.getElementById('guessBtn').disabled = true;

// Initialize game
async function initGame() {
    try {
        await loadGameData();
        populateLanguageSelect();
        setupEventListeners();
        showNextClue(); // Show first clue after data is loaded
        updatePreviousGuessesDisplay(); // Initialize empty display
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showError('Failed to load game data. Please refresh the page.');
    }
}

// For finding a random row in the case that today doesn't exist in the CSV
function fallbackRow(rows, today) {
    // Hash -> 32-bit int
    let h = 0;
    for (let i = 0; i < today.length; i++)
        h = ((h << 5) - h + today.charCodeAt(i)) | 0; // bit-level hash
    // Map hash to be an index
    return rows[Math.abs(h) % rows.length];
}

// Load and parse CSV data
async function loadGameData(targetDate = null) {
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
        
        // Store all rows for date exploration
        gameData.allRows = rows;
        
        // Get target date (either specified or today)
        const gameDate = targetDate || localISODate();
        currentDate = gameDate;
        isExploringPastDate = targetDate !== null && targetDate !== localISODate();

        // Find the row for the target date
        let targetRow = rows.find(row => row.date === gameDate);
        if (!targetRow) {
            console.warn(`No row for ${gameDate}; falling back to a random entry.`);
            targetRow = fallbackRow(rows, gameDate);
        }
        
        // Set game data
        gameData = {
            ...gameData, // Keep allRows and other existing data
            languages: ['Abkhaz', 'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Assamese', 'Asturian', 'Azerbaijani', 'Basaa', 'Bashkir', 'Basque', 'Belarusian', 'Bengali', 'Breton', 'Bulgarian', 'Cantonese', 'Catalan', 'Central Kurdish', 'Chuvash', 'Czech', 'Danish', 'Dhivehi', 'Dioula', 'Dutch', 'Erzya', 'Esperanto', 'Estonian', 'Finnish', 'French', 'Frisian', 'Galician', 'Georgian', 'German', 'Greek', 'Guarani', 'Hakha Chin', 'Hausa', 'Hebrew', 'Hill Mari', 'Hindi', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Interlingua', 'Irish', 'Italian', 'Japanese', 'Kabyle', 'Kazakh', 'Kinyarwanda', 'Korean', 'Kurmanji Kurdish', 'Kyrgyz', 'Lao', 'Latvian', 'Lithuanian', 'Luganda', 'Macedonian', 'Malayalam', 'Maltese', 'Mandarin', 'Marathi', 'Meadow Mari', 'Moksha', 'Mongolian', 'Nepali', 'Norwegian Nynorsk', 'Occitan', 'Odia', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Quechua Chanka', 'Romanian', 'Russian', 'Sakha', 'Santali', 'Saraiki', 'Sardinian', 'Serbian', 'Slovak', 'Slovenian', 'Sorbian', 'Spanish', 'Swahili', 'Swedish', 'Taiwanese', 'Tamazight', 'Tamil', 'Tatar', 'Thai', 'Tigre', 'Tigrinya', 'Toki Pona', 'Turkish', 'Turkmen', 'Twi', 'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek', 'Vietnamese', 'Votic', 'Welsh', 'Yoruba'],
            todaysLanguage: targetRow,
            allRows: rows
        };
        
        console.log('Game data loaded successfully:', gameData);
        updateDateDisplay();
        setupDatePickerRestrictions();
        
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
    // Clear existing options except the default one
    select.innerHTML = '<option value="">Select a language...</option>';
    
    gameData.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        
        // Disable if already guessed
        if (previousGuesses.includes(lang)) {
            option.disabled = true;
            option.textContent += ' (already guessed)';
        }
        
        select.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('guessBtn').addEventListener('click', makeGuess);
    document.getElementById('giveUpBtn').addEventListener('click', giveUp);
    document.getElementById('languageSelect').addEventListener('change', function() {
        document.getElementById('guessBtn').disabled = !this.value;
    });

    // Updated date picker event listener
    document.getElementById('dateSelect').addEventListener('change', function() {
        const selectedDate = this.value;
        if (selectedDate && validateDateSelection(selectedDate)) {
            loadGameForDate(selectedDate);
        } else if (selectedDate) {
            this.value = '';
        }
    });

    document.addEventListener('click', function(e) {
        const playBtn = e.target.closest('.play-btn');
        if (playBtn) {
            const audioId = playBtn.getAttribute('data-audio-id');
            if (audioId) {
                togglePlay(audioId, playBtn);
            }
        }
    });
}

function makeGuess() {
    if (gameEnded) return;

    const selectedLanguage = document.getElementById('languageSelect').value;
    const incorrectMessage = document.getElementById('incorrectMessage');
    
    if (!selectedLanguage) return;

    if(previousGuesses.includes(selectedLanguage)) {
        incorrectMessage.textContent = `You already guessed "${selectedLanguage}". Try a different language!`;
        incorrectMessage.style.display = 'block';
        setTimeout(() => {
            incorrectMessage.style.display = 'none';
        }, 5000);
        return;
    }
    
    if (selectedLanguage === gameData.todaysLanguage.language) {
        previousGuesses.push(selectedLanguage);
        updatePreviousGuessesDisplay();
        showCelebration();
        gameEnded = true;
    } else {
        // Add to previous guesses
        previousGuesses.push(selectedLanguage);
        updatePreviousGuessesDisplay();
        populateLanguageSelect(); // Refresh dropdown to disable guessed language

        if( guessCount >= 6) {
            showSadCelebration();
            gameEnded = true;
            return;
        }
        // Show incorrect message
        incorrectMessage.textContent = `Incorrect! "${selectedLanguage}" is not the right answer.`;
        incorrectMessage.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(() => {
            incorrectMessage.style.display = 'none';
        }, 5000);

        // Show next clue
        showNextClue();
        guessCount++;
        document.getElementById('guessCount').textContent = guessCount;
    }

    // Reset selection
    document.getElementById('languageSelect').value = '';
    document.getElementById('guessBtn').disabled = true;
}

function giveUp() {
    if (gameEnded) return;
    document.getElementById('languageSelect').value = '';
    document.getElementById('guessBtn').disabled = true;
    showSadCelebration();
    gameEnded = true
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
    console.log('Current date:', currentDate);
    console.log('Audio file for current date:', gameData.todaysLanguage.wave);

    // Get audio file
    const audioId = "audio-clue-" + currentDate;
    const srcPath = `assets/audio/${gameData.todaysLanguage.wave}`;

    return `
        <div class="audio-player">
            <audio id="${audioId}" src="${srcPath}"></audio>

            <button class="play-btn" data-audio-id="${audioId}">
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

    // Prevent multiple rapid clicks
    if (btn.disabled) return;

    if (player.paused) {
        // Disable button temporarily to prevent rapid clicks
        btn.disabled = true;

        // ensure we always start from the beginning when replaying
        player.currentTime = 0;

        player.play().then(() => {
            btn.textContent = "⏸";
            btn.disabled = false;
        }).catch(error => {
            console.error('Error playing audio:', error);
            btn.disabled = false;
        });

        player.onended = () => {
            btn.textContent = "▶";
            btn.disabled = false;
        };
    } else {
        player.pause();
        btn.textContent = "▶";
    }
}

function createFamilyClue() {
    const families = [
        gameData.todaysLanguage.family_0,
        gameData.todaysLanguage.family_1
    ].filter(f => f && f.trim() !== '');
    
    return `<div class="text-content">${families.join(' → ')}</div>`;
}

function updatePreviousGuessesDisplay() {
    const guessesDisplay = document.getElementById('previousGuessesDisplay');
    if (previousGuesses.length === 0) {
        guessesDisplay.innerHTML = '<div class="previous-guesses-label">Previous guesses:</div><div class="previous-guesses-content">None yet</div>';
    } else {
        guessesDisplay.innerHTML = `
            <div class="previous-guesses-label">Previous guesses:</div>
            <div class="previous-guesses-content">${previousGuesses.join(' → ')}</div>
        `;
    }
}

function setupDatePickerRestrictions() {
    const dateInput = document.getElementById('dateSelect');
    const availableDates = getAvailableDates();
    
    if (availableDates.length > 0) {
        dateInput.min = availableDates[0];
        dateInput.max = availableDates[availableDates.length - 1];
    }
}

function getAvailableDates() {
    const today = localISODate();
    return gameData.allRows
        .map(row => row.date)
        .filter(date => date <= today)
        .sort();
}

function validateDateSelection(selectedDate) {
    const availableDates = getAvailableDates();
    
    if (!availableDates.includes(selectedDate)) {
        alert('No game data available for this date. Please select a different date.');
        return false;
    }
    
    return true;
}

function loadGameForDate(targetDate) {
    // Reset game state
    currentClueIndex = 0;
    guessCount = 1;
    gameEnded = false;
    previousGuesses = [];
    
    // Clear previous game display
    document.getElementById('cluesSection').innerHTML = '';
    document.getElementById('incorrectMessage').style.display = 'none';
    document.getElementById('guessCount').textContent = guessCount;
    document.getElementById('languageSelect').value = '';
    document.getElementById('guessBtn').disabled = true;
    
    // Remove any existing celebration overlay
    const existingCelebration = document.querySelector('.celebration');
    if (existingCelebration) {
        existingCelebration.remove();
    }
    
    // Load new game data
    loadGameData(targetDate).then(() => {
        populateLanguageSelect();
        showNextClue();
        updatePreviousGuessesDisplay();
    }).catch(error => {
        console.error('Error loading game for date:', error);
        showError('Failed to load game data for selected date.');
    });
}

function updateDateDisplay() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    const today = localISODate();
    
    const dateObj = new Date(currentDate + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString();
    
    if (currentDate === today) {
        dateDisplay.textContent = `Today (${formattedDate})`;
        dateDisplay.className = 'current-date-display today';
    } else {
        dateDisplay.textContent = formattedDate;
        dateDisplay.className = 'current-date-display past-date';
    }
}

function getGameDateText() {
    const today = localISODate();
    if (currentDate === today) {
        return "today's";
    } else {
        const dateObj = new Date(currentDate + 'T00:00:00');
        return dateObj.toLocaleDateString('en-US'); // MM/DD/YYYY format
    }
}

function showCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    const gameDate = getGameDateText();
    const isToday = currentDate === localISODate();
    
    const shareText = isToday 
        ? `🎉 I just guessed today's language correctly on Langr in ${guessCount} guess${guessCount == 1? '' : 'es'}!`
        : `🎉 I just guessed the ${gameDate} language correctly on Langr in ${guessCount} guess${guessCount == 1? '' : 'es'}!`;
    
    const modalText = isToday 
        ? `You solved today's Langr in <strong>${guessCount} guess${guessCount == 1? '' : 'es'}</strong>!`
        : `You solved Langr for ${gameDate} in <strong>${guessCount} guess${guessCount == 1? '' : 'es'}</strong>!`;
    
    const shareUrl = 'https://raymondtana.github.io/projects/pages/Langr.html';
    
    celebration.innerHTML = `
        <div class="celebration-content">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">🎉 Congratulations! 🎉</h2>
            <p style="font-size: 18px; margin-bottom: 10px;">You guessed it correctly!</p>
            <p style="font-size: 24px; font-weight: 600; color: #3498db;">The language was ${gameData.todaysLanguage.language}!</p>
            <p style="margin-top: 20px; color: #666;">${modalText}</p>
            <p style="margin-top: 20px; color: #666;">Your previous guess${previousGuesses.length == 1? '' : 'es'}:<br>${previousGuesses.join(' → ')}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Play Again</button>
            <div class="share-section">
                <div class="share-title">Share your victory!</div>
                <div class="share-buttons">
                    <button class="share-btn share-twitter" data-share="twitter">
                        🐦 Twitter
                    </button>
                    <button class="share-btn share-facebook" data-share="facebook">
                        📘 Facebook
                    </button>
                    <button class="share-btn share-linkedin" data-share="linkedin">
                        💼 LinkedIn
                    </button>
                    <button class="share-btn share-reddit" data-share="reddit">
                        🔴 Reddit
                    </button>
                    <button class="share-btn share-copy" data-share="copy">
                        📋 Copy
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to share buttons
    const shareButtons = celebration.querySelectorAll('[data-share]');
    shareButtons.forEach(button => {
        button.addEventListener('click', function() {
            const shareType = this.getAttribute('data-share');
            switch(shareType) {
                case 'twitter':
                    shareToTwitter(encodeURIComponent(shareText), encodeURIComponent(shareUrl));
                    break;
                case 'facebook':
                    shareToFacebook(encodeURIComponent(shareUrl), encodeURIComponent(shareText));
                    break;
                case 'linkedin':
                    shareToLinkedIn(encodeURIComponent(shareUrl), encodeURIComponent(shareText));
                    break;
                case 'reddit':
                    shareToReddit(encodeURIComponent(shareUrl), encodeURIComponent(shareText));
                    break;
                case 'copy':
                    copyToClipboard(shareText + ' ' + shareUrl, this);
                    break;
            }
        });
    });
    
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

function showSadCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    const gameDate = getGameDateText();
    const isToday = currentDate === localISODate();
    
    const shareText = isToday 
        ? "😭 I couldn't figure out today's language on Langr"
        : `😭 I couldn't figure out the ${gameDate} language on Langr`;
    
    const modalText = isToday 
        ? "You'll get today's language next time!"
        : "We can only go up from here!";
    
    const shareUrl = 'https://raymondtana.github.io/projects/pages/Langr.html';
    
    celebration.innerHTML = `
        <div class="celebration-content">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">😭 Better luck next time 😭</h2>
            <p style="font-size: 18px; margin-bottom: 10px;">${modalText}</p>
            <p style="font-size: 24px; font-weight: 600; color: #3498db;">The language was ${gameData.todaysLanguage.language}.</p>
            <p style="margin-top: 20px; color: #666;">Your previous guess${previousGuesses.length == 1? '' : 'es'}:<br>${previousGuesses.length > 0 ? previousGuesses.join(' → ') : 'none'}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Play Again</button>
            <div class="share-section">
                <div class="share-title">Share your attempt!</div>
                <div class="share-buttons">
                    <button class="share-btn share-twitter" data-share="twitter">
                        🐦 Twitter
                    </button>
                    <button class="share-btn share-facebook" data-share="facebook">
                        📘 Facebook
                    </button>
                    <button class="share-btn share-linkedin" data-share="linkedin">
                        💼 LinkedIn
                    </button>
                    <button class="share-btn share-reddit" data-share="reddit">
                        🔴 Reddit
                    </button>
                    <button class="share-btn share-copy" data-share="copy">
                        📋 Copy
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to share buttons
    const shareButtons = celebration.querySelectorAll('[data-share]');
    shareButtons.forEach(button => {
        button.addEventListener('click', function() {
            const shareType = this.getAttribute('data-share');
            switch(shareType) {
                case 'twitter':
                    shareToTwitter(encodeURIComponent(shareText), encodeURIComponent(shareUrl));
                    break;
                case 'facebook':
                    shareToFacebook(encodeURIComponent(shareUrl), encodeURIComponent(shareText));
                    break;
                case 'linkedin':
                    shareToLinkedIn(encodeURIComponent(shareUrl), encodeURIComponent(shareText));
                    break;
                case 'reddit':
                    shareToReddit(encodeURIComponent(shareUrl), encodeURIComponent(shareText));
                    break;
                case 'copy':
                    copyToClipboard(shareText + ' ' + shareUrl, this);
                    break;
            }
        });
    });
    
    document.body.appendChild(celebration);
}

// Sharing functions
function shareToTwitter(text, url) {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
}

function shareToFacebook(url, text) {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
}

function shareToLinkedIn(url, text) {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
}

function shareToReddit(url, text) {
    const redditUrl = `https://reddit.com/submit?url=${url}&title=${text}`;
    window.open(redditUrl, '_blank', 'width=600,height=400');
}

async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        button.innerHTML = '✅ Copied!';
        setTimeout(() => {
            button.innerHTML = '📋 Copy';
        }, 2000);
    }
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