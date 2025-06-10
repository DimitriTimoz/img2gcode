/**
 * Main Application File
 * Handles application initialization and coordination between modules
 */

/**
 * Application state and performance monitoring
 */
const AppState = {
    isInitialized: false,
    isInitializing: false,
    initStartTime: null,
    lastSaveTime: null,
    errorCount: 0,
    performanceMetrics: {
        initTime: 0,
        canvasRenderTime: 0,
        lastRenderTime: 0
    }
};

/**
 * Enhanced error handling utility
 */
const ErrorHandler = {
    log: function(error, context = '') {
        AppState.errorCount++;
        console.error(`[${context}] Error:`, error);
        
        // Store error for debugging
        if (!window.appErrors) window.appErrors = [];
        window.appErrors.push({
            timestamp: new Date().toISOString(),
            context,
            error: error.toString(),
            stack: error.stack
        });
        
        // Keep only last 50 errors
        if (window.appErrors.length > 50) {
            window.appErrors = window.appErrors.slice(-50);
        }
    },
    
    handleAsync: function(promise, context = '') {
        return promise.catch(error => {
            this.log(error, context);
            throw error;
        });
    }
};

/**
 * Performance monitoring utility
 */
const PerformanceMonitor = {
    startTimer: function(name) {
        this.timers = this.timers || {};
        this.timers[name] = performance.now();
    },
    
    endTimer: function(name) {
        if (!this.timers || !this.timers[name]) return 0;
        const duration = performance.now() - this.timers[name];
        delete this.timers[name];
        return duration;
    },
    
    measureAsync: async function(fn, name) {
        this.startTimer(name);
        try {
            const result = await fn();
            const duration = this.endTimer(name);
            console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            this.endTimer(name);
            throw error;
        }
    }
};

/**
 * Initialize the application with enhanced error handling and performance monitoring
 */
async function initApp() {
    if (AppState.isInitialized || AppState.isInitializing) {
        console.warn('Application already initialized or initializing');
        return;
    }

    AppState.isInitializing = true;
    AppState.initStartTime = performance.now();
    
    try {
        // Initialize canvas with enhanced configuration
        await initializeCanvas();
        
        // Set up workspace with validation
        await PerformanceMonitor.measureAsync(
            () => setupWorkspaceArea(),
            'workspace-setup'
        );
        
        // Add grid overlay with performance optimization
        await PerformanceMonitor.measureAsync(
            () => addGridOverlay(),
            'grid-overlay'
        );
        
        // Set up event listeners with debouncing
        await setupEventListeners();
        
        // Set up keyboard shortcuts with conflict detection
        await setupKeyboardShortcuts();
        
        // Initialize UI components
        await initializeUIComponents();
        
        // Load saved state
        await loadApplicationState();
        
        // Finalize initialization
        finalizeInitialization();
        
    } catch (error) {
        ErrorHandler.log(error, 'app-initialization');
        showInitializationError(error);
    } finally {
        AppState.isInitializing = false;
    }
}

/**
 * Initialize canvas with enhanced configuration
 */
async function initializeCanvas() {
    try {
        canvas = new fabric.Canvas('c', {
            selection: true,
            preserveObjectStacking: true,
            renderOnAddRemove: true,
            skipTargetFind: false,
            allowTouchScrolling: false,
            imageSmoothingEnabled: true,
            enableRetinaScaling: true,
            backgroundColor: 'white'
        });
        
        // Enhanced canvas event handling
        canvas.on('after:render', () => {
            AppState.performanceMetrics.lastRenderTime = performance.now();
        });
        
        console.log('Canvas initialized successfully');
    } catch (error) {
        throw new Error(`Canvas initialization failed: ${error.message}`);
    }
}

/**
 * Initialize UI components with validation
 */
async function initializeUIComponents() {
    const components = [
        { fn: updateDimensionInfo, name: 'dimension-info' },
        { fn: updateZoomDisplay, name: 'zoom-display' },
        { fn: () => typeof updateCanvasTitle === 'function' && updateCanvasTitle(), name: 'canvas-title' },
        { fn: () => typeof initializeSimplifiedConfig === 'function' && initializeSimplifiedConfig(), name: 'laser-config' }
    ];
    
    for (const component of components) {
        try {
            await PerformanceMonitor.measureAsync(
                component.fn,
                component.name
            );
        } catch (error) {
            ErrorHandler.log(error, `ui-component-${component.name}`);
        }
    }
}

