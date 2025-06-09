/**
 * Image Processing Module
 * Handles image loading, conversion to grayscale, and adding to canvas
 */

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
    var area = WORKSPACE_CONFIG.usableArea;
    
    // Calculate max size for images (leave 20mm border)
    var maxWidthMm = WORKSPACE_CONFIG.width - 20;
    var maxHeightMm = WORKSPACE_CONFIG.height - 20;
    var maxWidth = WORKSPACE_CONFIG.mmToPixels(maxWidthMm);
    var maxHeight = WORKSPACE_CONFIG.mmToPixels(maxHeightMm);
    
    // Resize image if it's too large
    if (image.width > maxWidth || image.height > maxHeight) {
        var scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        image.scale(scale);
    }
    
    image.set({ 
        left: area.offsetX + WORKSPACE_CONFIG.mmToPixels(10), // 10mm from left edge
        top: area.offsetY + WORKSPACE_CONFIG.mmToPixels(10),  // 10mm from top edge
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
