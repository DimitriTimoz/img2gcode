/**
 * Image to G-Code Converter - Main Application
 * Handles canvas initialization, text editing, image loading, and object management
 */

// Global variables
var canvas;
var loadedFonts = new Set();

/**
 * Initialize the application
 */
function initApp() {
    canvas = new fabric.Canvas('c');
    
    // Canvas configuration
    canvas.selection = true;
    canvas.preserveObjectStacking = true;
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Application initialized successfully');
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
    });

    canvas.on('selection:cleared', function(e) {
        console.log('Selection cleared');
    });

    // Double-click for inline text editing
    canvas.on('mouse:dblclick', function(e) {
        if (e.target && e.target.type === 'text') {
            startInlineEditing(e.target);
        }
    });
}

/**
 * Add text to the canvas
 */
function addText() {
    var selectedFont = document.getElementById('fontSelect').value;
    var text = new fabric.Text('Your text here', { 
        left: 100, 
        top: 100,
        fontFamily: selectedFont,
        fontSize: 24,
        fill: '#000000'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
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
    
    // Resize image if it's too large
    var maxWidth = 400;
    var maxHeight = 400;
    if (image.width > maxWidth || image.height > maxHeight) {
        var scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        image.scale(scale);
    }
    
    image.set({ 
        left: 150, 
        top: 150,
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);
