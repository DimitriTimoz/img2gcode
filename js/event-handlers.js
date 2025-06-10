/**
 * Enhanced Event Handlers Module
 * Handles all canvas events, keyboard shortcuts, and UI interactions with performance optimizations
 */

/**
 * Enhanced canvas event management with performance optimization
 */
const CanvasEventManager = {
    throttledHandlers: new Map(),
    
    init: function() {
        this.setupThrottledHandlers();
        this.setupCanvasEvents();
    },
    
    setupThrottledHandlers: function() {
        // Create throttled versions of frequent event handlers
        this.throttledHandlers.set('dimensionUpdate', 
            AppUtils.throttle(this.handleDimensionUpdate.bind(this), 100));
        this.throttledHandlers.set('zoomUpdate', 
            AppUtils.throttle(this.handleZoomUpdate.bind(this), 50));
        this.throttledHandlers.set('objectMoving', 
            AppUtils.throttle(this.handleObjectMoving.bind(this), 32)); // ~30fps
    },
    
    handleDimensionUpdate: function(target) {
        try {
            if (typeof displayObjectDimensions === 'function') {
                displayObjectDimensions(target);
            }
        } catch (error) {
            console.warn('Dimension update failed:', error);
        }
    },
    
    handleZoomUpdate: function() {
        try {
            AppGlobalState.currentZoom = canvas.getZoom();
            if (typeof updateZoomDisplay === 'function') {
                updateZoomDisplay();
            }
            if (typeof updateMeasurementIndicators === 'function') {
                updateMeasurementIndicators();
            }
        } catch (error) {
            console.warn('Zoom update failed:', error);
        }
    },
    
    handleObjectMoving: function(target) {
        try {
            this.throttledHandlers.get('dimensionUpdate')(target);
            
            // Check workspace bounds
            if (typeof checkBuildAreaConstraints === 'function') {
                checkBuildAreaConstraints(target);
            }
        } catch (error) {
            console.warn('Object moving handler failed:', error);
        }
    }
};

/**
 * Enhanced canvas event setup with better error handling
 */
function setupCanvasEvents() {
    if (!canvas) {
        console.error('Canvas not available for event setup');
        return;
    }
    
    try {
        // Selection events with enhanced feedback
        canvas.on('selection:created', function(e) {
            const selectedObj = e.selected?.[0];
            if (selectedObj) {
                console.log('Object selected:', selectedObj.type);
                CanvasEventManager.handleDimensionUpdate(selectedObj);
                AppEvents.emit('objectSelected', { object: selectedObj });
            }
        });

        canvas.on('selection:cleared', function(e) {
            console.log('Selection cleared');
            try {
                if (typeof removeSizeIndicators === 'function') {
                    removeSizeIndicators();
                }
                
                const info = document.getElementById('objectInfo');
                if (info) {
                    info.innerHTML = '<em>Aucun objet sélectionné</em>';
                }
                
                AppEvents.emit('selectionCleared');
            } catch (error) {
                console.warn('Selection cleared handler failed:', error);
            }
        });

        canvas.on('selection:updated', function(e) {
            const selectedObj = e.selected?.[0];
            if (selectedObj) {
                console.log('Selection updated');
                CanvasEventManager.handleDimensionUpdate(selectedObj);
                AppEvents.emit('selectionUpdated', { object: selectedObj });
            }
        });

        // Enhanced object modification events with performance optimization
        canvas.on('object:modified', function(e) {
            if (e.target) {
                CanvasEventManager.handleDimensionUpdate(e.target);
                AppEvents.emit('objectModified', { object: e.target });
            }
        });

        canvas.on('object:moving', function(e) {
            if (e.target) {
                CanvasEventManager.handleObjectMoving(e.target);
            }
        });

        canvas.on('object:scaling', function(e) {
            if (e.target) {
                CanvasEventManager.throttledHandlers.get('dimensionUpdate')(e.target);
            }
        });

        canvas.on('object:rotating', function(e) {
            if (e.target) {
                CanvasEventManager.throttledHandlers.get('dimensionUpdate')(e.target);
            }
        });

        // Enhanced double-click for inline text editing
        canvas.on('mouse:dblclick', function(e) {
            try {
                if (e.target && e.target.type === 'text') {
                    if (typeof startInlineEditing === 'function') {
                        startInlineEditing(e.target);
                    }
                }
            } catch (error) {
                console.warn('Double-click handler failed:', error);
            }
        });

        // Enhanced mouse wheel zoom with better performance
        canvas.on('mouse:wheel', function(opt) {
            try {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                
                const delta = opt.e.deltaY;
                let zoom = canvas.getZoom();
                
                // Improved zoom calculation
                const zoomFactor = delta > 0 ? 0.9 : 1.1;
                zoom *= zoomFactor;
                
                // Clamp zoom values
                zoom = AppUtils.clamp(zoom, APP_CONFIG.MIN_ZOOM, APP_CONFIG.MAX_ZOOM);
                
                // Zoom to mouse position
                const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
                canvas.zoomToPoint(point, zoom);
                
                // Update zoom tracking with throttling
                CanvasEventManager.throttledHandlers.get('zoomUpdate')();
                
            } catch (error) {
                console.warn('Mouse wheel zoom failed:', error);
            }
        });
        
        // Enhanced panning with multiple input methods
        CanvasEventManager.setupPanningEvents();
        
        // Enhanced wheel events with passive handling
        CanvasEventManager.setupWheelEvents();
        
        // Canvas rendering performance monitoring
        canvas.on('after:render', function() {
            AppGlobalState.performanceStats.renderCount++;
            const now = performance.now();
            const renderTime = now - AppGlobalState.performanceStats.lastRenderTime;
            
            if (AppGlobalState.performanceStats.lastRenderTime > 0) {
                AppGlobalState.performanceStats.avgRenderTime = 
                    (AppGlobalState.performanceStats.avgRenderTime + renderTime) / 2;
            }
            AppGlobalState.performanceStats.lastRenderTime = now;
        });
        
        // Initialize canvas event manager
        CanvasEventManager.init();
        
        console.log('✅ Enhanced canvas events initialized');
        
    } catch (error) {
        console.error('Failed to setup canvas events:', error);
        throw error;
    }
}

