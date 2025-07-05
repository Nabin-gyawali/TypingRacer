// scripts/solo.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element References ---
    const setupScreen = document.getElementById('setup-screen');
    const typingScreen = document.getElementById('typing-screen');
    const resultsScreen = document.getElementById('results-screen');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const paragraphDisplay = document.getElementById('paragraph-display');
    const timeSelect = document.getElementById('time-select');
    const startBtn = document.getElementById('start-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const countdownTimer = document.getElementById('countdown-timer');
    const timeDisplay = document.getElementById('time-display');
    const wpmDisplay = document.getElementById('wpm-display');
    const lastWpmDisplay = document.getElementById('last-wpm');
    const bestWpmDisplay = document.getElementById('best-wpm');
    const resultWpm = document.getElementById('result-wpm');
    const resultAccuracy = document.getElementById('result-accuracy');
    const resultErrors = document.getElementById('result-errors');

    // --- 2. State Management ---
    // The state object is now always transient. It is never saved to localStorage.
    let state;

    // --- 3. Core Game Flow ---

    /**
     * Initializes the application on page load.
     * **CRITICAL FIX:** This function no longer tries to load a saved game.
     * It simply attaches listeners and calls resetGame() to ensure a fresh start.
     */
    function init() {
        // Attach event listeners that persist across games
        startBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', resetGame);
        
        // Call resetGame to set up the initial clean state.
        resetGame();
    }

    /**
     * Resets the entire game to the setup screen.
     * This is the single source of truth for a "new game" state.
     */
    function resetGame() {
        // Stop any active timers
        clearInterval(state?.timer);
        clearInterval(state?.countdown);

        // Remove the keydown listener from the previous session
        document.removeEventListener('keydown', handleKeyPress);

        // Re-create the state object from scratch
        state = {
            status: 'waiting',
            timer: null,
            countdown: null,
            timeRemaining: 0,
            selectedDuration: parseInt(timeSelect.value, 10),
            characters: [],
            currentIndex: 0,
            errors: 0,
            totalCharsTyped: 0,
        };

        // Reset the UI completely
        paragraphDisplay.innerHTML = '';
        paragraphDisplay.scrollTop = 0; // Reset scroll position

        // If you have a typing input field, clear it and blur/focus it
        const typingInput = document.getElementById('typing-input');
        if (typingInput) {
            typingInput.value = '';
            typingInput.blur();
        }

        // Reset all text displays
        wpmDisplay.textContent = '0';
        timeDisplay.textContent = `${Math.floor(state.selectedDuration / 60)}:${(state.selectedDuration % 60).toString().padStart(2, '0')}`;
        
        // Show the setup screen and hide others
        resultsScreen.classList.add('hidden');
        typingScreen.classList.add('hidden');
        countdownOverlay.classList.add('hidden');
        setupScreen.classList.remove('hidden');

        // Load historical stats (Best WPM, etc.)
        loadHistoricalStats();
    }

    /**
     * Kicks off a new game session from the setup screen.
     */
    async function startGame() {
        // Update selectedDuration based on the current dropdown value
        state.selectedDuration = parseInt(timeSelect.value, 10);
        state.timeRemaining = state.selectedDuration;
        setupScreen.classList.add('hidden');
        state.status = 'countdown';

        // Fetch a new set of paragraphs for this session
        await fetchAndPrepareParagraphs();
        
        if (state.characters.length === 0) {
            alert('Error: Could not load typing text. Please try again.');
            resetGame(); // Go back to setup if fetching fails
            return;
        }

        startCountdown();
    }

    /**
     * Handles the final phase of the game: showing results.
     */
    function endGame() {
        if (state.status !== 'typing') return;

        clearInterval(state.timer);
        state.status = 'finished';
        document.removeEventListener('keydown', handleKeyPress);
        
        typingScreen.classList.add('hidden');
        calculateAndDisplayResults();
        resultsScreen.classList.remove('hidden');
    }

    async function fetchAndPrepareParagraphs() {
        try {
            // Clear the paragraph display and remove all previous spans
            paragraphDisplay.innerHTML = '';
            // Also reset scroll position
            paragraphDisplay.scrollTop = 0;

            // Reset state variables for a new paragraph
            state.currentIndex = 0;
            state.errors = 0;
            state.totalCharsTyped = 0;

            const response = await fetch('../../data/paragraphs.json');
            const data = await response.json();
            const requiredChars = (state.selectedDuration / 60) * 50 * 5; // Approx.
            let fullText = '';
            let shuffled = data.paragraphs.sort(() => 0.5 - Math.random());
            while (fullText.length < requiredChars) fullText += shuffled.join(' ') + ' ';
            
            state.characters = fullText.trim().split('').map(char => {
                const span = document.createElement('span');
                span.innerText = char;
                span.className = 'char';
                paragraphDisplay.appendChild(span);
                return span;
            });

            // If you have a typing input field, clear and focus it for the new paragraph
            const typingInput = document.getElementById('typing-input');
            if (typingInput) {
                typingInput.value = '';
                typingInput.focus();
            }
        } catch (error) {
            console.error('Failed to load paragraphs:', error);
        }
    }

    function startCountdown() {
        countdownOverlay.classList.remove('hidden');
        let count = 3;
        countdownTimer.textContent = count;
        state.countdown = setInterval(() => {
            count--;
            if (count > 0) {
                countdownTimer.textContent = count;
            } else {
                clearInterval(state.countdown);
                countdownTimer.textContent = 'Go!';
                setTimeout(() => {
                    countdownOverlay.classList.add('hidden');
                    startTypingSession();
                }, 500);
            }
        }, 1000);
    }

    function startTypingSession() {
        state.status = 'typing';
        typingScreen.classList.remove('hidden');
        state.timeRemaining = state.selectedDuration;
        document.addEventListener('keydown', handleKeyPress);
        state.characters[0]?.classList.add('current', 'blink');
        state.timer = setInterval(updateTimer, 1000);
    }

    function handleKeyPress(e) {
        if (state.status !== 'typing' || state.currentIndex >= state.characters.length) return;
        if (e.key === ' ') e.preventDefault();

        const currentSpan = state.characters[state.currentIndex];
        
        if (e.key === 'Backspace') {
            if (state.currentIndex > 0) {
                currentSpan.classList.remove('current', 'blink');
                state.currentIndex--;
                state.characters[state.currentIndex].className = 'char current blink';
            }
            return;
        }
        
        if (e.key.length !== 1) return;
        
        state.totalCharsTyped++;
        currentSpan.className = e.key === currentSpan.innerText ? 'char correct' : 'char incorrect';
        if (e.key !== currentSpan.innerText) state.errors++;
        
        state.currentIndex++;
        if (state.currentIndex < state.characters.length) {
            state.characters[state.currentIndex].classList.add('current', 'blink');
            checkScroll(state.characters[state.currentIndex]);
        } else {
            endGame();
        }

        // Update WPM display in real-time
        updateTimerDisplay();
        if (state.timeRemaining <= 0) endGame();
    }

    function updateTimer() {
        state.timeRemaining--;
        updateTimerDisplay();
        updateWpmDisplay();
        if (state.timeRemaining <= 0) endGame();
    }

    function calculateAndDisplayResults() {
        const timeMinutes = state.selectedDuration / 60;
        const grossWPM = (state.totalCharsTyped / 5) / timeMinutes;
        const netWPM = Math.round(grossWPM - (state.errors / timeMinutes));
        const finalWPM = Math.max(0, netWPM);
        const accuracy = state.totalCharsTyped > 0 ? Math.round(((state.totalCharsTyped - state.errors) / state.totalCharsTyped) * 100) : 100;

        resultWpm.textContent = finalWPM;
        resultAccuracy.textContent = `${accuracy}%`;
        resultErrors.textContent = state.errors;
    }
    // --- 5. Utility Functions ---

    function updateWpmDisplay() {
        const elapsed = state.selectedDuration - state.timeRemaining;
        const minutes = elapsed / 60;
        let wpm = 0;
        if (minutes > 0) {
            wpm = Math.round((state.totalCharsTyped / 5) / minutes);
        }
        wpmDisplay.textContent = wpm;
    }

    function updateTimerDisplay() {
        timeDisplay.textContent = `${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        timeDisplay.textContent = `${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}`;
    }

    function checkScroll(element) {
        const containerRect = paragraphDisplay.getBoundingClientRect();
        if (element.getBoundingClientRect().top > containerRect.top + containerRect.height / 1.5) {
            paragraphDisplay.scrollTop += element.getBoundingClientRect().height;
        }
    }

    /**
     * **CRITICAL FIX:** This function now ONLY saves the statistics needed
     * for historical purposes. It does NOT save the entire game state.
     */
    function saveHistoricalStats(wpm) {
        localStorage.setItem('typingRacer_lastWPM', wpm);
        const bestWPM = localStorage.getItem('typingRacer_bestWPM') || 0;
        if (wpm > bestWPM) {
            localStorage.setItem('typingRacer_bestWPM', wpm);
        }
    }

    function loadHistoricalStats() {
        lastWpmDisplay.textContent = localStorage.getItem('typingRacer_lastWPM') || 'N/A';
        bestWpmDisplay.textContent = localStorage.getItem('typingRacer_bestWPM') || 'N/A';
    }

    // --- 6. Start the Application ---
    init();
});