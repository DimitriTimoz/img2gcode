/**
 * Enhanced Configuration and Global Variables
 * Contains all global variables, configuration objects, and constants with optimizations
 */

/**
 * Storage Keys Constants
 */
const STORAGE_KEYS = {
    PROJECTS: 'img2gcode_projects',
    CURRENT_PROJECT: 'img2gcode_current_project',
    CONFIG: 'img2gcode_config',
    LASER_CONFIG: 'laser_config'
};

// Legacy constants for backward compatibility
const CURRENT_PROJECT_KEY = STORAGE_KEYS.CURRENT_PROJECT;

/**
 * Application Configuration Constants
 */
const APP_CONFIG = {
    VERSION: '2.0.0',
    BUILD_DATE: '2025-06-10',
    MIN_ZOOM: 0.05,
    MAX_ZOOM: 10,
    ZOOM_STEP: 0.1,
    DEFAULT_ZOOM: 1,
    
    // Performance settings
    CANVAS_RENDER_THROTTLE: 16, // ~60fps
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    MAX_UNDO_STEPS: 50,
    
    // Storage configuration
    STORAGE_QUOTA_WARNING: 0.8, // Warn at 80% quota usage
    MAX_PROJECT_SIZE: 5 * 1024 * 1024, // 5MB per project
    
    // Validation limits
    MAX_WORKSPACE_SIZE: 500, // 50cm maximum
    MIN_WORKSPACE_SIZE: 10,  // 1cm minimum
    MAX_OBJECTS_COUNT: 1000,
    
    // UI constants
    NOTIFICATION_DURATION: 3000,
    TOOLTIP_DELAY: 500,
    ANIMATION_DURATION: 300
};

/**
 * Global Application State
 */
let AppGlobalState = {
    // Core canvas instance
    canvas: null,
    
    // Loaded fonts tracking with optimization
    loadedFonts: new Set(),
    fontsLoading: new Set(),
    fontCache: new Map(),
    
    // Zoom state with validation
    _currentZoom: APP_CONFIG.DEFAULT_ZOOM,
    get currentZoom() { return this._currentZoom; },
    set currentZoom(value) {
        const clampedValue = Math.max(APP_CONFIG.MIN_ZOOM, 
                            Math.min(APP_CONFIG.MAX_ZOOM, value));
        this._currentZoom = clampedValue;
    },
    
    // Project state with validation
    _currentProjectName: 'Nouveau Projet',
    get currentProjectName() { return this._currentProjectName; },
    set currentProjectName(value) {
        this._currentProjectName = (value || 'Nouveau Projet').trim();
    },
    
    // Performance tracking
    performanceStats: {
        lastRenderTime: 0,
        renderCount: 0,
        avgRenderTime: 0,
        lastSaveTime: 0,
        totalSaveTime: 0
    },
    
    // Feature flags
    features: {
        debugMode: false,
        performanceMonitoring: true,
        advancedValidation: true,
        autoSave: true
    }
};

// Export global references for compatibility
var canvas = AppGlobalState.canvas;
var loadedFonts = AppGlobalState.loadedFonts;
var currentZoom = AppGlobalState.currentZoom;
var minZoom = APP_CONFIG.MIN_ZOOM;
var maxZoom = APP_CONFIG.MAX_ZOOM;
var zoomStep = APP_CONFIG.ZOOM_STEP;
var currentProjectName = AppGlobalState.currentProjectName;

/**
 * Enhanced Storage Configuration with Validation
 */
const STORAGE_CONFIG = {
    // Storage keys with versioning
    PROJECTS: 'img2gcode_projects_v2',
    CURRENT_PROJECT: 'img2gcode_current_project_v2',
    USER_PREFERENCES: 'img2gcode_preferences_v2',
    MACHINE_PROFILES: 'img2gcode_machine_profiles_v2',
    APP_STATE: 'img2gcode_app_state_v2',
    
    // Legacy keys for migration
    LEGACY_PROJECTS: 'img2gcode_projects',
    LEGACY_CURRENT: 'img2gcode_current_project',
    
    // Storage management
    migrate: function() {
        try {
            // Migrate legacy data if exists
            const legacyProjects = localStorage.getItem(this.LEGACY_PROJECTS);
            const legacyCurrent = localStorage.getItem(this.LEGACY_CURRENT);
            
            if (legacyProjects && !localStorage.getItem(this.PROJECTS)) {
                localStorage.setItem(this.PROJECTS, legacyProjects);
                console.log('Migrated legacy projects data');
            }
            
            if (legacyCurrent && !localStorage.getItem(this.CURRENT_PROJECT)) {
                localStorage.setItem(this.CURRENT_PROJECT, legacyCurrent);
                console.log('Migrated legacy current project data');
            }
        } catch (error) {
            console.warn('Storage migration failed:', error);
        }
    },
    
    getUsage: function() {
        let totalSize = 0;
        let appSize = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length + key.length;
                totalSize += size;
                
                if (key.startsWith('img2gcode_')) {
                    appSize += size;
                }
            }
        }
        
        return {
            totalBytes: totalSize,
            appBytes: appSize,
            totalMB: (totalSize / 1024 / 1024).toFixed(2),
            appMB: (appSize / 1024 / 1024).toFixed(2),
            percentage: totalSize > 0 ? (appSize / totalSize * 100).toFixed(1) : 0
        };
    }
};

