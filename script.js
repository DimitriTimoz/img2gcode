/**
 * Image to G-Code Converter - Main Application
 * Handles canvas initialization, text editing, image loading, and object management
 */

// Global variables
var canvas;
var loadedFonts = new Set();

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
    
    console.log('Application initialized successfully');
    console.log(`Ender 3 build area: ${ENDER3_CONFIG.width}x${ENDER3_CONFIG.height}mm`);
    console.log(`Pixels per mm: ${ENDER3_CONFIG.pixelsPerMm.toFixed(2)}`);
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
            info.innerHTML = '<em>No object selected</em>';
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
            strokeDashArray: [2, 2]
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
            strokeDashArray: [2, 2]
        });
        gridLines.push(line);
    }
    
    // Add border lines for build area
    var border = new fabric.Rect({
        left: area.offsetX,
        top: area.offsetY,
        width: area.width,
        height: area.height,
        fill: 'transparent',
        stroke: '#ff4444',
        strokeWidth: 2,
        selectable: false,
        evented: false
    });
    
    // Add all grid elements to canvas
    gridLines.forEach(function(line) {
        canvas.add(line);
        canvas.sendToBack(line);
    });
    canvas.add(border);
    canvas.sendToBack(border);
    
    canvas.renderAll();
}

/**
 * Update dimension information display
 */
function updateDimensionInfo() {
    var info = document.getElementById('dimensionInfo');
    if (info) {
        info.innerHTML = `
            <strong>Ender 3 Build Area:</strong> ${ENDER3_CONFIG.width} × ${ENDER3_CONFIG.height} mm<br>
            <strong>Grid:</strong> 10mm squares<br>
            <strong>Scale:</strong> ${ENDER3_CONFIG.pixelsPerMm.toFixed(2)} pixels/mm
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
    
    var text = new fabric.Text('Your text here', { 
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
        alert('Please select an object to remove');
    }
}

/**
 * Clear the entire canvas
 */
function clearCanvas() {
    if (confirm('Are you sure you want to clear all content?')) {
        canvas.clear();
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
                    'Font "' + fontName + '" imported successfully';
                document.getElementById('fontStatus').style.color = '#28a745';
                
                // Automatically select the new font
                document.getElementById('fontSelect').value = fontName;
                
            }).catch(function(error) {
                console.error('Error loading font:', error);
                document.getElementById('fontStatus').textContent = 
                    'Error importing font';
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
        alert('Please select an image to convert to grayscale');
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
            warningText = '<br><span style="color: #dc3545; font-weight: bold;">⚠️ Outside build area!</span>';
        }
        
        if (dims) {
            info.innerHTML = `
                <strong>Selected Object:</strong><br>
                Size: ${dims.width} × ${dims.height} mm<br>
                Position: X=${dims.x}mm, Y=${dims.y}mm${warningText}
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
        alert('Please select an object to center');
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);
