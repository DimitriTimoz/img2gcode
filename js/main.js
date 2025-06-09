/**
 * Main Application File
 * Handles application initialization and coordination between modules
 */

/**
 * Initialize the application
 */
function initApp() {
    canvas = new fabric.Canvas('c');
    
    // Canvas configuration
    canvas.selection = true;
    canvas.preserveObjectStacking = true;
    
    // Set up Ender 3 dimensions
    setupEnder3Dimensions();
    
    // Add grid overlay
    addGridOverlay();
    
    // Set up event listeners
    setupEventListeners();
    
    // Display dimension info
    updateDimensionInfo();
    
    // Initialize zoom display
    updateZoomDisplay();
    
    // Check for saved project
    checkForSavedProjects();
    
    // Enable auto-save
    enableAutoSave();
    
    console.log('Application initialized successfully');
    console.log(`Ender 3 build area: ${ENDER3_CONFIG.width}x${ENDER3_CONFIG.height}mm`);
    console.log(`Pixels per mm: ${ENDER3_CONFIG.pixelsPerMm.toFixed(2)}`);
    console.log('Zoom controls: Mouse wheel, Ctrl+/-, or buttons');
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        var modal = document.getElementById('projectModal');
        if (event.target == modal) {
            closeProjectManager();
        }
    };
});
