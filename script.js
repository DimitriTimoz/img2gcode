/**
 * Image to G-Code Converter - Main Application
 * Handles canvas initialization, text editing, image loading, and object management
 */

// Global variables
var canvas;
var loadedFonts = new Set();
var currentZoom = 1;
var minZoom = 0.1;
var maxZoom = 5;
var zoomStep = 0.1;

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
        var info = document.getElementById('objectInfo');
        if (info) {
            info.innerHTML = '<em>Aucun objet sélectionné</em>';
        }
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
        
        currentZoom = zoom;
        updateZoomDisplay();
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    // Pan with middle mouse button or ctrl+drag
    var isPanning = false;
    var lastPanPoint = null;

    canvas.on('mouse:down', function(opt) {
        var evt = opt.e;
        if (evt.button === 1 || (evt.ctrlKey && evt.button === 0)) { // Middle mouse or Ctrl+left mouse
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
 * Set up canvas dimensions for Ender 3
 */
function setupEnder3Dimensions() {
    // Calculate actual usable area on canvas
    var usableWidth = ENDER3_CONFIG.mmToPixels(ENDER3_CONFIG.width);
    var usableHeight = ENDER3_CONFIG.mmToPixels(ENDER3_CONFIG.height);
    
    // Center the usable area on canvas
    var offsetX = (ENDER3_CONFIG.canvasWidth - usableWidth) / 2;
    var offsetY = (ENDER3_CONFIG.canvasHeight - usableHeight) / 2;
    
    // Store these for later use
    ENDER3_CONFIG.usableArea = {
        width: usableWidth,
        height: usableHeight,
        offsetX: offsetX,
        offsetY: offsetY
    };
}

/**
 * Add grid overlay to show dimensions
 */
function addGridOverlay() {
    var gridSize = ENDER3_CONFIG.mmToPixels(10); // 10mm grid
    var area = ENDER3_CONFIG.usableArea;
    
    // Create grid lines
    var gridLines = [];
    
    // Vertical lines (every 10mm)
    for (var x = area.offsetX; x <= area.offsetX + area.width; x += gridSize) {
        var line = new fabric.Line([x, area.offsetY, x, area.offsetY + area.height], {
            stroke: '#e0e0e0',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            strokeDashArray: [2, 2],
            excludeFromExport: true
        });
        gridLines.push(line);
    }
    
    // Horizontal lines (every 10mm)
    for (var y = area.offsetY; y <= area.offsetY + area.height; y += gridSize) {
        var line = new fabric.Line([area.offsetX, y, area.offsetX + area.width, y], {
            stroke: '#e0e0e0',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            strokeDashArray: [2, 2],
            excludeFromExport: true
        });
        gridLines.push(line);
    }
    
    // Add border rectangle for build area with enhanced visibility
    var border = new fabric.Rect({
        left: area.offsetX,
        top: area.offsetY,
        width: area.width,
        height: area.height,
        fill: 'transparent',
        stroke: '#ff0000',
        strokeWidth: 3,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        strokeDashArray: [10, 5]
    });
    
    // Add corner markers for better visibility
    var cornerSize = 20;
    var corners = [
        // Top-left corner
        new fabric.Line([area.offsetX, area.offsetY, area.offsetX + cornerSize, area.offsetY], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        new fabric.Line([area.offsetX, area.offsetY, area.offsetX, area.offsetY + cornerSize], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        // Top-right corner
        new fabric.Line([area.offsetX + area.width, area.offsetY, area.offsetX + area.width - cornerSize, area.offsetY], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        new fabric.Line([area.offsetX + area.width, area.offsetY, area.offsetX + area.width, area.offsetY + cornerSize], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        // Bottom-left corner
        new fabric.Line([area.offsetX, area.offsetY + area.height, area.offsetX + cornerSize, area.offsetY + area.height], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        new fabric.Line([area.offsetX, area.offsetY + area.height, area.offsetX, area.offsetY + area.height - cornerSize], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        // Bottom-right corner
        new fabric.Line([area.offsetX + area.width, area.offsetY + area.height, area.offsetX + area.width - cornerSize, area.offsetY + area.height], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        }),
        new fabric.Line([area.offsetX + area.width, area.offsetY + area.height, area.offsetX + area.width, area.offsetY + area.height - cornerSize], {
            stroke: '#ff0000', strokeWidth: 4, selectable: false, evented: false, excludeFromExport: true
        })
    ];
    
    // Add all grid elements to canvas
    gridLines.forEach(function(line) {
        canvas.add(line);
        canvas.sendToBack(line);
    });
    
    canvas.add(border);
    canvas.sendToBack(border);
    
    corners.forEach(function(corner) {
        canvas.add(corner);
        canvas.sendToBack(corner);
    });
    
    canvas.renderAll();
}

/**
 * Update dimension information display
 */
function updateDimensionInfo() {
    var info = document.getElementById('dimensionInfo');
    if (info) {
        info.innerHTML = `
            <strong>Zone Ender 3 :</strong> ${ENDER3_CONFIG.width} × ${ENDER3_CONFIG.height} mm<br>
            <strong>Grille :</strong> carrés de 10mm<br>
            <strong>Échelle :</strong> ${ENDER3_CONFIG.pixelsPerMm.toFixed(2)} pixels/mm
        `;
    }
}

/**
 * Get object dimensions in mm
 */
function getObjectDimensionsInMm(obj) {
    if (!obj) return null;
    
    var bounds = obj.getBoundingRect();
    return {
        width: ENDER3_CONFIG.pixelsToMm(bounds.width).toFixed(1),
        height: ENDER3_CONFIG.pixelsToMm(bounds.height).toFixed(1),
        x: ENDER3_CONFIG.pixelsToMm(bounds.left - ENDER3_CONFIG.usableArea.offsetX).toFixed(1),
        y: ENDER3_CONFIG.pixelsToMm(bounds.top - ENDER3_CONFIG.usableArea.offsetY).toFixed(1)
    };
}

/**
 * Display object dimensions
 */
function displayObjectDimensions(obj) {
    if (!obj) return;
    
    checkBuildAreaConstraints(obj);
}

/**
 * Add text to the canvas
 */
function addText() {
    var selectedFont = document.getElementById('fontSelect').value;
    var area = ENDER3_CONFIG.usableArea;
    
    var text = new fabric.Text('Votre texte ici', { 
        left: area.offsetX + ENDER3_CONFIG.mmToPixels(10), // 10mm from left edge
        top: area.offsetY + ENDER3_CONFIG.mmToPixels(10),  // 10mm from top edge
        fontFamily: selectedFont,
        fontSize: ENDER3_CONFIG.mmToPixels(5), // 5mm high text
        fill: '#000000'
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
 * Convert image to grayscale
 */
function convertToGrayscale(imgElement) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    
    // Draw the image to canvas
    ctx.drawImage(imgElement, 0, 0);
    
    // Get image data
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    
    // Convert to grayscale
    for (var i = 0; i < data.length; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        
        // Calculate grayscale value using luminance formula
        var grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        data[i] = grayscale;     // Red
        data[i + 1] = grayscale; // Green
        data[i + 2] = grayscale; // Blue
        // Alpha channel (i + 3) remains unchanged
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL();
}

/**
 * Handle image loading
 */
function handleImageLoad(e) {
    var reader = new FileReader();
    reader.onload = function (f) {
        var imgObj = new Image();
        imgObj.src = f.target.result;
        imgObj.onload = function () {
            var shouldConvertToGrayscale = document.getElementById('grayscaleToggle').checked;
            
            if (shouldConvertToGrayscale) {
                // Convert to grayscale for laser engraving
                var grayscaleDataUrl = convertToGrayscale(imgObj);
                
                // Create new image with grayscale data
                var grayscaleImg = new Image();
                grayscaleImg.onload = function() {
                    createFabricImage(grayscaleImg, true);
                };
                grayscaleImg.src = grayscaleDataUrl;
            } else {
                // Use original image
                createFabricImage(imgObj, false);
            }
        }
    }
    reader.readAsDataURL(e.target.files[0]);
}

/**
 * Create and add fabric image to canvas
 */
function createFabricImage(imgElement, isGrayscale) {
    var image = new fabric.Image(imgElement);
    var area = ENDER3_CONFIG.usableArea;
    
    // Calculate max size for images (leave 20mm border)
    var maxWidthMm = ENDER3_CONFIG.width - 20;
    var maxHeightMm = ENDER3_CONFIG.height - 20;
    var maxWidth = ENDER3_CONFIG.mmToPixels(maxWidthMm);
    var maxHeight = ENDER3_CONFIG.mmToPixels(maxHeightMm);
    
    // Resize image if it's too large
    if (image.width > maxWidth || image.height > maxHeight) {
        var scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        image.scale(scale);
    }
    
    image.set({ 
        left: area.offsetX + ENDER3_CONFIG.mmToPixels(10), // 10mm from left edge
        top: area.offsetY + ENDER3_CONFIG.mmToPixels(10),  // 10mm from top edge
        selectable: true
    });
    canvas.add(image);
    canvas.setActiveObject(image);
    canvas.renderAll();
    
    if (isGrayscale) {
        console.log('Image converted to grayscale for laser engraving');
    } else {
        console.log('Image added in original colors');
    }
    
    // Show dimensions
    displayObjectDimensions(image);
}

/**
 * Handle font loading
 */
function handleFontLoad(e) {
    var file = e.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(event) {
            var fontName = file.name.split('.')[0];
            var font = new FontFace(fontName, event.target.result);
            
            font.load().then(function(loadedFont) {
                document.fonts.add(loadedFont);
                loadedFonts.add(fontName);
                
                // Add font to selector
                var option = document.createElement('option');
                option.value = fontName;
                option.textContent = fontName + ' (imported)';
                document.getElementById('fontSelect').appendChild(option);
                
                // Update status
                document.getElementById('fontStatus').textContent = 
                    'Police "' + fontName + '" importée avec succès';
                document.getElementById('fontStatus').style.color = '#28a745';
                
                // Automatically select the new font
                document.getElementById('fontSelect').value = fontName;
                
            }).catch(function(error) {
                console.error('Error loading font:', error);
                document.getElementById('fontStatus').textContent = 
                    'Erreur lors de l\'importation de la police';
                document.getElementById('fontStatus').style.color = '#dc3545';
            });
        };
        reader.readAsArrayBuffer(file);
    }
}

/**
 * Handle font change for selected text
 */
function handleFontChange() {
    var activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'text') {
        activeObject.set('fontFamily', this.value);
        canvas.renderAll();
    }
}

/**
 * Convert selected image to grayscale
 */
function convertSelectedToGrayscale() {
    var activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'image') {
        // Get the image element
        var imgElement = activeObject.getElement();
        
        // Convert to grayscale
        var grayscaleDataUrl = convertToGrayscale(imgElement);
        
        // Create new image and replace the existing one
        var grayscaleImg = new Image();
        grayscaleImg.onload = function() {
            // Preserve the original position and scale
            var left = activeObject.left;
            var top = activeObject.top;
            var scaleX = activeObject.scaleX;
            var scaleY = activeObject.scaleY;
            
            // Remove old image
            canvas.remove(activeObject);
            
            // Add new grayscale image
            var newImage = new fabric.Image(grayscaleImg);
            newImage.set({
                left: left,
                top: top,
                scaleX: scaleX,
                scaleY: scaleY,
                selectable: true
            });
            
            canvas.add(newImage);
            canvas.setActiveObject(newImage);
            canvas.renderAll();
            
            console.log('Selected image converted to grayscale');
        };
        grayscaleImg.src = grayscaleDataUrl;
    } else {
        alert('Veuillez sélectionner une image à convertir en niveaux de gris');
    }
}

/**
 * Export canvas content as G-code (currently exports as SVG)
 */
function downloadGcode() {
    var svg = canvas.toSVG();
    console.log('Generated SVG:', svg);
    
    // At this stage, you would pass the SVG to a JS converter → GCODE (e.g. svg2gcode)
    // then offer the GCODE file for download
    
    // Create temporary file to download SVG for now
    var blob = new Blob([svg], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'design.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Check if object is within Ender 3 build area
 */
function isObjectInBuildArea(obj) {
    if (!obj) return false;
    
    var bounds = obj.getBoundingRect();
    var area = ENDER3_CONFIG.usableArea;
    
    return (bounds.left >= area.offsetX && 
            bounds.top >= area.offsetY &&
            bounds.left + bounds.width <= area.offsetX + area.width &&
            bounds.top + bounds.height <= area.offsetY + area.height);
}

/**
 * Show warning if object is outside build area
 */
function checkBuildAreaConstraints(obj) {
    if (!obj) return;
    
    var inArea = isObjectInBuildArea(obj);
    var info = document.getElementById('objectInfo');
    
    if (info) {
        var dims = getObjectDimensionsInMm(obj);
        var warningText = '';
        
        if (!inArea) {
            warningText = '<br><span style="color: #dc3545; font-weight: bold;">⚠️ En dehors de la zone de construction !</span>';
        }
        
        if (dims) {
            info.innerHTML = `
                <strong>Objet sélectionné :</strong><br>
                Taille : ${dims.width} × ${dims.height} mm<br>
                Position : X=${dims.x}mm, Y=${dims.y}mm${warningText}
            `;
        }
    }
}

/**
 * Center selected object in build area
 */
function centerObjectInBuildArea() {
    var activeObject = canvas.getActiveObject();
    if (!activeObject) {
        alert('Veuillez sélectionner un objet à centrer');
        return;
    }
    
    var area = ENDER3_CONFIG.usableArea;
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
 * Zoom functions
 */
function zoomIn() {
    var zoom = canvas.getZoom();
    zoom += zoomStep;
    if (zoom > maxZoom) zoom = maxZoom;
    
    var center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
    currentZoom = zoom;
    updateZoomDisplay();
}

function zoomOut() {
    var zoom = canvas.getZoom();
    zoom -= zoomStep;
    if (zoom < minZoom) zoom = minZoom;
    
    var center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
    currentZoom = zoom;
    updateZoomDisplay();
}

function resetZoom() {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    currentZoom = 1;
    updateZoomDisplay();
}

function updateZoomDisplay() {
    var zoomDisplay = document.getElementById('zoomLevel');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
    }
}

/**
 * Fit canvas content to viewport
 */
function fitToWindow() {
    var area = ENDER3_CONFIG.usableArea;
    var canvasElement = canvas.getElement();
    var containerPadding = 60; // Account for container padding
    
    var availableWidth = canvasElement.parentElement.clientWidth - containerPadding;
    var availableHeight = canvasElement.parentElement.clientHeight - containerPadding;
    
    var scaleX = availableWidth / area.width;
    var scaleY = availableHeight / area.height;
    var optimalZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    // Center the build area
    var centerX = availableWidth / 2;
    var centerY = availableHeight / 2;
    
    canvas.setViewportTransform([
        optimalZoom, 0, 0, optimalZoom,
        centerX - (area.offsetX + area.width/2) * optimalZoom,
        centerY - (area.offsetY + area.height/2) * optimalZoom
    ]);
    
    currentZoom = optimalZoom;
    updateZoomDisplay();
}

/**
 * Multi-Project Local Storage Functions
 */

// Storage keys
const PROJECTS_STORAGE_KEY = 'img2gcode_projects';
const CURRENT_PROJECT_KEY = 'img2gcode_current_project';

// Current project state
var currentProjectName = 'Projet par défaut';

/**
 * Get all saved projects
 */
function getAllProjects() {
    try {
        var projectsData = localStorage.getItem(PROJECTS_STORAGE_KEY);
        return projectsData ? JSON.parse(projectsData) : {};
    } catch (error) {
        console.error('Error getting projects:', error);
        return {};
    }
}

/**
 * Save current project with given name
 */
function saveCurrentProject() {
    var projectName = document.getElementById('currentProjectName').value.trim();
    if (!projectName) {
        alert('Veuillez entrer un nom pour le projet');
        return;
    }
    
    try {
        // Get all canvas objects except grid elements
        var objectsToSave = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        // Prepare the project data
        var projectData = {
            name: projectName,
            version: '1.0',
            timestamp: new Date().toISOString(),
            zoom: currentZoom,
            viewport: canvas.viewportTransform,
            objects: objectsToSave.map(function(obj) {
                return obj.toObject(['excludeFromExport']);
            }),
            settings: {
                grayscaleToggle: document.getElementById('grayscaleToggle').checked,
                selectedFont: document.getElementById('fontSelect').value
            }
        };
        
        // Get existing projects
        var allProjects = getAllProjects();
        allProjects[projectName] = projectData;
        
        // Save to localStorage
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        localStorage.setItem(CURRENT_PROJECT_KEY, projectName);
        
        // Update current project name
        currentProjectName = projectName;
        
        // Update status
        updateSaveStatus(`Projet "${projectName}" sauvegardé !`, 'success');
        
        console.log('Project saved:', projectName);
        
    } catch (error) {
        console.error('Error saving project:', error);
        updateSaveStatus('Erreur lors de la sauvegarde', 'error');
    }
}

/**
 * Load a specific project by name
 */
function loadProject(projectName) {
    try {
        var allProjects = getAllProjects();
        var projectData = allProjects[projectName];
        
        if (!projectData) {
            updateSaveStatus('Projet non trouvé', 'error');
            return;
        }
        
        // Clear current canvas content (preserve grid)
        var objectsToRemove = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        objectsToRemove.forEach(function(obj) {
            canvas.remove(obj);
        });
        
        // Restore objects
        if (projectData.objects && projectData.objects.length > 0) {
            projectData.objects.forEach(function(objData) {
                fabric.util.enlivenObjects([objData], function(enlivenedObjects) {
                    enlivenedObjects.forEach(function(obj) {
                        canvas.add(obj);
                    });
                    canvas.renderAll();
                });
            });
        }
        
        // Restore settings
        if (projectData.settings) {
            if (projectData.settings.grayscaleToggle !== undefined) {
                document.getElementById('grayscaleToggle').checked = projectData.settings.grayscaleToggle;
            }
            if (projectData.settings.selectedFont) {
                document.getElementById('fontSelect').value = projectData.settings.selectedFont;
            }
        }
        
        // Restore zoom and viewport
        setTimeout(function() {
            if (projectData.viewport) {
                canvas.setViewportTransform(projectData.viewport);
            }
            if (projectData.zoom) {
                currentZoom = projectData.zoom;
                updateZoomDisplay();
            }
            canvas.renderAll();
        }, 100);
        
        // Update current project name
        currentProjectName = projectName;
        document.getElementById('currentProjectName').value = projectName;
        localStorage.setItem(CURRENT_PROJECT_KEY, projectName);
        
        // Update status
        var saveDate = new Date(projectData.timestamp).toLocaleString('fr-FR');
        updateSaveStatus(`Projet "${projectName}" chargé (${saveDate})`, 'success');
        
        console.log('Project loaded:', projectName);
        
    } catch (error) {
        console.error('Error loading project:', error);
        updateSaveStatus('Erreur lors du chargement', 'error');
    }
}

/**
 * Delete a project
 */
function deleteProject(projectName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`)) {
        return;
    }
    
    try {
        var allProjects = getAllProjects();
        delete allProjects[projectName];
        
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        
        // If this was the current project, clear current project reference
        if (currentProjectName === projectName) {
            localStorage.removeItem(CURRENT_PROJECT_KEY);
            currentProjectName = 'Projet par défaut';
            document.getElementById('currentProjectName').value = currentProjectName;
        }
        
        updateSaveStatus(`Projet "${projectName}" supprimé`, 'info');
        
        // Refresh project manager if open
        var modal = document.getElementById('projectModal');
        if (modal.style.display !== 'none') {
            loadProjectManager();
        }
        
    } catch (error) {
        console.error('Error deleting project:', error);
        updateSaveStatus('Erreur lors de la suppression', 'error');
    }
}

/**
 * Duplicate a project
 */
function duplicateProject(originalName) {
    var newName = prompt(`Nom du nouveau projet (copie de "${originalName}") :`, originalName + ' - Copie');
    if (!newName || newName.trim() === '') {
        return;
    }
    
    newName = newName.trim();
    
    try {
        var allProjects = getAllProjects();
        var originalProject = allProjects[originalName];
        
        if (!originalProject) {
            alert('Projet original non trouvé');
            return;
        }
        
        // Check if name already exists
        if (allProjects[newName]) {
            if (!confirm(`Un projet nommé "${newName}" existe déjà. Le remplacer ?`)) {
                return;
            }
        }
        
        // Create duplicate with new name and timestamp
        var duplicatedProject = JSON.parse(JSON.stringify(originalProject));
        duplicatedProject.name = newName;
        duplicatedProject.timestamp = new Date().toISOString();
        
        allProjects[newName] = duplicatedProject;
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        
        updateSaveStatus(`Projet "${newName}" créé`, 'success');
        
        // Refresh project manager if open
        var modal = document.getElementById('projectModal');
        if (modal.style.display !== 'none') {
            loadProjectManager();
        }
        
    } catch (error) {
        console.error('Error duplicating project:', error);
        updateSaveStatus('Erreur lors de la duplication', 'error');
    }
}

/**
 * Create a new project (clear canvas)
 */
function newProject() {
    if (confirm('Créer un nouveau projet ? Le travail actuel sera perdu s\'il n\'est pas sauvegardé.')) {
        // Clear canvas content (preserve grid)
        var objectsToRemove = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        objectsToRemove.forEach(function(obj) {
            canvas.remove(obj);
        });
        
        // Reset zoom and viewport
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        currentZoom = 1;
        updateZoomDisplay();
        
        // Reset project name
        currentProjectName = 'Nouveau projet';
        document.getElementById('currentProjectName').value = currentProjectName;
        
        canvas.renderAll();
        updateSaveStatus('Nouveau projet créé', 'info');
    }
}

/**
 * Show project manager modal
 */
function showProjectManager() {
    loadProjectManager();
    document.getElementById('projectModal').style.display = 'block';
}

/**
 * Close project manager modal
 */
function closeProjectManager() {
    document.getElementById('projectModal').style.display = 'none';
}

/**
 * Load and display all projects in the manager
 */
function loadProjectManager() {
    var allProjects = getAllProjects();
    var projectList = document.getElementById('projectList');
    
    if (Object.keys(allProjects).length === 0) {
        projectList.innerHTML = '<div class="empty-projects">Aucun projet sauvegardé</div>';
        return;
    }
    
    var html = '';
    Object.keys(allProjects).forEach(function(projectName) {
        var project = allProjects[projectName];
        var saveDate = new Date(project.timestamp).toLocaleString('fr-FR');
        var objectCount = project.objects ? project.objects.length : 0;
        var isCurrentProject = projectName === currentProjectName;
        
        html += `
            <div class="project-item ${isCurrentProject ? 'selected' : ''}">
                <div class="project-info">
                    <h4>${project.name}</h4>
                    <div class="project-meta">
                        <span>Sauvegardé : ${saveDate}</span>
                        <span>${objectCount} objet(s)</span>
                    </div>
                    <div class="project-actions">
                        <button class="btn-small btn-load-project" onclick="loadProject('${projectName}'); closeProjectManager();">
                            Charger
                        </button>
                        <button class="btn-small btn-duplicate-project" onclick="duplicateProject('${projectName}')">
                            Dupliquer
                        </button>
                        <button class="btn-small btn-delete-project" onclick="deleteProject('${projectName}')">
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    projectList.innerHTML = html;
}

/**
 * Check for existing projects and load last current project
 */
function checkForSavedProjects() {
    try {
        var allProjects = getAllProjects();
        var projectCount = Object.keys(allProjects).length;
        
        if (projectCount > 0) {
            // Try to load the last current project
            var lastCurrentProject = localStorage.getItem(CURRENT_PROJECT_KEY);
            if (lastCurrentProject && allProjects[lastCurrentProject]) {
                currentProjectName = lastCurrentProject;
                document.getElementById('currentProjectName').value = currentProjectName;
                updateSaveStatus(`${projectCount} projet(s) trouvé(s). Dernier: "${currentProjectName}"`, 'info');
            } else {
                updateSaveStatus(`${projectCount} projet(s) sauvegardé(s)`, 'info');
            }
        } else {
            updateSaveStatus('Aucun projet sauvegardé', 'info');
        }
    } catch (error) {
        console.error('Error checking for saved projects:', error);
        updateSaveStatus('Erreur de vérification', 'error');
    }
}

/**
 * Update save status display
 */
function updateSaveStatus(message, type) {
    var statusElement = document.getElementById('saveStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'status';
        
        // Add type-specific styling
        switch (type) {
            case 'success':
                statusElement.style.color = '#28a745';
                statusElement.style.fontWeight = '500';
                break;
            case 'error':
                statusElement.style.color = '#dc3545';
                statusElement.style.fontWeight = '500';
                break;
            case 'info':
                statusElement.style.color = '#666';
                statusElement.style.fontWeight = 'normal';
                break;
            default:
                statusElement.style.color = '#666';
                statusElement.style.fontWeight = 'normal';
        }
        
        // Clear success/error styling after 3 seconds
        if (type === 'success' || type === 'error') {
            setTimeout(function() {
                if (statusElement) {
                    statusElement.style.color = '#666';
                    statusElement.style.fontWeight = 'normal';
                }
            }, 3000);
        }
    }
}

/**
 * Auto-save functionality (optional)
 */
function enableAutoSave() {
    // Auto-save current project every 3 minutes if there are changes
    setInterval(function() {
        var objects = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        if (objects.length > 0 && currentProjectName) {
            // Only auto-save if project has a meaningful name
            if (currentProjectName !== 'Nouveau projet' && currentProjectName.trim() !== '') {
                saveCurrentProject();
                console.log('Auto-saved project:', currentProjectName);
            }
        }
    }, 180000); // 3 minutes
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
