// Variables for tracking path and timer
let pathLength = 0;
let visitedPages = [];
let startTime;
let timerInterval;
let startPage = "Philosophy";
let finalPage = "Consciousness";
let backgroundMusic;
let isMusicPlaying = false;
let currentPageIndex = -1;
let network = null;
let nodes = new vis.DataSet();
let edges = new vis.DataSet();
let availableWords = [];

// List of random starting words
const randomStartWords = [
    "Philosophy", "Science", "Art", "History", "Technology", 
    "Mathematics", "Biology", "Psychology", "Music", "Literature", 
    "Engineering", "Astronomy", "Culture", "Religion", "Language"
];

const randomEndWords = [
    "Knowledge", "Universe", "Life", "Mind", "Society",
    "Evolution", "Nature", "Time", "Reality", "Existence",
    "Intelligence", "Humanity", "Truth", "Wisdom", "Energy"
];

// Fetch full HTML content from Wikipedia for a given page title
async function fetchWikiContent(title, isBackNavigation = false) {
    // Check if the page has already been visited
    if (!isBackNavigation && visitedPages.includes(title)) {
        alert("You have already visited this page. Choose a different link.");
        return;
    }

    // Add the title to the visited pages only if not using back navigation
    if (!isBackNavigation) {
        visitedPages.push(title);
        currentPageIndex = visitedPages.length - 1;
    }

    // Update back button state
    updateBackButtonState();

    // Check if the user has reached the final page
    if (title.toLowerCase() === finalPage.toLowerCase()) {
        endGame(); // End the game if the final page is reached
        return;
    }

    // Wikipedia API URL for fetching full HTML content
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${title}&prop=text&format=json&origin=*`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Get the HTML content of the page
        let pageHTML = data.parse.text["*"];
        
        // Fix image URLs
        pageHTML = pageHTML.replace(/src="\/\//g, 'src="https://');
        pageHTML = pageHTML.replace(/srcset="\/\//g, 'srcset="https://');
        pageHTML = pageHTML.replace(/src="\/wiki/g, 'src="https://wikipedia.org/wiki');
        pageHTML = pageHTML.replace(/href="\/wiki/g, 'href="https://en.wikipedia.org/wiki');
        
        // Fix relative image URLs in srcset attributes
        pageHTML = pageHTML.replace(/srcset="(.*?)"/g, function(match, srcset) {
            return 'srcset="' + srcset.split(',').map(src => {
                let [url, size] = src.trim().split(' ');
                if (url.startsWith('/')) {
                    url = 'https://wikipedia.org' + url;
                }
                return url + (size ? ' ' + size : '');
            }).join(', ') + '"';
        });

        document.getElementById("wiki-content").innerHTML = pageHTML;

        // Scroll to the top of the page
        window.scrollTo(0, 0);

        // Update path length
        pathLength += 1;
        document.getElementById("path-length").innerText = pathLength;

        // Update the breadcrumb trail
        updatePathTrail();

        // Add event listeners to internal links for navigation
        enableLinkNavigation();
    } catch (error) {
        console.error("Error fetching Wikipedia content:", error);
        document.getElementById("wiki-content").innerText = "An error occurred while loading content.";
    }
}

// Function to enable navigation for Wikipedia links
function enableLinkNavigation() {
    const links = document.getElementById("wiki-content").querySelectorAll("a");

    links.forEach(link => {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            const title = this.getAttribute("title");
            if (title) {
                fetchWikiContent(title);
            }
        });
    });
}

// Function to update the breadcrumb trail
function updatePathTrail() {
    const pathTrailDiv = document.getElementById("path-trail");
    pathTrailDiv.innerHTML = ""; // Clear existing path

    visitedPages.forEach((page, index) => {
        const breadcrumb = document.createElement("span");
        breadcrumb.classList.add("breadcrumb");
        breadcrumb.innerText = page;
        
        pathTrailDiv.appendChild(breadcrumb);
    });

    // Update visualization if modal is visible
    const modal = document.getElementById('graph-modal');
    if (modal.style.display === 'block') {
        updatePathVisualization();
    }
}

// Function to end the game and display a congratulatory message
function endGame() {
    // Stop the timer
    clearInterval(timerInterval);

    // Display the congratulatory message
    const wikiContentDiv = document.getElementById("wiki-content");
    wikiContentDiv.innerHTML = `
        <h2>Congratulations!</h2>
        <p>You have reached <strong>${finalPage}</strong>!</p>
        <p>Your path length was <strong>${pathLength}</strong>.</p>
        <p>Thank you for playing "All Paths Lead to Me!"</p>
    `;
}

// Function to start the game
function startGame() {
    pathLength = 0;
    visitedPages = [];
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
            } while (finalPage === startPage); // Ensure end word is different from start word
            alert(`Starting from "${startPage}" and trying to reach "${finalPage}"`);
            break;
    }

    // Update the display of start and end words
    document.getElementById("current-start").textContent = startPage;
    document.getElementById("current-goal").textContent = finalPage;

    startTime = Date.now();
    timerInterval = setInterval(updateTimeTaken, 1000);
    fetchWikiContent(startPage);

    // Start music if not playing
    if (!isMusicPlaying) {
        backgroundMusic.play();
        document.querySelector('.music-icon').textContent = '🔊';
        isMusicPlaying = true;
    }
}

// Function to reset the game
function resetGame() {
    clearInterval(timerInterval);
    document.getElementById("path-length").innerText = "0";
    document.getElementById("time-taken").innerText = "0";
    document.getElementById("path-trail").innerText = "Path: ";
    document.getElementById("wiki-content").innerText = "Your journey begins here...";

    // Reset music to beginning but don't stop it
    if (isMusicPlaying) {
        backgroundMusic.currentTime = 0;
    }

    currentPageIndex = -1;
    updateBackButtonState();

    document.getElementById("current-start").textContent = "-";
    document.getElementById("current-goal").textContent = "-";
}

// Function to update the timer
function updateTimeTaken() {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("time-taken").innerText = timeTaken;
}

// Event listeners
document.getElementById("start-game").addEventListener("click", startGame);
document.getElementById("reset-game").addEventListener("click", resetGame);
document.getElementById("game-mode").addEventListener("change", function() {
    const customSelection = document.getElementById("custom-selection");
    const startWordLabel = document.querySelector('label[for="start-word"]');
    const startWordSelect = document.getElementById("start-word");
    const endWordLabel = document.querySelector('label[for="end-word"]');
    const endWordSelect = document.getElementById("end-word");

    switch(this.value) {
        case "consciousness":
            // Show only start word selection
            startWordLabel.style.display = "block";
            startWordSelect.style.display = "block";
            endWordLabel.style.display = "none";
            endWordSelect.style.display = "none";
            customSelection.style.display = "block";
            break;
        case "custom":
            // Show both start and end word selections
            startWordLabel.style.display = "block";
            startWordSelect.style.display = "block";
            endWordLabel.style.display = "block";
            endWordSelect.style.display = "block";
            customSelection.style.display = "block";
            break;
        case "random":
            // Hide all selections
            customSelection.style.display = "none";
            break;
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    // Load words first
    await loadWordsFromFile();
    
    // Initialize mode selections for default mode
    const defaultMode = document.getElementById("game-mode").value;
    updateModeSelections(defaultMode);

    // Initialize audio
    backgroundMusic = document.getElementById('background-music');
    const toggleMusicBtn = document.getElementById('toggle-music');
    
    toggleMusicBtn.addEventListener('click', function() {
        if (isMusicPlaying) {
            backgroundMusic.pause();
            toggleMusicBtn.querySelector('.music-icon').textContent = '🔈';
        } else {
            backgroundMusic.play();
            toggleMusicBtn.querySelector('.music-icon').textContent = '🔊';
        }
        isMusicPlaying = !isMusicPlaying;
    });

    // Add navigation button event listeners
    document.getElementById('back-button').addEventListener('click', navigateBack);
    document.getElementById('refresh-button').addEventListener('click', refreshCurrentPage);

    // Add modal controls
    document.getElementById('show-graph').addEventListener('click', showGraphModal);
    document.querySelector('.close-modal').addEventListener('click', hideGraphModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('graph-modal');
        if (event.target === modal) {
            hideGraphModal();
        }
    });
});

function updateBackButtonState() {
    const backButton = document.getElementById('back-button');
    backButton.disabled = currentPageIndex <= 0;
}

function navigateBack() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        const previousPage = visitedPages[currentPageIndex];
        // Remove the last page from visited pages
        visitedPages.pop();
        // Fetch the previous page content
        fetchWikiContent(previousPage, true);
    }
}

function refreshCurrentPage() {
    if (currentPageIndex >= 0) {
        const currentPage = visitedPages[currentPageIndex];
        // Fetch the current page content again
        fetchWikiContent(currentPage, true);
    }
}

// Add this function to create and update the network visualization
function updatePathVisualization() {
    const container = document.getElementById('path-visualization');
    
    // Clear existing nodes and edges
    nodes.clear();
    edges.clear();
    
    // Create nodes and edges from visited pages
    visitedPages.forEach((page, index) => {
        // Add node
        nodes.add({
            id: index,
            label: page,
            color: {
                background: index === currentPageIndex ? '#e3f2fd' : '#ffffff',
                border: '#bbdefb'
            },
            font: { color: '#333' },
            shape: 'box',
            margin: 10,
            shadow: true
        });
        
        // Add edge to next node
        if (index < visitedPages.length - 1) {
            edges.add({
                from: index,
                to: index + 1,
                arrows: 'to',
                color: { color: '#0073e6' },
                width: 2
            });
        }
    });

    // Create the network
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
                nodeSpacing: 150
            }
        },
        physics: {
            hierarchicalRepulsion: {
                centralGravity: 0.5,
                springLength: 200,
                springConstant: 0.01,
                nodeDistance: 150
            },
            solver: 'hierarchicalRepulsion'
        },
        edges: {
            smooth: {
                type: 'cubicBezier',
                forceDirection: 'horizontal'
            }
        }
    };

    if (!network) {
        network = new vis.Network(container, data, options);
    } else {
        network.setData(data);
    }
}

// Add modal control functions
function showGraphModal() {
    const modal = document.getElementById('graph-modal');
    modal.style.display = 'block';
    updatePathVisualization();
}

function hideGraphModal() {
    const modal = document.getElementById('graph-modal');
    modal.style.display = 'none';
}

// Add this function to handle mode selection display
function updateModeSelections(mode) {
    const customSelection = document.getElementById("custom-selection");
    const startWordLabel = document.querySelector('label[for="start-word"]');
    const startWordSelect = document.getElementById("start-word");
    const endWordLabel = document.querySelector('label[for="end-word"]');
    const endWordSelect = document.getElementById("end-word");

    customSelection.style.display = "block"; // Show by default

    switch(mode) {
        case "consciousness":
            startWordLabel.style.display = "block";
            startWordSelect.style.display = "block";
            endWordLabel.style.display = "none";
            endWordSelect.style.display = "none";
            endWordSelect.value = "Consciousness"; // Force end word
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

// Update the game mode change event listener
document.getElementById("game-mode").addEventListener("change", function() {
    updateModeSelections(this.value);
});

// Add this function to load words from file
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
        
        console.log('File content:', text); // Debug log
        
        availableWords = text.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0); // Remove empty lines
            
        console.log('Processed words:', availableWords); // Debug log

        if (availableWords.length === 0) {
            throw new Error('No valid words found in file');
        }

        // Add "Consciousness" if it's not in the list
        if (!availableWords.includes("Consciousness")) {
            availableWords.push("Consciousness");
        }

        console.log('Final word list:', availableWords); // Debug log
        
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
        availableWords = [...randomStartWords];
        updateWordSelections();
    }
}

// Function to update select options
function updateWordSelections() {
    const startWordSelect = document.getElementById('start-word');
    const endWordSelect = document.getElementById('end-word');
    
    // Clear existing options
    startWordSelect.innerHTML = '';
    endWordSelect.innerHTML = '';
    
    // Add new options from loaded words
    availableWords.forEach(word => {
        const startOption = new Option(word, word);
        const endOption = new Option(word, word);
        startWordSelect.appendChild(startOption);
        endWordSelect.appendChild(endOption);
    });

    // Set default end word for consciousness mode
    endWordSelect.value = "Consciousness";
}