// Initialize storage migration
STORAGE_CONFIG.migrate();

/**
 * Enhanced Workspace Configuration with Advanced Features
 */
const WORKSPACE_CONFIG = {
    // Workspace size constraints with validation
    DEFAULT_WIDTH: 100,
    DEFAULT_HEIGHT: 100,
    MIN_WIDTH: 10,
    MIN_HEIGHT: 10,
    MAX_WIDTH: 500,
    MAX_HEIGHT: 500,
    
    // Canvas rendering configuration
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    RENDER_QUALITY: 2, // Retina support
    
    // Current workspace dimensions with validation
    _width: 100,
    _height: 100,
    
    get width() { return this._width; },
    set width(value) {
        const validatedValue = Math.max(this.MIN_WIDTH, 
                                Math.min(this.MAX_WIDTH, Number(value) || this.DEFAULT_WIDTH));
        this._width = validatedValue;
        this.onDimensionChange();
    },
    
    get height() { return this._height; },
    set height(value) {
        const validatedValue = Math.max(this.MIN_HEIGHT, 
                                Math.min(this.MAX_HEIGHT, Number(value) || this.DEFAULT_HEIGHT));
        this._height = validatedValue;
        this.onDimensionChange();
    },
    
    // Cached calculations for performance
    _pixelsPerMm: null,
    _usableArea: null,
    
    // Calculate pixels per mm ratio with caching
    get pixelsPerMm() {
        if (this._pixelsPerMm === null) {
            const ratioX = this.CANVAS_WIDTH / this._width;
            const ratioY = this.CANVAS_HEIGHT / this._height; 
            this._pixelsPerMm = Math.min(ratioX, ratioY);
        }
        return this._pixelsPerMm;
    },
    
    // Get canvas dimensions
    get canvasWidth() { return this.CANVAS_WIDTH; },
    get canvasHeight() { return this.CANVAS_HEIGHT; },
    
    // Dimension change handler to invalidate cache
    onDimensionChange: function() {
        this._pixelsPerMm = null;
        this._usableArea = null;
        
        // Dispatch event for other modules
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workspaceDimensionChanged', {
                detail: { width: this._width, height: this._height }
            }));
        }
    },
    
    // Enhanced conversion methods with validation
    mmToPixels: function(mm) {
        const numMm = Number(mm);
        if (isNaN(numMm)) {
            console.warn('Invalid mm value for conversion:', mm);
            return 0;
        }
        return numMm * this.pixelsPerMm;
    },
    
    pixelsToMm: function(pixels) {
        const numPixels = Number(pixels);
        if (isNaN(numPixels)) {
            console.warn('Invalid pixel value for conversion:', pixels);
            return 0;
        }
        return numPixels / this.pixelsPerMm;
    },
    
    // Get usable area with caching
    get usableArea() {
        if (this._usableArea === null) {
            const usableWidth = this.mmToPixels(this._width);
            const usableHeight = this.mmToPixels(this._height);
            const offsetX = 50; // Margin from canvas edge
            const offsetY = this.CANVAS_HEIGHT - usableHeight - 50;
            
            this._usableArea = {
                width: usableWidth,
                height: usableHeight,
                offsetX: offsetX,
                offsetY: offsetY,
                centerX: offsetX + usableWidth / 2,
                centerY: offsetY + usableHeight / 2
            };
        }
        return this._usableArea;
    },
    
    // Workspace validation methods
    isValidDimension: function(width, height) {
        const w = Number(width);
        const h = Number(height);
        return !isNaN(w) && !isNaN(h) && 
               w >= this.MIN_WIDTH && w <= this.MAX_WIDTH &&
               h >= this.MIN_HEIGHT && h <= this.MAX_HEIGHT;
    },
    
    // Get workspace info for display
    getInfo: function() {
        return {
            dimensions: `${this._width}×${this._height}mm`,
            pixelsPerMm: this.pixelsPerMm.toFixed(2),
            canvasSize: `${this.CANVAS_WIDTH}×${this.CANVAS_HEIGHT}px`,
            usableArea: this.usableArea,
            aspectRatio: (this._width / this._height).toFixed(2)
        };
    },
    
    // Preset workspace sizes
    presets: {
        'small': { width: 50, height: 50, name: 'Petit (5×5cm)' },
        'medium': { width: 100, height: 100, name: 'Moyen (10×10cm)' },
        'large': { width: 200, height: 200, name: 'Grand (20×20cm)' },
        'ender3': { width: 220, height: 220, name: 'Ender 3 (22×22cm)' },
        'custom': { width: 100, height: 100, name: 'Personnalisé' }
    },
    
    // Apply preset
    applyPreset: function(presetName) {
        const preset = this.presets[presetName];
        if (preset) {
            this.width = preset.width;
            this.height = preset.height;
            console.log(`Applied workspace preset: ${preset.name}`);
            return true;
        }
        return false;
    }
};

