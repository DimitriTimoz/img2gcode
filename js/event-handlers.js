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
