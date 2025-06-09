/**
 * Canvas Management Module
 * Handles canvas setup, grid overlay, and Ender 3 dimensions
 */

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
