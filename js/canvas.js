/**
 * Canvas Management Module
 * Handles canvas setup, grid overlay, and flexible workspace dimensions
 */

/**
 * Set up flexible workspace area
 */
function setupWorkspaceArea() {
    // Calculate actual usable area on canvas
    var usableWidth = WORKSPACE_CONFIG.mmToPixels(WORKSPACE_CONFIG.width);
    var usableHeight = WORKSPACE_CONFIG.mmToPixels(WORKSPACE_CONFIG.height);
    
    // Position workspace area starting from bottom-left reference
    // Bottom-left is origin (0,0), so we need to account for canvas coordinate system
    var offsetX = 50; // Small margin from canvas edge
    var offsetY = WORKSPACE_CONFIG.canvasHeight - usableHeight - 50; // Position from bottom
    
    // Store these for later use
    WORKSPACE_CONFIG.usableArea = {
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
    var gridSize = WORKSPACE_CONFIG.mmToPixels(10); // 10mm grid
    var area = WORKSPACE_CONFIG.usableArea;
    
    // Remove existing grid elements
    var existingGridElements = canvas.getObjects().filter(function(obj) {
        return obj.excludeFromExport;
    });
    existingGridElements.forEach(function(obj) {
        canvas.remove(obj);
    });
    
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
    
    // Add border rectangle for workspace area
    var border = new fabric.Rect({
        left: area.offsetX,
        top: area.offsetY,
        width: area.width,
        height: area.height,
        fill: 'transparent',
        stroke: '#0066cc',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        strokeDashArray: [5, 5]
    });
    
    // Add origin marker (0,0 point)
    var originMarker = new fabric.Group([
        // Cross lines for origin
        new fabric.Line([area.offsetX - 10, area.offsetY + area.height, area.offsetX + 10, area.offsetY + area.height], {
            stroke: '#ff0000', strokeWidth: 3
        }),
        new fabric.Line([area.offsetX, area.offsetY + area.height - 10, area.offsetX, area.offsetY + area.height + 10], {
            stroke: '#ff0000', strokeWidth: 3
        }),
        // Origin label
        new fabric.Text('(0,0)', {
            left: area.offsetX + 15,
            top: area.offsetY + area.height - 15,
            fontSize: 12,
            fill: '#ff0000',
            fontFamily: 'Arial'
        })
    ], {
        selectable: false,
        evented: false,
        excludeFromExport: true
    });
    
    // Add all grid elements to canvas
    gridLines.forEach(function(line) {
        canvas.add(line);
        canvas.sendToBack(line);
    });
    
    canvas.add(border);
    canvas.sendToBack(border);
    
    canvas.add(originMarker);
    canvas.sendToBack(originMarker);
    
    canvas.renderAll();
}

/**
 * Update dimension information display
 */
function updateDimensionInfo() {
    var info = document.getElementById('dimensionInfo');
    if (info) {
        info.innerHTML = `
            <strong>Espace de travail :</strong> ${WORKSPACE_CONFIG.width} × ${WORKSPACE_CONFIG.height} mm<br>
            <strong>Grille :</strong> carrés de 10mm<br>
            <strong>Échelle :</strong> ${WORKSPACE_CONFIG.pixelsPerMm.toFixed(2)} pixels/mm<br>
            <strong>Origine :</strong> Coin inférieur gauche (position actuelle de l'imprimante)
        `;
    }
}
