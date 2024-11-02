document.addEventListener('DOMContentLoaded', async function() {
    // Initialize audio elements
    backgroundMusic = document.getElementById('background-music');
    omSound = new Audio('om.mp3');
    clickSound = new Audio('click.mp3');
    
    // Set initial volumes
    backgroundMusic.volume = backgroundVolume;
    omSound.volume = 1.0;
    clickSound.volume = 0.3;
    
    // Initialize audio controls
    const muteButton = document.getElementById('mute-button');
    muteButton.addEventListener('click', function() {
        if (isMuted) {
            // Unmute
            backgroundMusic.volume = previousVolume;
            backgroundVolume = previousVolume;
            document.getElementById('volume-slider').value = previousVolume * 100;
            muteButton.querySelector('.mute-icon').textContent = '🔊';
        } else {
            // Mute
            previousVolume = backgroundVolume;
            backgroundMusic.volume = 0;
            backgroundVolume = 0;
            document.getElementById('volume-slider').value = 0;
            muteButton.querySelector('.mute-icon').textContent = '🔈';
        }
        isMuted = !isMuted;
    });

    // Add volume control listener
    document.getElementById('volume-slider').addEventListener('input', function(e) {
        backgroundVolume = e.target.value / 100;
        backgroundMusic.volume = backgroundVolume;
        
        if (backgroundVolume > 0 && isMuted) {
            isMuted = false;
            muteButton.querySelector('.mute-icon').textContent = '🔊';
        } else if (backgroundVolume === 0 && !isMuted) {
            isMuted = true;
            muteButton.querySelector('.mute-icon').textContent = '🔈';
        }
    });

    // Add game mode change listener
    document.getElementById("game-mode").addEventListener("change", function() {
        updateModeSelections(this.value);
    });

    // Add button event listeners
    document.querySelector('.game-info-row #back-button').addEventListener('click', navigateBack);
    document.querySelector('.game-info-row #refresh-button').addEventListener('click', refreshCurrentPage);
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    document.getElementById('show-graph').addEventListener('click', showGraphModal);
    document.querySelector('.close-modal').addEventListener('click', hideGraphModal);

    // Add modal close on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('graph-modal');
        if (event.target === modal) {
            hideGraphModal();
        }
    });

    // Play initial OM sound
    await omSound.play().catch(error => {
        console.error('Error playing initial OM sound:', error);
    });
    
    // Initialize the game immediately
    loadWordsFromFile();
    const defaultMode = document.getElementById("game-mode").value;
    updateModeSelections(defaultMode);
});

// Variables for tracking path and timer
let pathLength = 0;
let visitedPages = [];
let startTime;
let timerInterval;
let startPage = "Philosophy";
let finalPage = "Consciousness";
let network = null;
let nodes = new vis.DataSet();
let edges = new vis.DataSet();
let backgroundMusic;
let isMusicPlaying = false;
let clickSound;
let omSound;
let backgroundVolume = 0.5;
let isMuted = false;
let previousVolume = 0.5;
let currentPageIndex = -1;
let availableWords = [];
let backSteps = 0;

