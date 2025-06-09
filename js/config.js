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

// Ender 3 specifications
var ENDER3_CONFIG = {
    // Ender 3 build volume in mm
    width: 220,   // X-axis
    height: 220,  // Y-axis
    depth: 250,   // Z-axis (not used for 2D)
    
    // Canvas dimensions in pixels
    canvasWidth: 800,
    canvasHeight: 600,
    
    // Calculate pixels per mm ratio
    get pixelsPerMm() {
        // Use the smaller ratio to ensure everything fits
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
    }
};