/**
 * Load application state with error recovery
 */
async function loadApplicationState() {
    try {
        // Check for saved projects with validation
        await ErrorHandler.handleAsync(
            Promise.resolve(checkForSavedProjects()),
            'load-projects'
        );
        
        // Enable auto-save with conflict resolution
        await ErrorHandler.handleAsync(
            Promise.resolve(enableAutoSave()),
            'enable-autosave'
        );
        
    } catch (error) {
        console.warn('Some application state could not be loaded:', error.message);
    }
}

/**
 * Finalize initialization and report status
 */
function finalizeInitialization() {
    AppState.performanceMetrics.initTime = performance.now() - AppState.initStartTime;
    AppState.isInitialized = true;
    
    // Log success with performance metrics
    console.log('✅ Application initialized successfully');
    console.log(`📊 Performance Metrics:`, {
        initTime: `${AppState.performanceMetrics.initTime.toFixed(2)}ms`,
        workspace: `${WORKSPACE_CONFIG.width}x${WORKSPACE_CONFIG.height}mm`,
        pixelsPerMm: WORKSPACE_CONFIG.pixelsPerMm.toFixed(2),
        errorCount: AppState.errorCount
    });
    
    console.log('📋 Application Info:');
    console.log(`   Workspace: ${WORKSPACE_CONFIG.width}x${WORKSPACE_CONFIG.height}mm`);
    console.log(`   Resolution: ${WORKSPACE_CONFIG.pixelsPerMm.toFixed(2)} pixels/mm`);
    console.log(`   Origin: Current printer position (no homing required)`);
    console.log(`   Controls: Mouse wheel, Ctrl+/-, or buttons for zoom`);
    
    // Dispatch custom event for other modules
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appInitialized', {
            detail: { performanceMetrics: AppState.performanceMetrics }
        }));
    }
}

/**
 * Show initialization error with recovery options
 */
function showInitializationError(error) {
    const errorMessage = `
        Application initialization failed: ${error.message}
        
        Please try:
        1. Refreshing the page
        2. Clearing browser cache
        3. Checking browser console for details
        
        If the problem persists, please report this issue.
    `;
    
    console.error('Initialization failed:', error);
    
    // Try to show user-friendly error
    try {
        if (typeof alert !== 'undefined') {
            alert(errorMessage);
        }
    } catch (e) {
        console.error('Could not display error message:', e);
    }
}

/**
 * Enhanced collapsible sections management
 */
const SectionManager = {
    sections: new Map(),
    
    register: function(sectionId) {
        if (!this.sections.has(sectionId)) {
            this.sections.set(sectionId, {
                isCollapsed: false,
                animating: false
            });
        }
    },
    
    toggle: function(sectionId) {
        this.register(sectionId);
        const state = this.sections.get(sectionId);
        
        if (state.animating) return; // Prevent multiple animations
        
        const section = document.getElementById(sectionId);
        const header = section?.previousElementSibling;
        const toggleIcon = header?.querySelector('.toggle-icon');
        
        if (!section || !header || !toggleIcon) {
            console.warn(`Section elements not found for: ${sectionId}`);
            return;
        }
        
        state.animating = true;
        
        if (section.classList.contains('collapsed')) {
            this.expand(section, toggleIcon, state);
        } else {
            this.collapse(section, toggleIcon, state);
        }
    },
    
    expand: function(section, toggleIcon, state) {
        section.style.maxHeight = section.scrollHeight + 'px';
        section.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
        state.isCollapsed = false;
        
        setTimeout(() => {
            section.style.maxHeight = '';
            state.animating = false;
        }, 300);
    },
    
    collapse: function(section, toggleIcon, state) {
        section.style.maxHeight = section.scrollHeight + 'px';
        section.offsetHeight; // Force reflow
        section.style.maxHeight = '0';
        section.classList.add('collapsed');
        toggleIcon.textContent = '▶';
        state.isCollapsed = true;
        
        setTimeout(() => {
            state.animating = false;
        }, 300);
    }
};

// Enhanced toggle function with better error handling
function toggleSection(sectionId) {
    try {
        SectionManager.toggle(sectionId);
    } catch (error) {
        ErrorHandler.log(error, 'toggle-section');
    }
}