/**
 * Enhanced panning system with multiple input methods
 */
CanvasEventManager.setupPanningEvents = function() {
    let isPanning = false;
    let lastPanPoint = null;
    
    canvas.on('mouse:down', function(opt) {
        const evt = opt.e;
        // Middle mouse button, Ctrl+drag, or Cmd+drag (macOS)
        if (evt.button === 1 || 
            (evt.ctrlKey && evt.button === 0) || 
            (evt.metaKey && evt.button === 0)) {
            
            isPanning = true;
            canvas.selection = false;
            canvas.discardActiveObject();
            lastPanPoint = new fabric.Point(evt.clientX, evt.clientY);
            canvas.setCursor('grab');
            evt.preventDefault();
            evt.stopPropagation();
        }
    });

    canvas.on('mouse:move', function(opt) {
        if (isPanning && lastPanPoint) {
            const evt = opt.e;
            const currentPoint = new fabric.Point(evt.clientX, evt.clientY);
            const deltaX = currentPoint.x - lastPanPoint.x;
            const deltaY = currentPoint.y - lastPanPoint.y;
            
            // Apply panning transformation
            const transform = canvas.viewportTransform.slice();
            transform[4] += deltaX;
            transform[5] += deltaY;
            canvas.setViewportTransform(transform);
            
            lastPanPoint = currentPoint;
            canvas.setCursor('grabbing');
        }
    });

    canvas.on('mouse:up', function(opt) {
        if (isPanning) {
            isPanning = false;
            canvas.selection = true;
            lastPanPoint = null;
            canvas.setCursor('default');
        }
    });
};

/**
 * Enhanced event listener management system
 */
const EventListenerManager = {
    listeners: new Map(),
    
    add: function(element, event, handler, options = {}) {
        const key = `${element.id || 'element'}_${event}`;
        
        // Remove existing listener if present
        if (this.listeners.has(key)) {
            const oldHandler = this.listeners.get(key);
            element.removeEventListener(event, oldHandler);
        }
        
        // Add enhanced error handling
        const wrappedHandler = (e) => {
            try {
                handler(e);
            } catch (error) {
                console.error(`Event handler error [${event}]:`, error);
            }
        };
        
        element.addEventListener(event, wrappedHandler, options);
        this.listeners.set(key, wrappedHandler);
    },
    
    remove: function(element, event) {
        const key = `${element.id || 'element'}_${event}`;
        if (this.listeners.has(key)) {
            const handler = this.listeners.get(key);
            element.removeEventListener(event, handler);
            this.listeners.delete(key);
        }
    },
    
    removeAll: function() {
        this.listeners.clear();
    }
};

/**
 * Enhanced event listeners setup with better error handling
 */
