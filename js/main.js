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
    
    // Set up flexible workspace
    setupWorkspaceArea();
    
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
    
    // Update canvas title
    if (typeof updateCanvasTitle === 'function') {
        updateCanvasTitle();
    }
    
    console.log('Application initialized successfully');
    console.log(`Workspace area: ${WORKSPACE_CONFIG.width}x${WORKSPACE_CONFIG.height}mm`);
    console.log(`Pixels per mm: ${WORKSPACE_CONFIG.pixelsPerMm.toFixed(2)}`);
    console.log('Origin: Current printer position (no homing required)');
    console.log('Zoom controls: Mouse wheel, Ctrl+/-, or buttons');
}

// Toggle collapsible sections in the interface
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    const toggleIcon = header.querySelector('.toggle-icon');
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
    } else {
        section.classList.add('collapsed');
        toggleIcon.textContent = '▶';
    }
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