/**
 * Enhanced modal management system
 */
const ModalManager = {
    activeModals: new Set(),
    
    open: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal not found: ${modalId}`);
            return false;
        }
        
        this.activeModals.add(modalId);
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        // Focus management for accessibility
        const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
        
        return true;
    },
    
    close: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        this.activeModals.delete(modalId);
        modal.style.display = 'none';
        
        if (this.activeModals.size === 0) {
            document.body.classList.remove('modal-open');
        }
        
        return true;
    },
    
    closeAll: function() {
        this.activeModals.forEach(modalId => this.close(modalId));
    },
    
    handleOutsideClick: function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            this.close(modalId);
        }
    }
};

// Enhanced initialization with better error handling and performance
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize with performance monitoring
        await PerformanceMonitor.measureAsync(
            () => initApp(),
            'full-app-initialization'
        );
        
        // Set up modal handling with better event management
        setupModalHandling();
        
        // Set up global error handling
        setupGlobalErrorHandling();
        
    } catch (error) {
        ErrorHandler.log(error, 'dom-content-loaded');
        console.error('Failed to initialize application:', error);
    }
});

/**
 * Setup modal handling with improved UX
 */
function setupModalHandling() {
    // Handle clicks outside modals
    window.addEventListener('click', function(event) {
        ModalManager.handleOutsideClick(event);
        
        // Legacy support for project modal
        if (event.target.id === 'projectModal') {
            closeProjectManager();
        }
    });
    
    // Handle escape key for modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && ModalManager.activeModals.size > 0) {
            ModalManager.closeAll();
            if (typeof closeProjectManager === 'function') {
                closeProjectManager();
            }
        }
    });
}

/**
 * Setup global error handling
 */
function setupGlobalErrorHandling() {
    window.addEventListener('error', function(event) {
        ErrorHandler.log(event.error || new Error(event.message), 'global-error');
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        ErrorHandler.log(event.reason, 'unhandled-promise-rejection');
    });
}

/**
 * Enhanced Machine Profile Management System
 */
const MachineProfileManager = {
    profiles: new Map(),
    currentProfile: null,
    
    /**
     * Initialize profile manager
     */
    init: function() {
        this.loadProfiles();
        this.loadCurrentProfile();
    },
    
    /**
     * Load profiles from storage with error handling
     */
    loadProfiles: function() {
        try {
            const saved = localStorage.getItem('machineProfiles');
            if (saved) {
                const profiles = JSON.parse(saved);
                Object.entries(profiles).forEach(([key, profile]) => {
                    this.profiles.set(key, this.validateProfile(profile));
                });
            }
        } catch (error) {
            ErrorHandler.log(error, 'load-machine-profiles');
        }
    },
    
    /**
     * Validate profile structure
     */
    validateProfile: function(profile) {
        const defaults = {
            name: 'Unnamed Profile',
            key: 'unknown',
            settings: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        return { ...defaults, ...profile };
    },
    
    /**
     * Save profile with validation
     */
    saveProfile: function(key, name, settings = {}) {
        if (!key || !name) {
            throw new Error('Profile key and name are required');
        }
        
        const sanitizedKey = this.sanitizeKey(key);
        const profile = {
            name: name.trim(),
            key: sanitizedKey,
            settings,
            created: this.profiles.has(sanitizedKey) ? 
                this.profiles.get(sanitizedKey).created : new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        this.profiles.set(sanitizedKey, profile);
        this.persistProfiles();
        this.updateDropdown();
        
        return sanitizedKey;
    },
    
    /**
     * Sanitize profile key
     */
    sanitizeKey: function(key) {
        return key.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
    },
    
    /**
     * Persist profiles to storage
     */
    persistProfiles: function() {
        try {
            const profilesObj = Object.fromEntries(this.profiles);
            localStorage.setItem('machineProfiles', JSON.stringify(profilesObj));
        } catch (error) {
            ErrorHandler.log(error, 'persist-machine-profiles');
        }
    },
    
    /**
     * Update dropdown with current profiles
     */
    updateDropdown: function() {
        const select = document.getElementById('machineProfile');
        if (!select) return;
        
        // Clear existing custom options
        const options = Array.from(select.querySelectorAll('option'));
        options.forEach(option => {
            if (!option.value.startsWith('ender3_')) {
                option.remove();
            }
        });
        
        // Add saved profiles
        this.profiles.forEach((profile, key) => {
            if (!key.startsWith('ender3_')) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = profile.name;
                option.title = `Created: ${new Date(profile.created).toLocaleDateString()}`;
                select.appendChild(option);
            }
        });
        
        // Set current selection
        if (this.currentProfile) {
            select.value = this.currentProfile;
        }
    },
    
    /**
     * Load current profile
     */
    loadCurrentProfile: function() {
        try {
            this.currentProfile = localStorage.getItem('currentMachineProfile') || null;
        } catch (error) {
            ErrorHandler.log(error, 'load-current-profile');
        }
    },
    
    /**
     * Set current profile
     */
    setCurrentProfile: function(key) {
        if (this.profiles.has(key)) {
            this.currentProfile = key;
            localStorage.setItem('currentMachineProfile', key);
            return true;
        }
        return false;
    }
};

/**
 * Enhanced machine profile dialog functions
 */
function showMachineProfileDialog() {
    try {
        ModalManager.open('machineProfileModal');
        
        const nameInput = document.getElementById('profileName');
        const keyInput = document.getElementById('profileKey');
        
        if (nameInput && keyInput) {
            nameInput.value = '';
            keyInput.value = '';
            nameInput.focus();
        }
    } catch (error) {
        ErrorHandler.log(error, 'show-machine-profile-dialog');
    }
}

function closeMachineProfileDialog() {
    ModalManager.close('machineProfileModal');
}

/**
 * Enhanced profile saving with better validation and UX
 */
function saveMachineProfileFromDialog() {
    try {
        const nameInput = document.getElementById('profileName');
        const keyInput = document.getElementById('profileKey');
        
        if (!nameInput || !keyInput) {
            throw new Error('Required form elements not found');
        }
        
        const name = nameInput.value.trim();
        const key = keyInput.value.trim();
        
        // Validation
        if (!name) {
            showValidationError('Le nom du profil est requis');
            nameInput.focus();
            return;
        }
        
        if (!key) {
            showValidationError('La clé du profil est requise');
            keyInput.focus();
            return;
        }
        
        // Check for existing profile
        if (MachineProfileManager.profiles.has(key)) {
            if (!confirm(`Un profil avec la clé "${key}" existe déjà. Voulez-vous l'écraser ?`)) {
                return;
            }
        }
        
        // Save profile
        const savedKey = MachineProfileManager.saveProfile(key, name);
        MachineProfileManager.setCurrentProfile(savedKey);
        
        // Update UI
        if (typeof LASER_CONFIG !== 'undefined') {
            LASER_CONFIG.currentMachineProfile = savedKey;
        }
        
        // Show success
        showStatusMessage('Profil machine sauvegardé avec succès!', 'success');
        closeMachineProfileDialog();
        
    } catch (error) {
        ErrorHandler.log(error, 'save-machine-profile');
        showValidationError(`Erreur lors de la sauvegarde: ${error.message}`);
    }
}