function setupEventListeners() {
    try {
        // Image loader with validation
        const imgLoader = document.getElementById('imgLoader');
        if (imgLoader && typeof handleImageLoad === 'function') {
            EventListenerManager.add(imgLoader, 'change', handleImageLoad);
        }
        
        // Font loader with validation
        const fontLoader = document.getElementById('fontLoader');
        if (fontLoader && typeof handleFontLoad === 'function') {
            EventListenerManager.add(fontLoader, 'change', handleFontLoad);
        }
        
        // Font selector with validation
        const fontSelect = document.getElementById('fontSelect');
        if (fontSelect && typeof handleFontChange === 'function') {
            EventListenerManager.add(fontSelect, 'change', handleFontChange);
        }
        
        // Enhanced keyboard shortcuts
        EventListenerManager.add(document, 'keydown', handleEnhancedKeyboardShortcuts);
        
        // Canvas events
        setupCanvasEvents();
        
        // Window events with throttling
        EventListenerManager.add(window, 'resize', 
            AppUtils.throttle(handleWindowResize, 250));
        
        EventListenerManager.add(window, 'beforeunload', handleBeforeUnload);
        
        console.log('✅ Enhanced event listeners initialized');
        
    } catch (error) {
        console.error('Failed to setup event listeners:', error);
    }
}

/**
 * Enhanced window resize handler
 */
function handleWindowResize() {
    try {
        if (canvas) {
            // Update canvas dimensions if needed
            const canvasContainer = canvas.getElement().parentElement;
            if (canvasContainer) {
                // Adjust canvas to container size
                const containerRect = canvasContainer.getBoundingClientRect();
                canvas.setDimensions({
                    width: containerRect.width,
                    height: containerRect.height
                });
                
                // Re-fit workspace if fitToWindow function exists
                if (typeof fitToWindow === 'function') {
                    fitToWindow();
                }
            }
        }
    } catch (error) {
        console.warn('Window resize handling failed:', error);
    }
}

/**
 * Enhanced before unload handler for auto-save
 */
function handleBeforeUnload(event) {
    try {
        // Save current project state if auto-save is enabled
        if (AppGlobalState.features.autoSave && typeof saveCurrentProject === 'function') {
            saveCurrentProject();
        }
        
        // Check for unsaved changes
        const hasUnsavedChanges = checkForUnsavedChanges();
        if (hasUnsavedChanges) {
            const message = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
            event.returnValue = message;
            return message;
        }
    } catch (error) {
        console.warn('Before unload handling failed:', error);
    }
}

/**
 * Check for unsaved changes
 */
function checkForUnsavedChanges() {
    try {
        // Simple check - could be enhanced with more sophisticated tracking
        const lastSaveTime = AppGlobalState.performanceStats.lastSaveTime;
        const lastModifyTime = AppGlobalState.performanceStats.lastRenderTime;
        
        return lastModifyTime > lastSaveTime;
    } catch (error) {
        return false;
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Canvas events
    setupCanvasEvents();
}

/**mdr
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
        e.preventDefault();
        removeSelected();
    }
    
    // Zoom shortcuts
    if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            zoomIn();
        } else if (e.key === '-') {
            e.preventDefault();
            zoomOut();
        } else if (e.key === '0') {
            e.preventDefault();
            resetZoom();
        }
    }
}

/**
 * Toggle accordion sections in the settings panel
 */
function toggleAccordion(accordionId) {
    const content = document.getElementById(accordionId);
    if (!content) return;
    
    const header = content.previousElementSibling;
    if (!header) return;
    
    const toggle = header.querySelector('.accordion-toggle');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        if (toggle) {
            toggle.textContent = '▼';
            toggle.style.transform = 'rotate(0deg)';
        }
    } else {
        content.classList.add('collapsed');
        if (toggle) {
            toggle.textContent = '▶';
            toggle.style.transform = 'rotate(-90deg)';
        }
    }
}

/**
 * Enhanced keyboard shortcuts with better conflict detection and platform support
 */
