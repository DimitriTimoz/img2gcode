/**
 * Enhanced Object Management Module
 * Handles adding, removing, positioning, and manipulating objects on the canvas with optimizations
 */

/**
 * Object validation and constraints system
 */
const ObjectValidator = {
    validate: function(obj) {
        if (!obj) return { valid: false, errors: ['Object is null or undefined'] };
        
        const errors = [];
        const bounds = obj.getBoundingRect();
        
        // Check workspace bounds
        if (!WORKSPACE_CONFIG.isWithinBounds(bounds.left, bounds.top, bounds.width, bounds.height)) {
            errors.push('Object is outside workspace boundaries');
        }
        
        // Check size constraints
        const minSize = WORKSPACE_CONFIG.mmToPixels(0.1); // 0.1mm minimum
        const maxSize = WORKSPACE_CONFIG.mmToPixels(WORKSPACE_CONFIG.MAX_WIDTH);
        
        if (bounds.width < minSize || bounds.height < minSize) {
            errors.push('Object is too small (minimum 0.1mm)');
        }
        
        if (bounds.width > maxSize || bounds.height > maxSize) {
            errors.push('Object is too large');
        }
        
        // Type-specific validations
        switch (obj.type) {
            case 'text':
                if (!obj.text || obj.text.trim().length === 0) {
                    errors.push('Text object cannot be empty');
                }
                break;
            case 'image':
                if (!obj.getSrc || !obj.getSrc()) {
                    errors.push('Image object has no source');
                }
                break;
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },
    
    constrainToWorkspace: function(obj) {
        if (!obj) return false;
        
        const bounds = obj.getBoundingRect();
        const workspace = WORKSPACE_CONFIG.usableArea;
        
        let needsUpdate = false;
        let newLeft = obj.left;
        let newTop = obj.top;
        
        // Constrain to workspace boundaries
        if (bounds.left < workspace.offsetX) {
            newLeft = workspace.offsetX + (obj.left - bounds.left);
            needsUpdate = true;
        }
        
        if (bounds.top < workspace.offsetY) {
            newTop = workspace.offsetY + (obj.top - bounds.top);
            needsUpdate = true;
        }
        
        if (bounds.left + bounds.width > workspace.offsetX + workspace.width) {
            newLeft = workspace.offsetX + workspace.width - bounds.width + (obj.left - bounds.left);
            needsUpdate = true;
        }
        
        if (bounds.top + bounds.height > workspace.offsetY + workspace.height) {
            newTop = workspace.offsetY + workspace.height - bounds.height + (obj.top - bounds.top);
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            obj.set({
                left: newLeft,
                top: newTop
            });
            canvas.requestRenderAll();
        }
        
        return needsUpdate;
    }
};

/**
 * Enhanced dimension calculations with caching
 */
const DimensionCalculator = {
    cache: new Map(),
    
    getObjectDimensionsInMm: function(obj) {
        if (!obj) return null;
        
        const objId = obj.id || AppUtils.generateId('temp');
        const cacheKey = `${objId}_${obj.left}_${obj.top}_${obj.scaleX}_${obj.scaleY}_${obj.angle}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const bounds = obj.getBoundingRect();
        const dimensions = {
            width: parseFloat(WORKSPACE_CONFIG.pixelsToMm(bounds.width).toFixed(2)),
            height: parseFloat(WORKSPACE_CONFIG.pixelsToMm(bounds.height).toFixed(2)),
            x: parseFloat(WORKSPACE_CONFIG.pixelsToMm(bounds.left - WORKSPACE_CONFIG.usableArea.offsetX).toFixed(2)),
            y: parseFloat(WORKSPACE_CONFIG.pixelsToMm(bounds.top - WORKSPACE_CONFIG.usableArea.offsetY).toFixed(2))
        };
        
        // Cache for performance (limit cache size)
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(cacheKey, dimensions);
        return dimensions;
    },
    
    clearCache: function() {
        this.cache.clear();
    }
};

/**
 * Enhanced object dimensions display with better formatting
 */
function displayObjectDimensions(obj) {
    if (!obj) return;
    
    try {
        const info = document.getElementById('objectInfo');
        if (!info) return;
        
        const dims = DimensionCalculator.getObjectDimensionsInMm(obj);
        if (!dims) return;
        
        const validation = ObjectValidator.validate(obj);
        const typeInfo = getObjectTypeInfo(obj);
        
        info.innerHTML = `
            <div class="object-info-header">
                <strong>${typeInfo.icon} ${typeInfo.label}</strong>
                ${!validation.valid ? '<span class="validation-warning">⚠️</span>' : ''}
            </div>
            <div class="object-dimensions">
                <div class="dimension-row">
                    <span class="dim-label">📏 Taille:</span>
                    <span class="dim-value">${dims.width} × ${dims.height} mm</span>
                </div>
                <div class="dimension-row">
                    <span class="dim-label">📍 Position:</span>
                    <span class="dim-value">X: ${dims.x}mm, Y: ${dims.y}mm</span>
                </div>
                ${typeInfo.additionalInfo}
                ${!validation.valid ? `<div class="validation-errors">${validation.errors.join('<br>')}</div>` : ''}
            </div>
        `;
        
        // Add visual size indicators with performance throttling
        if (typeof addSizeIndicators === 'function') {
            AppUtils.throttle(() => addSizeIndicators(obj), 100)();
        }
        
    } catch (error) {
        console.warn('Failed to display object dimensions:', error);
    }
}

/**
 * Get object type information with enhanced details
 */
function getObjectTypeInfo(obj) {
    let icon = '🔷';
    let label = 'Objet';
    let additionalInfo = '';
    
    try {
        switch(obj.type) {
            case 'text':
                icon = '📝';
                label = 'Texte';
                const fontSize = WORKSPACE_CONFIG.pixelsToMm(obj.fontSize || 12).toFixed(1);
                additionalInfo = `
                    <div class="dimension-row">
                        <span class="dim-label">📄 Contenu:</span>
                        <span class="dim-value">"${(obj.text || '').substring(0, 30)}"</span>
                    </div>
                    <div class="dimension-row">
                        <span class="dim-label">🔤 Police:</span>
                        <span class="dim-value">${obj.fontFamily || 'Arial'}, ${fontSize}mm</span>
                    </div>
                `;
                break;
                
            case 'image':
                icon = '🖼️';
                label = 'Image';
                additionalInfo = `
                    <div class="dimension-row">
                        <span class="dim-label">📐 Résolution:</span>
                        <span class="dim-value">${obj.width}×${obj.height}px</span>
                    </div>
                `;
                break;
                
            case 'rect':
                icon = '⬛';
                label = 'Rectangle';
                break;
                
            case 'circle':
                icon = '⚫';
                label = 'Cercle';
                const radius = WORKSPACE_CONFIG.pixelsToMm(obj.radius || 0).toFixed(1);
                additionalInfo = `
                    <div class="dimension-row">
                        <span class="dim-label">📐 Rayon:</span>
                        <span class="dim-value">${radius}mm</span>
                    </div>
                `;
                break;
                
            case 'line':
                icon = '📏';
                label = 'Ligne';
                const length = Math.sqrt(Math.pow(obj.x2 - obj.x1, 2) + Math.pow(obj.y2 - obj.y1, 2));
                const lengthMm = WORKSPACE_CONFIG.pixelsToMm(length).toFixed(1);
                additionalInfo = `
                    <div class="dimension-row">
                        <span class="dim-label">📏 Longueur:</span>
                        <span class="dim-value">${lengthMm}mm</span>
                    </div>
                `;
                break;
                
            case 'path':
                icon = '✏️';
                label = 'Tracé';
                break;
                
            default:
                if (obj.type) {
                    label = obj.type.charAt(0).toUpperCase() + obj.type.slice(1);
                }
        }
    } catch (error) {
        console.warn('Failed to get object type info:', error);
    }
    
    return { icon, label, additionalInfo };
}

/**
 * Add visual size indicators to show object dimensions on canvas
 */
function addSizeIndicators(obj) {
    if (!obj) return;
    
    // Remove existing indicators
    removeSizeIndicators();
    
    // Get object's actual position and size (not transformed by zoom)
    var objLeft = obj.left;
    var objTop = obj.top;
    var objWidth = obj.width * (obj.scaleX || 1);
    var objHeight = obj.height * (obj.scaleY || 1);
    
    // For rotated objects, we need the bounding box
    if (obj.angle !== 0) {
        var bounds = obj.getBoundingRect(false); // false = don't include viewport transform
        objLeft = bounds.left;
        objTop = bounds.top;
        objWidth = bounds.width;
        objHeight = bounds.height;
    }
    
    var dims = getObjectDimensionsInMm(obj);
    var zoom = canvas.getZoom();
    
    // Scale offsets with zoom for consistent appearance
    var zoom = canvas.getZoom();
    var offsetDistance = 15 / zoom;
    var offsetLabel = 20 / zoom;
    var strokeWidth = 2 / zoom;
    var fontSize = 12 / zoom;
    var markerSize = 10 / zoom;
    
    // Create dimension lines and labels using actual coordinates
    var indicators = [];
    
    // Horizontal dimension (width)
    var widthLine = new fabric.Line([
        objLeft, objTop + objHeight + offsetDistance,
        objLeft + objWidth, objTop + objHeight + offsetDistance
    ], {
        stroke: '#ff6b6b',
        strokeWidth: strokeWidth,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isIndicator: true
    });
    
    var widthLabel = new fabric.Text(dims.width + 'mm', {
        left: objLeft + objWidth / 2,
        top: objTop + objHeight + offsetLabel,
        fontSize: fontSize,
        fill: '#ff6b6b',
        fontFamily: 'Arial',
        textAlign: 'center',
        textBaseline: 'middle',
        originX: 'center',
        originY: 'top',
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isIndicator: true,
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
    });
    
    // Vertical dimension (height)
    var heightLine = new fabric.Line([
        objLeft + objWidth + offsetDistance, objTop,
        objLeft + objWidth + offsetDistance, objTop + objHeight
    ], {
        stroke: '#4ecdc4',
        strokeWidth: strokeWidth,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isIndicator: true
    });
    
    var heightLabel = new fabric.Text(dims.height + 'mm', {
        left: objLeft + objWidth + offsetLabel,
        top: objTop + objHeight / 2,
        fontSize: fontSize,
        fill: '#4ecdc4',
        fontFamily: 'Arial',
        textAlign: 'center',
        textBaseline: 'middle',
        originX: 'left',
        originY: 'center',
        angle: -90,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isIndicator: true,
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
    });
    
    // Add end markers for dimension lines
    var endMarkers = [
        // Width line markers
        new fabric.Line([objLeft, objTop + objHeight + markerSize, objLeft, objTop + objHeight + offsetLabel], {
            stroke: '#ff6b6b', strokeWidth: strokeWidth, selectable: false, evented: false, excludeFromExport: true, isIndicator: true
        }),
        new fabric.Line([objLeft + objWidth, objTop + objHeight + markerSize, objLeft + objWidth, objTop + objHeight + offsetLabel], {
            stroke: '#ff6b6b', strokeWidth: strokeWidth, selectable: false, evented: false, excludeFromExport: true, isIndicator: true
        }),
        // Height line markers
        new fabric.Line([objLeft + objWidth + markerSize, objTop, objLeft + objWidth + offsetLabel, objTop], {
            stroke: '#4ecdc4', strokeWidth: strokeWidth, selectable: false, evented: false, excludeFromExport: true, isIndicator: true
        }),
        new fabric.Line([objLeft + objWidth + markerSize, objTop + objHeight, objLeft + objWidth + offsetLabel, objTop + objHeight], {
            stroke: '#4ecdc4', strokeWidth: strokeWidth, selectable: false, evented: false, excludeFromExport: true, isIndicator: true
        })
    ];
    
    // Add all indicators to canvas
    indicators = [widthLine, widthLabel, heightLine, heightLabel].concat(endMarkers);
    
    indicators.forEach(function(indicator) {
        canvas.add(indicator);
        canvas.bringToFront(indicator);
    });
    
    canvas.renderAll();
}

/**
 * Remove all size indicators from canvas
 */
function removeSizeIndicators() {
    var indicators = canvas.getObjects().filter(function(obj) {
        return obj.isIndicator;
    });
    
    indicators.forEach(function(indicator) {
        canvas.remove(indicator);
    });
}

/**
 * Add text to the canvas
 */
function addText() {
    var selectedFont = document.getElementById('fontSelect').value;
    var area = WORKSPACE_CONFIG.usableArea;
    
    var text = new fabric.Text('Votre texte ici', { 
        left: area.offsetX + WORKSPACE_CONFIG.mmToPixels(10), // 10mm from left edge
        top: area.offsetY + WORKSPACE_CONFIG.mmToPixels(10),  // 10mm from top edge
        fontFamily: selectedFont,
        fontSize: WORKSPACE_CONFIG.mmToPixels(5), // 5mm high text
        fill: '#000000',
        textBaseline: 'middle'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    
    // Show dimensions
    displayObjectDimensions(text);
}

/**
 * Remove selected objects from canvas
 */
function removeSelected() {
    var activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(function(obj) {
            canvas.remove(obj);
        });
        canvas.renderAll();
    } else {
        alert('Veuillez sélectionner un objet à supprimer');
    }
}

/**
 * Clear the entire canvas
 */
function clearCanvas() {
    if (confirm('Êtes-vous sûr de vouloir effacer tout le contenu ?')) {
        // Remove all objects except grid elements
        var objectsToRemove = [];
        canvas.getObjects().forEach(function(obj) {
            if (!obj.excludeFromExport) {
                objectsToRemove.push(obj);
            }
        });
        
        objectsToRemove.forEach(function(obj) {
            canvas.remove(obj);
        });
        
        canvas.renderAll();
    }
}

/**
 * Check if object is within workspace area
 */
function isObjectInBuildArea(obj) {
    if (!obj) return false;
    
    var bounds = obj.getBoundingRect();
    var area = WORKSPACE_CONFIG.usableArea;
    
    return (bounds.left >= area.offsetX && 
            bounds.top >= area.offsetY &&
            bounds.left + bounds.width <= area.offsetX + area.width &&
            bounds.top + bounds.height <= area.offsetY + area.height);
}

/**
 * Show warning if object is outside workspace area
 */
function checkBuildAreaConstraints(obj) {
    // Function kept for compatibility but no longer shows warnings
    // Objects can be placed anywhere on the canvas
    return;
}

/**
 * Center selected object in workspace area
 */
function centerObjectInBuildArea() {
    var activeObject = canvas.getActiveObject();
    if (!activeObject) {
        alert('Veuillez sélectionner un objet à centrer');
        return;
    }
    
    var area = WORKSPACE_CONFIG.usableArea;
    var bounds = activeObject.getBoundingRect();
    
    var centerX = area.offsetX + (area.width - bounds.width) / 2;
    var centerY = area.offsetY + (area.height - bounds.height) / 2;
    
    activeObject.set({
        left: centerX,
        top: centerY
    });
    
    canvas.renderAll();
    displayObjectDimensions(activeObject);
}

/**
 * Add rectangle to the canvas
 */
function addRectangle() {
    var area = WORKSPACE_CONFIG.usableArea;
    
    var rect = new fabric.Rect({
        left: area.offsetX + WORKSPACE_CONFIG.mmToPixels(20), // 20mm from left edge
        top: area.offsetY + WORKSPACE_CONFIG.mmToPixels(20),  // 20mm from top edge
        width: WORKSPACE_CONFIG.mmToPixels(30), // 30mm wide
        height: WORKSPACE_CONFIG.mmToPixels(20), // 20mm high
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
        rx: 0, // No rounded corners by default
        ry: 0
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    
    displayObjectDimensions(rect);
    console.log('Rectangle added');
}

/**
 * Add circle to the canvas
 */
function addCircle() {
    var area = WORKSPACE_CONFIG.usableArea;
    
    var circle = new fabric.Circle({
        left: area.offsetX + WORKSPACE_CONFIG.mmToPixels(20), // 20mm from left edge
        top: area.offsetY + WORKSPACE_CONFIG.mmToPixels(20),  // 20mm from top edge
        radius: WORKSPACE_CONFIG.mmToPixels(15), // 15mm radius (30mm diameter)
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2
    });
    
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    
    displayObjectDimensions(circle);
    console.log('Circle added');
}

/**
 * Add line to the canvas
 */
function addLine() {
    var area = WORKSPACE_CONFIG.usableArea;
    
    var line = new fabric.Line([
        area.offsetX + WORKSPACE_CONFIG.mmToPixels(10), // Start X
        area.offsetY + WORKSPACE_CONFIG.mmToPixels(10), // Start Y
        area.offsetX + WORKSPACE_CONFIG.mmToPixels(40), // End X (30mm line)
        area.offsetY + WORKSPACE_CONFIG.mmToPixels(10)  // End Y (horizontal line)
    ], {
        stroke: '#000000',
        strokeWidth: 2,
        selectable: true
    });
    
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    
    displayObjectDimensions(line);
    console.log('Line added');
}

/**
 * Enable/disable drawing mode for freehand drawing
 */
function enableDrawingMode() {
    var btn = document.getElementById('drawingModeBtn');
    
    if (canvas.isDrawingMode) {
        // Disable drawing mode
        canvas.isDrawingMode = false;
        btn.classList.remove('active');
        btn.textContent = 'Dessin libre';
        console.log('Drawing mode disabled');
    } else {
        // Enable drawing mode
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = '#000000';
        btn.classList.add('active');
        btn.textContent = 'Arrêter dessin';
        console.log('Drawing mode enabled');
    }
}

/**
 * Set drawing brush properties
 */
function setDrawingBrush(width, color) {
    if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = width || 2;
        canvas.freeDrawingBrush.color = color || '#000000';
    }
}

/**
 * Enable grid snapping for objects
 */
function enableGridSnapping() {
    canvas.on('object:moving', snapToGrid);
}

/**
 * Toggle grid snapping functionality
 */
var gridSnappingEnabled = false;

function toggleGridSnapping() {
    gridSnappingEnabled = !gridSnappingEnabled;
    var snapToggle = document.getElementById('snapToggle');
    
    if (gridSnappingEnabled) {
        enableGridSnapping();
        if (snapToggle) {
            snapToggle.style.backgroundColor = '#4ecdc4';
            snapToggle.style.color = 'white';
            snapToggle.title = 'Aimantation activée - Clic pour désactiver';
        }
        console.log('Grid snapping enabled');
    } else {
        disableGridSnapping();
        if (snapToggle) {
            snapToggle.style.backgroundColor = '';
            snapToggle.style.color = '';
            snapToggle.title = 'Aimantation désactivée - Clic pour activer';
        }
        console.log('Grid snapping disabled');
    }
}

/**
 * Disable grid snapping
 */
function disableGridSnapping() {
    canvas.off('object:moving', snapToGrid);
}

/**
 * Grid snapping function
 */
function snapToGrid(e) {
    if (!gridSnappingEnabled) return;
    
    var obj = e.target;
    var area = WORKSPACE_CONFIG.usableArea;
    var gridSize = WORKSPACE_CONFIG.mmToPixels(5); // 5mm grid
    
    // Snap to grid
    var left = Math.round((obj.left - area.offsetX) / gridSize) * gridSize + area.offsetX;
    var top = Math.round((obj.top - area.offsetY) / gridSize) * gridSize + area.offsetY;
    
    obj.set({
        left: left,
        top: top
    });
}

/**
 * Add measurement ruler tool
 */
function addMeasurementRuler() {
    var area = WORKSPACE_CONFIG.usableArea;
    var rulers = [];
    
    // Scale ruler element sizes with zoom for consistent appearance
    var zoom = canvas.getZoom();
    var tickLength = 10 / zoom;
    var labelOffset = 25 / zoom;
    var strokeWidth = 1 / zoom;
    var fontSize = 10 / zoom;
    
    // Top ruler (horizontal)
    for (var x = area.offsetX; x <= area.offsetX + area.width; x += WORKSPACE_CONFIG.mmToPixels(10)) {
        var distMm = WORKSPACE_CONFIG.pixelsToMm(x - area.offsetX);
        if (distMm % 10 === 0) { // Every 10mm
            var tick = new fabric.Line([x, area.offsetY - tickLength - 5, x, area.offsetY - 5], {
                stroke: '#666', strokeWidth: strokeWidth, selectable: false, evented: false, excludeFromExport: true, isRuler: true
            });
            var label = new fabric.Text(distMm + '', {
                left: x, top: area.offsetY - labelOffset, fontSize: fontSize, fill: '#666', fontFamily: 'Arial',
                textAlign: 'center', textBaseline: 'middle', originX: 'center', selectable: false, evented: false, excludeFromExport: true, isRuler: true
            });
            rulers.push(tick, label);
        }
    }
    
    // Left ruler (vertical)
    for (var y = area.offsetY; y <= area.offsetY + area.height; y += WORKSPACE_CONFIG.mmToPixels(10)) {
        var distMm = WORKSPACE_CONFIG.pixelsToMm(y - area.offsetY);
        if (distMm % 10 === 0) { // Every 10mm
            var tick = new fabric.Line([area.offsetX - tickLength - 5, y, area.offsetX - 5, y], {
                stroke: '#666', strokeWidth: strokeWidth, selectable: false, evented: false, excludeFromExport: true, isRuler: true
            });
            var label = new fabric.Text(distMm + '', {
                left: area.offsetX - labelOffset, top: y, fontSize: fontSize, fill: '#666', fontFamily: 'Arial',
                textAlign: 'center', textBaseline: 'middle', originX: 'center', originY: 'center', selectable: false, evented: false, excludeFromExport: true, isRuler: true
            });
            rulers.push(tick, label);
        }
    }
    
    // Add rulers to canvas
    rulers.forEach(function(ruler) {
        canvas.add(ruler);
        canvas.sendToBack(ruler);
    });
}

/**
 * Remove measurement rulers
 */
function removeMeasurementRulers() {
    var rulers = canvas.getObjects().filter(function(obj) {
        return obj.isRuler;
    });
    
    rulers.forEach(function(ruler) {
        canvas.remove(ruler);
    });
}

/**
 * Toggle measurement rulers
 */
function toggleMeasurementRulers() {
    var existingRulers = canvas.getObjects().filter(function(obj) {
        return obj.isRuler;
    });
    
    if (existingRulers.length > 0) {
        removeMeasurementRulers();
    } else {
        addMeasurementRuler();
    }
    
    canvas.renderAll();
}

/**
 * Add precision input dialog for exact object positioning
 */
function showPrecisionDialog() {
    var activeObject = canvas.getActiveObject();
    if (!activeObject) {
        alert('Veuillez sélectionner un objet pour le positionner avec précision.');
        return;
    }
    
    var dims = getObjectDimensionsInMm(activeObject);
    if (!dims) return;
    
    var dialog = document.createElement('div');
    dialog.className = 'precision-dialog modal';
    dialog.style.display = 'block';
    
    dialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎯 Positionnement Précis</h3>
                <span class="close-modal" onclick="closePrecisionDialog()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="precision-grid">
                    <div class="precision-section">
                        <h4>📍 Position</h4>
                        <div class="input-row">
                            <label>X (mm):</label>
                            <input type="number" id="preciseX" value="${dims.x}" step="0.1" min="0">
                        </div>
                        <div class="input-row">
                            <label>Y (mm):</label>
                            <input type="number" id="preciseY" value="${dims.y}" step="0.1" min="0">
                        </div>
                    </div>
                    
                    <div class="precision-section">
                        <h4>📏 Dimensions</h4>
                        <div class="input-row">
                            <label>Largeur (mm):</label>
                            <input type="number" id="preciseWidth" value="${dims.width}" step="0.1" min="0.1">
                        </div>
                        <div class="input-row">
                            <label>Hauteur (mm):</label>
                            <input type="number" id="preciseHeight" value="${dims.height}" step="0.1" min="0.1">
                        </div>
                    </div>
                </div>
                
                <div class="precision-presets">
                    <h4>🎯 Positionnement Rapide</h4>
                    <div class="preset-buttons">
                        <button onclick="centerObject()" class="preset-btn">Centre</button>
                        <button onclick="positionCorner('top-left')" class="preset-btn">Coin supérieur gauche</button>
                        <button onclick="positionCorner('top-right')" class="preset-btn">Coin supérieur droit</button>
                        <button onclick="positionCorner('bottom-left')" class="preset-btn">Coin inférieur gauche</button>
                        <button onclick="positionCorner('bottom-right')" class="preset-btn">Coin inférieur droit</button>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button onclick="applyPrecisionChanges()" class="btn-save">Appliquer</button>
                    <button onclick="closePrecisionDialog()" class="btn-cancel">Annuler</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

/**
 * Apply precision changes to selected object
 */
function applyPrecisionChanges() {
    var activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    var area = WORKSPACE_CONFIG.usableArea;
    var newX = parseFloat(document.getElementById('preciseX').value) || 0;
    var newY = parseFloat(document.getElementById('preciseY').value) || 0;
    var newWidth = parseFloat(document.getElementById('preciseWidth').value) || 1;
    var newHeight = parseFloat(document.getElementById('preciseHeight').value) || 1;
    
    // Convert mm to pixels and apply
    var pixelX = area.offsetX + WORKSPACE_CONFIG.mmToPixels(newX);
    var pixelY = area.offsetY + WORKSPACE_CONFIG.mmToPixels(newY);
    var pixelWidth = WORKSPACE_CONFIG.mmToPixels(newWidth);
    var pixelHeight = WORKSPACE_CONFIG.mmToPixels(newHeight);
    
    activeObject.set({
        left: pixelX,
        top: pixelY
    });
    
    // Scale object to new size if it's scalable
    if (activeObject.type !== 'line') {
        var scaleX = pixelWidth / activeObject.width;
        var scaleY = pixelHeight / activeObject.height;
        activeObject.set({
            scaleX: scaleX,
            scaleY: scaleY
        });
    }
    
    canvas.renderAll();
    displayObjectDimensions(activeObject);
    closePrecisionDialog();
}

/**
 * Close precision dialog
 */
function closePrecisionDialog() {
    var dialog = document.querySelector('.precision-dialog');
    if (dialog) {
        dialog.remove();
    }
}

/**
 * Center object in workspace
 */
function centerObject() {
    var activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    var area = WORKSPACE_CONFIG.usableArea;
    var bounds = activeObject.getBoundingRect();
    
    var centerX = area.offsetX + area.width / 2 - bounds.width / 2;
    var centerY = area.offsetY + area.height / 2 - bounds.height / 2;
    
    activeObject.set({
        left: centerX,
        top: centerY
    });
    
    canvas.renderAll();
    displayObjectDimensions(activeObject);
}

/**
 * Position object at specific corner
 */
function positionCorner(corner) {
    var activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    var area = WORKSPACE_CONFIG.usableArea;
    var bounds = activeObject.getBoundingRect();
    var margin = WORKSPACE_CONFIG.mmToPixels(2); // 2mm margin
    
    var newLeft, newTop;
    
    switch (corner) {
        case 'top-left':
            newLeft = area.offsetX + margin;
            newTop = area.offsetY + margin;
            break;
        case 'top-right':
            newLeft = area.offsetX + area.width - bounds.width - margin;
            newTop = area.offsetY + margin;
            break;
        case 'bottom-left':
            newLeft = area.offsetX + margin;
            newTop = area.offsetY + area.height - bounds.height - margin;
            break;
        case 'bottom-right':
            newLeft = area.offsetX + area.width - bounds.width - margin;
            newTop = area.offsetY + area.height - bounds.height - margin;
            break;
    }
    
    activeObject.set({
        left: newLeft,
        top: newTop
    });
    
    canvas.renderAll();
    displayObjectDimensions(activeObject);
}

/**
 * Update measurement indicators after zoom change
 */
function updateMeasurementIndicators() {
    // Update size indicators for selected object
    var activeObject = canvas.getActiveObject();
    if (activeObject) {
        addSizeIndicators(activeObject);
    }
    
    // Update rulers if they are currently displayed
    var existingRulers = canvas.getObjects().filter(function(obj) {
        return obj.isRuler;
    });
    
    if (existingRulers.length > 0) {
        removeMeasurementRulers();
        addMeasurementRuler();
    }
    
    canvas.renderAll();
}
