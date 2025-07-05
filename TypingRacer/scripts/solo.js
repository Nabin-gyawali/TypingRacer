// scripts/solo.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const setupScreen = document.getElementById('setup-screen');
    const typingScreen = document.getElementById('typing-screen');
    const resultsScreen = document.getElementById('results-screen');
    const countdownOverlay = document.getElementById('countdown-overlay');

    const timeSelect = document.getElementById('time-select');
    const startBtn = document.getElementById('start-btn');
    const playAgainBtn = document.getElementById('play-again-btn');

    const lastWpmDisplay = document.getElementById('last-wpm');
    const bestWpmDisplay = document.getElementById('best-wpm');
    const countdownTimer = document.getElementById('countdown-timer');
    const timeDisplay = document.getElementById('time-display');
    const wpmDisplay = document.getElementById('wpm-display');
    const paragraphDisplay = document.getElementById('paragraph-display');

    const resultWpm = document.getElementById('result-wpm');
    const resultAccuracy = document.getElementById('result-accuracy');
    const resultErrors = document.getElementById('result-errors');
    const resultChars = document.getElementById('result-chars');

    // --- State Management ---
    let state = {
        status: 'waiting', // waiting, countdown, typing, finished
        timer: null,
        countdown: null,
        timeRemaining: 0,
        selectedDuration: 300,
        characters: [],
        currentIndex: 0,
        errors: 0,
        totalCharsTyped: 0,
    };

    // --- Functions ---

    /**
     * Initializes the application.
     */
    function init() {
        loadStatsFromStorage();
        setupScreen.classList.remove('hidden');
        typingScreen.classList.add('hidden');
        resultsScreen.classList.add('hidden');
        countdownOverlay.classList.add('hidden');

        startBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', resetGame);
        timeSelect.addEventListener('change', (e) => {
            state.selectedDuration = parseInt(e.target.value, 10);
        });
        state.selectedDuration = parseInt(timeSelect.value, 10);
    }

    /**
     * Resets the game to the initial setup screen.
     */
    function resetGame() {
        clearInterval(state.timer);
        clearInterval(state.countdown);
        document.removeEventListener('keydown', handleKeyPress);
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
        init();
    }

    /**
     * Loads the last and best WPM from localStorage.
     */
    function loadStatsFromStorage() {
        const lastWPM = localStorage.getItem('typingRacer_lastWPM');
        const bestWPM = localStorage.getItem('typingRacer_bestWPM');
        lastWpmDisplay.textContent = lastWPM ? `${lastWPM}` : 'N/A';
        bestWpmDisplay.textContent = bestWPM ? `${bestWPM}` : 'N/A';
    }

    /**
     * Fetches paragraphs from the JSON file and prepares them for the test.
     */
    async function fetchAndPrepareParagraphs() {
        try {
            const response = await fetch('../../data/paragraphs.json');
            const data = await response.json();
            
            // Generate enough text based on selected time (avg 50 WPM)
            const wordsPerMinute = 50;
            const charsPerWord = 5;
            const requiredChars = (state.selectedDuration / 60) * wordsPerMinute * charsPerWord;

            let fullText = '';
            let shuffledParagraphs = data.paragraphs.sort(() => 0.5 - Math.random());
            
            while (fullText.length < requiredChars) {
                fullText += shuffledParagraphs.join(' ') + ' ';
            }
            fullText = fullText.trim();

            paragraphDisplay.innerHTML = '';
            state.characters = fullText.split('').map(char => {
                const span = document.createElement('span');
                span.innerText = char;
                span.className = 'char';
                paragraphDisplay.appendChild(span);
                return span;
            });
        } catch (error) {
            console.error('Failed to load paragraphs:', error);
            paragraphDisplay.innerText = "Error loading text. Please try again.";
        }
    }

    /**
     * Starts the game by fetching text and beginning the countdown.
     */
    async function startGame() {
        state.status = 'countdown';
        setupScreen.classList.add('hidden');
        await fetchAndPrepareParagraphs();
        startCountdown();
    }

    /**
     * Displays the 3-2-1 countdown.
     */
    function startCountdown() {
        countdownOverlay.classList.remove('hidden');
        let count = 3;
        countdownTimer.textContent = count;
        state.countdown = setInterval(() => {
            count--;
            if (count > 0) {
                countdownTimer.textContent = count;
            } else {
                countdownTimer.textContent = 'Go!';
                setTimeout(() => {
                    clearInterval(state.countdown);
                    countdownOverlay.classList.add('hidden');
                    startTypingSession();
                }, 500);
            }
        }, 1000);
    }
    
    /**
     * Begins the actual typing session.
     */
    function startTypingSession() {
        state.status = 'typing';
        typingScreen.classList.remove('hidden');
        state.timeRemaining = state.selectedDuration;
        updateTimerDisplay();
        
        // Set initial cursor
        if(state.characters.length > 0) {
            state.characters[0].classList.add('current', 'blink');
        }

        // Disable paste, copy, select
        paragraphDisplay.addEventListener('copy', e => e.preventDefault());
        paragraphDisplay.addEventListener('paste', e => e.preventDefault());
        paragraphDisplay.addEventListener('selectstart', e => e.preventDefault());


        document.addEventListener('keydown', handleKeyPress);
        state.timer = setInterval(updateTimer, 1000);
    }

    /**
     * Handles key presses during the typing session.
     * @param {KeyboardEvent} e - The keyboard event.
     */
    function handleKeyPress(e) {
        if (state.status !== 'typing' || state.currentIndex >= state.characters.length) {
            return;
        }

        const currentSpan = state.characters[state.currentIndex];
        const nextSpan = state.characters[state.currentIndex + 1];
        
        // Prevent default for space to avoid page scrolling, and for apostrophe/quote to avoid browser find-bar
        if (e.key === ' ' || e.key === "'" || e.key === '"') e.preventDefault();
        
        if (e.key === 'Backspace') {
            if (state.currentIndex > 0) {
                // Move cursor back
                currentSpan.classList.remove('current', 'blink');
                state.currentIndex--;
                const prevSpan = state.characters[state.currentIndex];
                prevSpan.className = 'char current blink';
            }
            return;
        }
        
        // Ignore non-printable keys (except backspace)
        if (e.key.length !== 1) return;
        
        state.totalCharsTyped++;

        if (e.key === currentSpan.innerText) {
            currentSpan.classList.add('correct');
            currentSpan.classList.remove('incorrect');
        } else {
            currentSpan.classList.add('incorrect');
            currentSpan.classList.remove('correct');
            state.errors++;
        }

        // Move cursor forward
        currentSpan.classList.remove('current', 'blink');
        if (nextSpan) {
            nextSpan.classList.add('current', 'blink');
            checkScroll(nextSpan);
        }
        
        state.currentIndex++;

        if (state.currentIndex >= state.characters.length) {
            // This scenario is unlikely with long text, but handled
            endGame();
        }
    }

    /**
     * Checks and adjusts the scroll position of the paragraph container.
     * @param {HTMLElement} currentElement - The current character span.
     */
    function checkScroll(currentElement) {
        const containerRect = paragraphDisplay.getBoundingClientRect();
        const charRect = currentElement.getBoundingClientRect();

        // If the character's top position is past the halfway point of the container
        if (charRect.top > containerRect.top + containerRect.height / 2) {
            paragraphDisplay.scrollTop += charRect.height * 1.8; // Scroll by one line height
        }
    }
    
    /**
     * Updates the timer display and live WPM.
     */
    function updateTimer() {
        state.timeRemaining--;
        updateTimerDisplay();
        updateWPMDisplay();

        if (state.timeRemaining <= 0) {
            endGame();
        }
    }

    /**
     * Formats and displays the remaining time.
     */
    function updateTimerDisplay() {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Calculates and displays the live WPM.
     */
    function updateWPMDisplay() {
        const timeElapsedMinutes = (state.selectedDuration - state.timeRemaining) / 60;
        if (timeElapsedMinutes > 0) {
            const grossWPM = (state.totalCharsTyped / 5) / timeElapsedMinutes;
            wpmDisplay.textContent = Math.round(grossWPM);
        }
    }

    /**
     * Ends the game, calculates results, and shows the results screen.
     */
    function endGame() {
        clearInterval(state.timer);
        state.status = 'finished';
        document.removeEventListener('keydown', handleKeyPress);
        
        typingScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');

        calculateAndDisplayResults();
    }
    
    /**
     * Calculates and displays the final statistics.
     */
    function calculateAndDisplayResults() {
        const timeElapsedMinutes = state.selectedDuration / 60;
        const grossWPM = (state.totalCharsTyped / 5) / timeElapsedMinutes;
        const netWPM = Math.round(grossWPM - (state.errors / timeElapsedMinutes));
        const finalWPM = Math.max(0, netWPM);

        const accuracy = state.totalCharsTyped > 0 
            ? Math.round(((state.totalCharsTyped - state.errors) / state.totalCharsTyped) * 100)
            : 0;

        resultWpm.textContent = finalWPM;
        resultAccuracy.textContent = `${accuracy}%`;
        resultErrors.textContent = state.errors;
        resultChars.textContent = `${state.currentIndex} / ${state.totalCharsTyped}`;
        
        saveStatsToStorage(finalWPM);
    }

    /**
     * Saves the final stats to localStorage.
     * @param {number} wpm - The final calculated WPM.
     */
    function saveStatsToStorage(wpm) {
        localStorage.setItem('typingRacer_lastWPM', wpm);
        const bestWPM = localStorage.getItem('typingRacer_bestWPM') || 0;
        if (wpm > bestWPM) {
            localStorage.setItem('typingRacer_bestWPM', wpm);
        }
    }

    // --- Start the application ---
    init();
});