const KeyboardShortcutManager = {
    shortcuts: new Map(),
    activeKeys: new Set(),
    
    register: function(key, callback, description = '') {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.set(normalizedKey, { callback, description });
    },
    
    normalizeKey: function(key) {
        // Normalize key combinations for cross-platform compatibility
        return key.toLowerCase()
            .replace('cmd', 'meta')  // Mac Command key
            .replace('ctrl', 'control')
            .split('+')
            .sort()
            .join('+');
    },
    
    getKeyFromEvent: function(event) {
        const keys = [];
        
        if (event.ctrlKey) keys.push('control');
        if (event.metaKey) keys.push('meta');
        if (event.shiftKey) keys.push('shift');
        if (event.altKey) keys.push('alt');
        
        // Add the main key (convert to lowercase)
        const mainKey = event.key.toLowerCase();
        if (mainKey !== 'control' && mainKey !== 'meta' && 
            mainKey !== 'shift' && mainKey !== 'alt') {
            keys.push(mainKey);
        }
        
        return keys.sort().join('+');
    },
    
    handle: function(event) {
        const keyCombo = this.getKeyFromEvent(event);
        
        if (this.shortcuts.has(keyCombo)) {
            const shortcut = this.shortcuts.get(keyCombo);
            try {
                event.preventDefault();
                event.stopPropagation();
                shortcut.callback(event);
                return true;
            } catch (error) {
                console.error(`Keyboard shortcut error [${keyCombo}]:`, error);
            }
        }
        return false;
    },
    
    getHelp: function() {
        const help = [];
        this.shortcuts.forEach((shortcut, key) => {
            if (shortcut.description) {
                help.push({ key, description: shortcut.description });
            }
        });
        return help.sort((a, b) => a.key.localeCompare(b.key));
    }
};

/**
 * Enhanced keyboard shortcuts handler
 */
function handleEnhancedKeyboardShortcuts(event) {
    // Skip if user is typing in an input field
    if (isTypingInInput(event.target)) {
        return;
    }
    
    KeyboardShortcutManager.handle(event);
}

/**
 * Check if user is typing in an input element
 */
function isTypingInInput(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase()) ||
           element.contentEditable === 'true';
}

/**
 * Setup enhanced keyboard shortcuts with platform detection
 */
function setupKeyboardShortcuts() {
    try {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? 'meta' : 'control';
        
        // File operations
        KeyboardShortcutManager.register(`${modKey}+s`, () => {
            if (typeof saveCurrentProject === 'function') {
                saveCurrentProject();
            }
        }, 'Sauvegarder le projet');
        
        KeyboardShortcutManager.register(`${modKey}+o`, () => {
            if (typeof showProjectManager === 'function') {
                showProjectManager();
            }
        }, 'Ouvrir un projet');
        
        KeyboardShortcutManager.register(`${modKey}+n`, () => {
            if (typeof newProject === 'function') {
                newProject();
            }
        }, 'Nouveau projet');
        
        // Canvas operations
        KeyboardShortcutManager.register('delete', () => {
            if (typeof removeSelected === 'function') {
                removeSelected();
            }
        }, 'Supprimer l\'objet sélectionné');
        
        KeyboardShortcutManager.register('backspace', () => {
            if (typeof removeSelected === 'function') {
                removeSelected();
            }
        }, 'Supprimer l\'objet sélectionné');
        
        // Copy/Paste operations
        KeyboardShortcutManager.register(`${modKey}+c`, () => {
            if (typeof copyObject === 'function') {
                copyObject();
            }
        }, 'Copier l\'objet');
        
        KeyboardShortcutManager.register(`${modKey}+v`, () => {
            if (typeof pasteObject === 'function') {
                pasteObject();
            }
        }, 'Coller l\'objet');
        
        KeyboardShortcutManager.register(`${modKey}+d`, () => {
            if (typeof duplicateObject === 'function') {
                duplicateObject();
            }
        }, 'Dupliquer l\'objet');
        
        // Zoom operations
        KeyboardShortcutManager.register(`${modKey}+=`, () => {
            if (typeof zoomIn === 'function') {
                zoomIn();
            }
        }, 'Zoom avant');
        
        KeyboardShortcutManager.register(`${modKey}+-`, () => {
            if (typeof zoomOut === 'function') {
                zoomOut();
            }
        }, 'Zoom arrière');
        
        KeyboardShortcutManager.register(`${modKey}+0`, () => {
            if (typeof resetZoom === 'function') {
                resetZoom();
            }
        }, 'Réinitialiser le zoom');
        
        KeyboardShortcutManager.register(`${modKey}+shift+f`, () => {
            if (typeof fitToWindow === 'function') {
                fitToWindow();
            }
        }, 'Ajuster à la fenêtre');
        
        // Selection operations
        KeyboardShortcutManager.register(`${modKey}+a`, () => {
            if (canvas) {
                canvas.discardActiveObject();
                const objects = canvas.getObjects().filter(obj => !obj.excludeFromExport);
                const selection = new fabric.ActiveSelection(objects, {
                    canvas: canvas
                });
                canvas.setActiveObject(selection);
                canvas.requestRenderAll();
            }
        }, 'Sélectionner tout');
        
        // Help
        KeyboardShortcutManager.register('f1', () => {
            showKeyboardShortcuts();
        }, 'Afficher l\'aide');
        
        KeyboardShortcutManager.register('escape', () => {
            if (canvas) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
            ModalManager.closeAll();
        }, 'Annuler/Fermer');
        
        console.log('✅ Enhanced keyboard shortcuts initialized');
        
    } catch (error) {
        console.error('Failed to setup keyboard shortcuts:', error);
    }
}

