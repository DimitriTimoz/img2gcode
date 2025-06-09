/**
 * Configuration and Global Variables
 * Contains all global variables, configuration objects, and constants
 */

// Global variables
var canvas;
var loadedFonts = new Set();
var currentZoom = 1;
var minZoom = 0.1;
var maxZoom = 5;
var zoomStep = 0.1;

// Current project state
var currentProjectName = 'Projet par défaut';

// Storage keys
const PROJECTS_STORAGE_KEY = 'img2gcode_projects';
const CURRENT_PROJECT_KEY = 'img2gcode_current_project';

// Working area configuration - flexible workspace
var WORKSPACE_CONFIG = {
    // Default working area size (can be adjusted by user)
    defaultWidth: 100,   // mm - reasonable default working area
    defaultHeight: 100,  // mm - reasonable default working area
    maxWidth: 200,       // mm - maximum 20cm workspace
    maxHeight: 200,      // mm - maximum 20cm workspace
    
    // Canvas dimensions in pixels
    canvasWidth: 800,
    canvasHeight: 600,
    
    // Current working area (can be modified)
    width: 100,    // Current working width in mm
    height: 100,   // Current working height in mm
    
    // Calculate pixels per mm ratio based on current working area
    get pixelsPerMm() {
        var ratioX = this.canvasWidth / this.width;
        var ratioY = this.canvasHeight / this.height;
        return Math.min(ratioX, ratioY);
    },
    
    // Convert mm to pixels
    mmToPixels: function(mm) {
        return mm * this.pixelsPerMm;
    },
    
    // Convert pixels to mm
    pixelsToMm: function(pixels) {
        return pixels / this.pixelsPerMm;
    },
    
    // Update working area size
    setWorkingArea: function(width, height) {
        this.width = Math.max(10, Math.min(width || this.defaultWidth, this.maxWidth));   // Minimum 10mm, maximum 200mm
        this.height = Math.max(10, Math.min(height || this.defaultHeight, this.maxHeight)); // Minimum 10mm, maximum 200mm
        
        // Recalculate usable area when size changes
        if (typeof setupWorkspaceArea === 'function') {
            setupWorkspaceArea();
        }
    }
};

/**
 * Update workspace size from UI inputs
 */
function updateWorkspaceSize() {
    var widthInput = document.getElementById('workspaceWidth');
    var heightInput = document.getElementById('workspaceHeight');
    
    if (widthInput && heightInput) {
        var newWidth = parseInt(widthInput.value) || WORKSPACE_CONFIG.defaultWidth;
        var newHeight = parseInt(heightInput.value) || WORKSPACE_CONFIG.defaultHeight;
        
        // Update workspace configuration
        WORKSPACE_CONFIG.setWorkingArea(newWidth, newHeight);
        
        // Refresh the grid and dimension info
        setupWorkspaceArea();
        addGridOverlay();
        updateDimensionInfo();
        
        canvas.renderAll();
        
        console.log(`Workspace updated to: ${WORKSPACE_CONFIG.width}x${WORKSPACE_CONFIG.height}mm`);
    }
}
