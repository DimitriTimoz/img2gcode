/**
 * Event Handlers Module
 * Handles all canvas events, keyboard shortcuts, and UI interactions
 */

/**
 * Set up canvas-specific events
 */
function setupCanvasEvents() {
    // Selection events
    canvas.on('selection:created', function(e) {
        console.log('Object selected:', e.selected[0].type);
        displayObjectDimensions(e.selected[0]);
    });

    canvas.on('selection:cleared', function(e) {
        console.log('Selection cleared');
        removeSizeIndicators();
        var info = document.getElementById('objectInfo');
        if (info) {
            info.innerHTML = '<em>Aucun objet sélectionné</em>';
        }
    });

    canvas.on('selection:updated', function(e) {
        console.log('Selection updated');
        displayObjectDimensions(e.selected[0]);
    });

    // Update dimensions when object is modified
    canvas.on('object:modified', function(e) {
        displayObjectDimensions(e.target);
    });

    canvas.on('object:moving', function(e) {
        displayObjectDimensions(e.target);
    });

    canvas.on('object:scaling', function(e) {
        displayObjectDimensions(e.target);
    });

    canvas.on('object:rotating', function(e) {
        displayObjectDimensions(e.target);
    });

    // Double-click for inline text editing
    canvas.on('mouse:dblclick', function(e) {
        if (e.target && e.target.type === 'text') {
            startInlineEditing(e.target);
        }
    });

    // Mouse wheel zoom
    canvas.on('mouse:wheel', function(opt) {
        var delta = opt.e.deltaY;
        var zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        
        if (zoom > maxZoom) zoom = maxZoom;
        if (zoom < minZoom) zoom = minZoom;
        
        // Zoom to mouse position
        var point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
        canvas.zoomToPoint(point, zoom);
        
        currentZoom = canvas.getZoom(); // Get actual zoom from canvas
        updateZoomDisplay();
        
        // Update measurement indicators for new zoom level
        updateMeasurementIndicators();
        
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    // Pan with middle mouse button or ctrl+drag
    var isPanning = false;
    var lastPanPoint = null;

    canvas.on('mouse:down', function(opt) {
        var evt = opt.e;
        if (evt.button === 1 || (evt.metaKey && evt.button === 0)) { // Middle mouse or Cmd+left mouse (macOS)
            isPanning = true;
            canvas.selection = false;
            lastPanPoint = new fabric.Point(evt.clientX, evt.clientY);
            canvas.setCursor('grab');
        }
    });

    canvas.on('mouse:move', function(opt) {
        if (isPanning && lastPanPoint) {
            var evt = opt.e;
            var currentPoint = new fabric.Point(evt.clientX, evt.clientY);
            var deltaX = currentPoint.x - lastPanPoint.x;
            var deltaY = currentPoint.y - lastPanPoint.y;
            
            var vpt = canvas.viewportTransform;
            vpt[4] += deltaX;
            vpt[5] += deltaY;
            canvas.requestRenderAll();
            
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
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Image loader
    document.getElementById('imgLoader').addEventListener('change', handleImageLoad);
    
    // Font loader
    document.getElementById('fontLoader').addEventListener('change', handleFontLoad);
    
    // Font selector change
    document.getElementById('fontSelect').addEventListener('change', handleFontChange);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Canvas events
    setupCanvasEvents();
}

/**
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
 * Set up keyboard shortcuts for better productivity
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        var activeObject = canvas.getActiveObject();
        
        switch(e.key) {
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                removeSelected();
                break;
                
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    copyObject();
                }
                break;
                
            case 'v':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    pasteObject();
                }
                break;
                
            case 'd':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    duplicateObject();
                }
                break;
                
            case 'p':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    showPrecisionDialog();
                }
                break;
                
            case 'g':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleGridSnapping();
                }
                break;
                
            case 'r':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleMeasurementRulers();
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (activeObject) {
                    var step = e.shiftKey ? WORKSPACE_CONFIG.mmToPixels(1) : WORKSPACE_CONFIG.mmToPixels(0.1);
                    activeObject.set('top', activeObject.top - step);
                    canvas.renderAll();
                    displayObjectDimensions(activeObject);
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (activeObject) {
                    var step = e.shiftKey ? WORKSPACE_CONFIG.mmToPixels(1) : WORKSPACE_CONFIG.mmToPixels(0.1);
                    activeObject.set('top', activeObject.top + step);
                    canvas.renderAll();
                    displayObjectDimensions(activeObject);
                }
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                if (activeObject) {
                    var step = e.shiftKey ? WORKSPACE_CONFIG.mmToPixels(1) : WORKSPACE_CONFIG.mmToPixels(0.1);
                    activeObject.set('left', activeObject.left - step);
                    canvas.renderAll();
                    displayObjectDimensions(activeObject);
                }
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                if (activeObject) {
                    var step = e.shiftKey ? WORKSPACE_CONFIG.mmToPixels(1) : WORKSPACE_CONFIG.mmToPixels(0.1);
                    activeObject.set('left', activeObject.left + step);
                    canvas.renderAll();
                    displayObjectDimensions(activeObject);
                }
                break;
                
            case '?':
                e.preventDefault();
                showKeyboardShortcuts();
                break;
        }
    });
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