// Add all your existing functions here before DOMContentLoaded
async function loadWordsFromFile() {
    try {
        console.log('Attempting to load words.txt...');
        const response = await fetch('words.txt');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
            throw new Error('Words file is empty');
        }
        
        console.log('File content:', text);
        
        availableWords = text.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);
            
        console.log('Processed words:', availableWords);

        if (availableWords.length === 0) {
            throw new Error('No valid words found in file');
        }

        // Add "Consciousness" if it's not in the list
        if (!availableWords.includes("Consciousness")) {
            availableWords.push("Consciousness");
        }

        console.log('Final word list:', availableWords);
        
        // Update the select options once words are loaded
        updateWordSelections();
        
        // Update mode selections after words are loaded
        const currentMode = document.getElementById("game-mode").value;
        updateModeSelections(currentMode);
        
    } catch (error) {
        console.error('Error loading words:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        alert(`Failed to load words.txt. Make sure you're running through a web server. Error: ${error.message}`);
        // Fallback to default words if file loading fails
        availableWords = ["Philosophy", "Science", "Art", "History", "Technology", 
                         "Mathematics", "Biology", "Psychology", "Music", "Literature", 
                         "Engineering", "Astronomy", "Consciousness"];
        updateWordSelections();
    }
}

// Function to update word selections
function updateWordSelections() {
    const startWordSelect = document.getElementById('start-word');
    const endWordSelect = document.getElementById('end-word');
    
    startWordSelect.innerHTML = '';
    endWordSelect.innerHTML = '';
    
    availableWords.forEach(word => {
        const startOption = new Option(word, word);
        const endOption = new Option(word, word);
        startWordSelect.appendChild(startOption);
        endWordSelect.appendChild(endOption);
    });

    endWordSelect.value = "Consciousness";
}

// Function to update mode selections
function updateModeSelections(mode) {
    const customSelection = document.getElementById("custom-selection");
    const startWordLabel = document.querySelector('label[for="start-word"]');
    const startWordSelect = document.getElementById("start-word");
    const endWordLabel = document.querySelector('label[for="end-word"]');
    const endWordSelect = document.getElementById("end-word");

    customSelection.style.display = "block";

    switch(mode) {
        case "consciousness":
            startWordLabel.style.display = "block";
            startWordSelect.style.display = "block";
            endWordLabel.style.display = "none";
            endWordSelect.style.display = "none";
            endWordSelect.value = "Consciousness";
            break;
        case "custom":
            startWordLabel.style.display = "block";
            startWordSelect.style.display = "block";
            endWordLabel.style.display = "block";
            endWordSelect.style.display = "block";
            break;
        case "random":
            customSelection.style.display = "none";
            break;
    }
}

// Function to check if goal is reached
async function isGoalReached(linkTitle) {
    if (!linkTitle) return false;
    
    const goalLower = finalPage.toLowerCase();
    const titleLower = linkTitle.toLowerCase();

    return titleLower === goalLower || 
           titleLower.split(/[\s_-]+/).includes(goalLower) ||
           titleLower.includes(goalLower);
}

// Function to fetch Wikipedia content
async function fetchWikiContent(title, isBackNavigation = false) {
    document.getElementById('loading-spinner').classList.remove('hidden');
    
    try {
        if (!isBackNavigation && visitedPages.includes(title)) {
            alert("You have already visited this page. Choose a different link.");
            return;
        }

        if (!isBackNavigation) {
            visitedPages.push(title);
            currentPageIndex = visitedPages.length - 1;
        }

        updateBackButtonState();

        if (await isGoalReached(title)) {
            if (!isBackNavigation) {
                pathLength += 1;
                document.getElementById("path-length").innerText = pathLength;
                updatePathTrail();
            }
            endGame();
            return;
        }

        const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${title}&prop=text&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();

        let pageHTML = data.parse.text["*"];
        
        pageHTML = pageHTML.replace(/src="\/\//g, 'src="https://');
        pageHTML = pageHTML.replace(/srcset="\/\//g, 'srcset="https://');
        pageHTML = pageHTML.replace(/src="\/wiki/g, 'src="https://wikipedia.org/wiki');
        pageHTML = pageHTML.replace(/href="\/wiki/g, 'href="https://en.wikipedia.org/wiki');

        document.getElementById("wiki-content").innerHTML = pageHTML;

        document.getElementById("wiki-container").scrollTop = 0;
        document.getElementById("wiki-content").scrollTop = 0;
        window.scrollTo(0, 0);

        if (!isBackNavigation) {
            pathLength += 1;
        } else {
            pathLength -= 1;
            backSteps += 1;
        }
        document.getElementById("path-length").innerText = pathLength;

        updatePathTrail();
        enableLinkNavigation();

    } catch (error) {
        console.error("Error fetching Wikipedia content:", error);
        document.getElementById("wiki-content").innerText = "An error occurred while loading content.";
    } finally {
        document.getElementById('loading-spinner').classList.add('hidden');
    }
}

// Function to enable link navigation
function enableLinkNavigation() {
    const links = document.getElementById("wiki-content").querySelectorAll("a");

    links.forEach(link => {
        link.addEventListener("click", async function(event) {
            event.preventDefault();
            const title = this.getAttribute("title");
            if (title) {
                clickSound.currentTime = 0;
                await clickSound.play().catch(e => console.log('Click sound play failed:', e));
                
                if (isGoalReached(title)) {
                    this.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
                    this.style.color = '#2e7d32';
                    setTimeout(() => fetchWikiContent(title), 200);
                } else {
                    fetchWikiContent(title);
                }
            }
        });

        if (link.getAttribute("title") && isGoalReached(link.getAttribute("title"))) {
            link.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
            link.style.borderColor = 'rgba(46, 125, 50, 0.3)';
        }
    });
}

// Function to update path trail
function updatePathTrail() {
    const pathTrailDiv = document.getElementById("path-trail");
    pathTrailDiv.innerHTML = "Path: ";

    visitedPages.forEach((page, index) => {
        const breadcrumb = document.createElement("span");
        breadcrumb.classList.add("breadcrumb");
        breadcrumb.innerText = page;
        pathTrailDiv.appendChild(breadcrumb);
    });
}

// Function to update back button state
function updateBackButtonState() {
    const backButtons = document.querySelectorAll('#back-button');
    backButtons.forEach(button => {
        button.disabled = currentPageIndex <= 0;
    });
}

// Function to navigate back
function navigateBack() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        const previousPage = visitedPages[currentPageIndex];
        visitedPages.pop();
        fetchWikiContent(previousPage, true);
    }
}

// Function to refresh current page
function refreshCurrentPage() {
    if (currentPageIndex >= 0) {
        const currentPage = visitedPages[currentPageIndex];
        fetchWikiContent(currentPage, true);
    }
}

// Function to start game
function startGame() {
    pathLength = 0;
    visitedPages = [];
    backSteps = 0;
    document.getElementById("path-length").innerText = pathLength;
    document.getElementById("path-trail").innerText = "";
    document.getElementById("wiki-content").innerText = "Starting your journey...";

    const mode = document.getElementById("game-mode").value;

    switch(mode) {
        case "consciousness":
            startPage = document.getElementById("start-word").value;
            finalPage = "Consciousness";
            break;
        case "custom":
            startPage = document.getElementById("start-word").value;
            finalPage = document.getElementById("end-word").value;
            break;
        case "random":
            startPage = availableWords[Math.floor(Math.random() * availableWords.length)];
            do {
                finalPage = availableWords[Math.floor(Math.random() * availableWords.length)];
            } while (finalPage === startPage);
            alert(`Starting from "${startPage}" and trying to reach "${finalPage}"`);
            break;
    }

    document.getElementById("current-start").textContent = startPage;
    document.getElementById("current-goal").textContent = finalPage;

    startTime = Date.now();
    timerInterval = setInterval(updateTimeTaken, 1000);

    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
    isMusicPlaying = true;

    fetchWikiContent(startPage);
}

// Function to reset game
function resetGame() {
    clearInterval(timerInterval);
    pathLength = 0;
    visitedPages = [];
    backSteps = 0;
    currentPageIndex = -1;
    document.getElementById("path-length").innerText = "0";
    document.getElementById("time-taken").innerText = "0";
    document.getElementById("path-trail").innerText = "Path: ";
    document.getElementById("wiki-content").innerText = "Your journey begins here...";
    document.getElementById("current-start").textContent = "-";
    document.getElementById("current-goal").textContent = "-";
    updateBackButtonState();
}

// Function to update timer
function updateTimeTaken() {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("time-taken").innerText = timeTaken;
}

// Function to show graph modal
function showGraphModal() {
    const modal = document.getElementById('graph-modal');
    modal.style.display = 'block';
    updatePathVisualization();
}

// Function to hide graph modal
function hideGraphModal() {
    const modal = document.getElementById('graph-modal');
    modal.style.display = 'none';
}

// Function to update path visualization
function updatePathVisualization() {
    const container = document.getElementById('path-visualization');
    
    nodes.clear();
    edges.clear();
    
    visitedPages.forEach((page, index) => {
        nodes.add({
            id: index,
            label: page,
            color: {
                background: index === currentPageIndex ? '#e3f2fd' : '#ffffff',
                border: '#bbdefb'
            },
            font: { 
                color: '#333',
                size: 16
            },
            shape: 'box',
            margin: 10,
            shadow: true
        });
        
        if (index < visitedPages.length - 1) {
            edges.add({
                from: index,
                to: index + 1,
                arrows: 'to',
                color: { color: '#0073e6' },
                width: 2,
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.2
                }
            });
        }
    });

    if (!network) {
        const data = {
            nodes: nodes,
            edges: edges
        };

        const options = {
            layout: {
                hierarchical: {
                    direction: 'LR',
                    sortMethod: 'directed',
                    levelSeparation: 200,
                    nodeSpacing: 150,
                    treeSpacing: 200
                }
            },
            physics: {
                enabled: false
            },
            nodes: {
                widthConstraint: {
                    minimum: 120,
                    maximum: 200
                }
            },
            edges: {
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.2
                }
            },
            interaction: {
                dragNodes: false,
                zoomView: true,
                dragView: true
            }
        };

        network = new vis.Network(container, data, options);
        
        network.once('afterDrawing', function() {
            network.fit({
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
        });
    } else {
        network.setData({
            nodes: nodes,
            edges: edges
        });
        
        network.fit({
            animation: {
                duration: 1000,
                easingFunction: 'easeInOutQuad'
            }
        });
    }
}

// Function to calculate score
function calculateScore(pathLength, timeTaken, backSteps) {
    const pathScore = 1000 / Math.pow(pathLength, 1.5);
    const timeScore = 500 / Math.sqrt(timeTaken);
    const backStepsPenalty = Math.max(0, 300 - (backSteps * 50));
    let totalScore = Math.round(pathScore + timeScore + backStepsPenalty);
    return Math.max(100, totalScore);
}

// Function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

// Add this endGame function
async function endGame() {
    // Stop the timer
    clearInterval(timerInterval);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    // Calculate score
    const score = calculateScore(pathLength, timeTaken, backSteps);

    // Get current game mode
    const currentMode = document.getElementById("game-mode").value;

    // Play OM sound and pause background music for consciousness mode
    if (currentMode === "consciousness") {
        backgroundMusic.pause();
        isMusicPlaying = false;
        
        try {
            omSound.currentTime = 0;
            await omSound.play().catch(error => {
                console.error('Error playing end game OM sound:', error);
            });
        } catch (error) {
            console.error('Error handling OM sound:', error);
        }
    }

    // Display the appropriate message based on mode
    const wikiContentDiv = document.getElementById("wiki-content");
    
    if (currentMode === "consciousness") {
        wikiContentDiv.innerHTML = `
            <div class="end-game-message">
                <h2>Journey Complete</h2>
                
                <div class="journey-stats">
                    <h3>Your Journey Statistics</h3>
                    <p><strong>Path Length:</strong> ${pathLength} steps</p>
                    <p><strong>Time Taken:</strong> ${formatTime(timeTaken)}</p>
                    <p><strong>Back Steps:</strong> ${backSteps}</p>
                    <p><strong>Final Score:</strong> ${score} points</p>
                </div>

                <div class="consciousness-message">
                    <p>Congratulations, seeker. You've reached the end, yet perhaps discovered a beginning. 
                    This journey, like every path in life, leads to consciousness—a truth that great minds 
                    and philosophies have illuminated.</p>

                    <p>Advaita Vedanta speaks of consciousness as the ultimate unity, the boundless Brahman 
                    beyond illusion; Swami Vivekananda saw it as the source of infinite strength, revealing 
                    our divine nature. Osho invites us to experience it as a silent, witnessing presence, 
                    while Krishnamurti finds it in choiceless awareness, free from conditioned thought.</p>

                    <p>Carl Jung viewed consciousness as a path to wholeness, integrating both personal and 
                    collective realms. And in the Tao, consciousness flows effortlessly, aligning with life's 
                    natural rhythms.</p>

                    <p>These paths all converge on the same truth: consciousness is not merely a destination, 
                    but the timeless foundation of every journey, the ultimate return to the awareness within. 
                    All paths lead to consciousness.</p>
                </div>
            </div>
        `;
    } else {
        wikiContentDiv.innerHTML = `
            <div class="end-game-message">
                <h2>Journey Complete!</h2>
                
                <div class="journey-stats">
                    <h3>Your Journey Statistics</h3>
                    <p><strong>Path Length:</strong> ${pathLength} steps</p>
                    <p><strong>Time Taken:</strong> ${formatTime(timeTaken)}</p>
                    <p><strong>Back Steps:</strong> ${backSteps}</p>
                    <p><strong>Final Score:</strong> ${score} points</p>
                </div>

                <div class="other-mode-message">
                    <p>Congratulations! You've successfully navigated from "${startPage}" to "${finalPage}"!</p>
                    <p>Your journey through Wikipedia's vast knowledge network demonstrates the 
                    interconnectedness of human knowledge and understanding.</p>
                    <p class="try-consciousness">
                        <strong>Ready for a deeper challenge?</strong><br>
                        Try the "All Paths Lead to Me" mode to discover how every concept ultimately 
                        connects to consciousness itself!
                    </p>
                </div>
            </div>
        `;
    }
}