/**
 * Enhanced profile key auto-generation with better UX
 */
function updateProfileKey() {
    try {
        const nameInput = document.getElementById('profileName');
        const keyInput = document.getElementById('profileKey');
        
        if (!nameInput || !keyInput || !nameInput.value) return;
        
        const generatedKey = MachineProfileManager.sanitizeKey(nameInput.value);
        keyInput.value = generatedKey;
        
        // Visual feedback if key is taken
        const existsWarning = document.getElementById('keyExistsWarning');
        if (existsWarning) {
            if (MachineProfileManager.profiles.has(generatedKey)) {
                existsWarning.textContent = 'Cette clé existe déjà et sera écrasée';
                existsWarning.style.display = 'block';
            } else {
                existsWarning.style.display = 'none';
            }
        }
        
    } catch (error) {
        ErrorHandler.log(error, 'update-profile-key');
    }
}

/**
 * Utility functions for better UX
 */
function showValidationError(message) {
    const errorElement = document.getElementById('profileError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showStatusMessage(message, type = 'info') {
    const statusElement = document.getElementById('laserStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 3000);
    }
    
    console.log(`Status [${type}]: ${message}`);
}

/**
 * Enhanced event listener setup with better performance
 */
function setupEnhancedEventListeners() {
    // Debounced event handlers for better performance
    const debouncedHandlers = {
        profileNameInput: debounce(updateProfileKey, 300),
        windowResize: debounce(() => {
            if (canvas && typeof fitToWindow === 'function') {
                fitToWindow();
            }
        }, 250)
    };
    
    // Profile name input with debouncing  
    const profileNameInput = document.getElementById('profileName');
    if (profileNameInput) {
        profileNameInput.addEventListener('input', debouncedHandlers.profileNameInput);
    }
    
    // Window resize handling
    window.addEventListener('resize', debouncedHandlers.windowResize);
    
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + S to save project
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (typeof saveCurrentProject === 'function') {
                saveCurrentProject();
            }
        }
        
        // Ctrl/Cmd + O to open project
        if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
            event.preventDefault();
            if (typeof showProjectManager === 'function') {
                showProjectManager();
            }
        }
        
        // Ctrl/Cmd + N for new project
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            if (typeof newProject === 'function') {
                newProject();
            }
        }
    });
}