/**
 * Show keyboard shortcuts overlay
 */
function showKeyboardShortcuts() {
    var existingOverlay = document.querySelector('.keyboard-shortcuts');
    if (existingOverlay) {
        existingOverlay.remove();
        return;
    }
    
    var overlay = document.createElement('div');
    overlay.className = 'keyboard-shortcuts show';
    overlay.innerHTML = `
        <h4>⌨️ Raccourcis Clavier</h4>
        <div class="shortcut">
            <span>Supprimer sélection</span>
            <span class="key">Delete</span>
        </div>
        <div class="shortcut">
            <span>Copier</span>
            <span class="key">⌘+C</span>
        </div>
        <div class="shortcut">
            <span>Coller</span>
            <span class="key">⌘+V</span>
        </div>
        <div class="shortcut">
            <span>Dupliquer</span>
            <span class="key">⌘+D</span>
        </div>
        <div class="shortcut">
            <span>Position précise</span>
            <span class="key">⌘+P</span>
        </div>
        <div class="shortcut">
            <span>Aimantation grille</span>
            <span class="key">⌘+G</span>
        </div>
        <div class="shortcut">
            <span>Règles mesure</span>
            <span class="key">⌘+R</span>
        </div>
        <div class="shortcut">
            <span>Déplacer (fin)</span>
            <span class="key">Flèches</span>
        </div>
        <div class="shortcut">
            <span>Déplacer (1mm)</span>
            <span class="key">Shift+Flèches</span>
        </div>
        <div class="shortcut">
            <span>Zoom</span>
            <span class="key">⌘+/-</span>
        </div>
        <div class="shortcut">
            <span>Déplacer vue</span>
            <span class="key">⌘+Glisser</span>
        </div>
        <div class="shortcut">
            <span>Aide</span>
            <span class="key">?</span>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Auto-hide after 5 seconds
    setTimeout(function() {
        overlay.classList.remove('show');
        setTimeout(function() {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    }, 5000);
}

var copiedObject = null;

/**
 * Copy selected object
 */
function copyObject() {
    var activeObject = canvas.getActiveObject();
    if (activeObject) {
        copiedObject = activeObject.toObject();
        console.log('Object copied');
        showTemporaryMessage('Objet copié');
    }
}

/**
 * Paste copied object
 */
function pasteObject() {
    if (copiedObject) {
        fabric.util.enlivenObjects([copiedObject], function(objects) {
            var obj = objects[0];
            obj.set({
                left: obj.left + 20,
                top: obj.top + 20
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.renderAll();
            displayObjectDimensions(obj);
        });
        console.log('Object pasted');
        showTemporaryMessage('Objet collé');
    }
}

/**
 * Duplicate selected object
 */
function duplicateObject() {
    var activeObject = canvas.getActiveObject();
    if (activeObject) {
        copiedObject = activeObject.toObject();
        pasteObject();
    }
}

/**
 * Show temporary message
 */
function showTemporaryMessage(message) {
    var messageDiv = document.createElement('div');
    messageDiv.className = 'temporary-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: messageSlide 2s ease-out forwards;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(function() {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 2000);
}

/**
 * Enhanced wheel event handler with passive events for better performance
 */
CanvasEventManager.setupWheelEvents = function() {
    const canvasElement = canvas.getElement();
    
    // Remove any existing wheel listeners
    canvasElement.removeEventListener('wheel', handleWheel);
    
    function handleWheel(event) {
        // Prevent default scrolling behavior
        event.preventDefault();
        
        const delta = event.deltaY;
        const pointer = canvas.getPointer(event);
        
        // Zoom in/out based on wheel direction
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        
        // Constrain zoom levels
        if (zoom > APP_CONFIG.MAX_ZOOM) zoom = APP_CONFIG.MAX_ZOOM;
        if (zoom < APP_CONFIG.MIN_ZOOM) zoom = APP_CONFIG.MIN_ZOOM;
        
        // Apply zoom at mouse position
        canvas.zoomToPoint(pointer, zoom);
        
        // Update zoom display
        if (typeof updateZoomDisplay === 'function') {
            updateZoomDisplay();
        }
    }
    
    // Add wheel listener with passive flag when possible
    try {
        canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    } catch (e) {
        // Fallback for older browsers
        canvasElement.addEventListener('wheel', handleWheel);
    }
};