/**
 * Initialize workspace with saved preferences
 */
WORKSPACE_CONFIG.init = function() {
    try {
        const saved = localStorage.getItem(STORAGE_CONFIG.USER_PREFERENCES);
        if (saved) {
            const prefs = JSON.parse(saved);
            if (prefs.workspace) {
                if (this.isValidDimension(prefs.workspace.width, prefs.workspace.height)) {
                    this.width = prefs.workspace.width;
                    this.height = prefs.workspace.height;
                    console.log('Loaded workspace preferences:', prefs.workspace);
                }
            }
        }
    } catch (error) {
        console.warn('Could not load workspace preferences:', error);
    }
};

/**
 * Save workspace preferences
 */
WORKSPACE_CONFIG.savePreferences = function() {
    try {
        let prefs = {};
        try {
            const saved = localStorage.getItem(STORAGE_CONFIG.USER_PREFERENCES);
            if (saved) prefs = JSON.parse(saved);
        } catch (e) {}
        
        prefs.workspace = {
            width: this._width,
            height: this._height
        };
        
        localStorage.setItem(STORAGE_CONFIG.USER_PREFERENCES, JSON.stringify(prefs));
    } catch (error) {
        console.warn('Could not save workspace preferences:', error);
    }
};

// Initialize workspace configuration
WORKSPACE_CONFIG.init();

/**
 * Enhanced Utility Functions for Application
 */
const AppUtils = {
    // ID generation for objects
    generateId: function(prefix = 'obj') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Safe JSON parsing
    safeJsonParse: function(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parse failed:', error);
            return fallback;
        }
    },
    
    // Safe JSON stringifying
    safeJsonStringify: function(obj, fallback = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.warn('JSON stringify failed:', error);
            return fallback;
        }
    },
    
    // Clamp values within range
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // Format file size
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Format time duration
    formatDuration: function(ms) {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        return `${(ms / 60000).toFixed(2)}min`;
    },
    
    // Deep clone object
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const cloned = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    },
    
    // Throttle function calls
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    
    // Check if device supports touch
    isTouchDevice: function() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    // Get browser info
    getBrowserInfo: function() {
        const ua = navigator.userAgent;
        const browsers = {
            chrome: /chrome/i.test(ua),
            firefox: /firefox/i.test(ua),
            safari: /safari/i.test(ua) && !/chrome/i.test(ua),
            edge: /edge/i.test(ua),
            ie: /msie|trident/i.test(ua)
        };
        
        return {
            ...browsers,
            mobile: this.isTouchDevice(),
            userAgent: ua
        };
    }
};

/**
 * Event system for inter-module communication
 */
const AppEvents = {
    listeners: new Map(),
    
    on: function(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    },
    
    off: function(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    },
    
    emit: function(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    },
    
    once: function(event, callback) {
        const wrappedCallback = (data) => {
            callback(data);
            this.off(event, wrappedCallback);
        };
        this.on(event, wrappedCallback);
    }
};

// Initialize configuration system
console.log(`🚀 Config System Initialized - Version ${APP_CONFIG.VERSION}`);

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APP_CONFIG,
        STORAGE_CONFIG,
        WORKSPACE_CONFIG,
        AppUtils,
        AppEvents,
        AppGlobalState
    };
}