/**
 * Debounce utility for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Enhanced machine profile loading with error recovery
 */
function loadMachineProfilesIntoDropdown() {
    try {
        MachineProfileManager.updateDropdown();
    } catch (error) {
        ErrorHandler.log(error, 'load-machine-profiles-dropdown');
        console.warn('Could not load machine profiles into dropdown');
    }
}

/**
 * Enhanced configuration initialization with dependency checking
 */
function initializeEnhancedConfig() {
    try {
        // Initialize machine profile manager
        MachineProfileManager.init();
        
        // Load machine profiles with fallback
        loadMachineProfilesIntoDropdown();
        
        // Update UI from current config with validation
        if (typeof updateUIFromConfig === 'function') {
            updateUIFromConfig();
        } else {
            console.warn('updateUIFromConfig function not available');
        }
        
        console.log('✅ Enhanced configuration system initialized');
        
    } catch (error) {
        ErrorHandler.log(error, 'initialize-enhanced-config');
        console.warn('Enhanced configuration initialization failed, using fallback');
    }
}

/**
 * Application health check and diagnostics
 */
const AppDiagnostics = {
    run: function() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            appState: AppState,
            canvasHealth: this.checkCanvasHealth(),
            storageHealth: this.checkStorageHealth(),
            performanceMetrics: AppState.performanceMetrics,
            errorCount: AppState.errorCount,
            memoryUsage: this.getMemoryUsage()
        };
        
        console.log('🔍 App Diagnostics:', diagnostics);
        return diagnostics;
    },
    
    checkCanvasHealth: function() {
        if (!canvas) return { status: 'error', message: 'Canvas not initialized' };
        
        try {
            const objectCount = canvas.getObjects().length;
            const canvasSize = {
                width: canvas.getWidth(),
                height: canvas.getHeight()
            };
            
            return {
                status: 'healthy',
                objectCount,
                canvasSize,
                zoom: canvas.getZoom()
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },
    
    checkStorageHealth: function() {
        try {
            const testKey = 'app_storage_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            const usage = this.getStorageUsage();
            return { status: 'healthy', usage };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },
    
    getStorageUsage: function() {
        if (!localStorage) return null;
        
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        return {
            totalBytes: totalSize,
            totalKB: (totalSize / 1024).toFixed(2),
            itemCount: Object.keys(localStorage).length
        };
    },
    
    getMemoryUsage: function() {
        if (performance.memory) {
            return {
                usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
                totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
                jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
            };
        }
        return null;
    }
};

// Enhanced initialization with better dependency management
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        setTimeout(async function() {
            try {
                // Initialize laser configuration if available
                if (typeof initializeLaserConfig === 'function') {
                    await ErrorHandler.handleAsync(
                        Promise.resolve(initializeLaserConfig()),
                        'laser-config-init'
                    );
                }
                
                // Initialize enhanced configuration
                await initializeEnhancedConfig();
                
                // Set up enhanced event listeners
                setupEnhancedEventListeners();
                
                // Run diagnostics in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    setTimeout(() => AppDiagnostics.run(), 2000);
                }
                
            } catch (error) {
                ErrorHandler.log(error, 'enhanced-window-load');
            }
        }, 200);
    });
    
    // Expose useful functions to global scope for debugging
    window.AppDiagnostics = AppDiagnostics;
    window.AppState = AppState;
    window.ErrorHandler = ErrorHandler;
    window.PerformanceMonitor = PerformanceMonitor;
}
