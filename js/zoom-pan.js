/**
 * Zoom and Pan System Module
 * Handles canvas zoom and pan functionality
 */

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
    var area = WORKSPACE_CONFIG.usableArea;
    var canvasElement = canvas.getElement();
    var containerPadding = 60; // Account for container padding
    
    var availableWidth = canvasElement.parentElement.clientWidth - containerPadding;
    var availableHeight = canvasElement.parentElement.clientHeight - containerPadding;
    
    var scaleX = availableWidth / area.width;
    var scaleY = availableHeight / area.height;
    var optimalZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    // Center the workspace area
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
