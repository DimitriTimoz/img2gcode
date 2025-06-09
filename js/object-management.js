/**
 * Object Management Module
 * Handles adding, removing, positioning, and manipulating objects on the canvas
 */

/**
 * Get object dimensions in mm
 */
function getObjectDimensionsInMm(obj) {
    if (!obj) return null;
    
    var bounds = obj.getBoundingRect();
    return {
        width: WORKSPACE_CONFIG.pixelsToMm(bounds.width).toFixed(1),
        height: WORKSPACE_CONFIG.pixelsToMm(bounds.height).toFixed(1),
        x: WORKSPACE_CONFIG.pixelsToMm(bounds.left - WORKSPACE_CONFIG.usableArea.offsetX).toFixed(1),
        y: WORKSPACE_CONFIG.pixelsToMm(bounds.top - WORKSPACE_CONFIG.usableArea.offsetY).toFixed(1)
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
    var area = WORKSPACE_CONFIG.usableArea;
    
    var text = new fabric.Text('Votre texte ici', { 
        left: area.offsetX + WORKSPACE_CONFIG.mmToPixels(10), // 10mm from left edge
        top: area.offsetY + WORKSPACE_CONFIG.mmToPixels(10),  // 10mm from top edge
        fontFamily: selectedFont,
        fontSize: WORKSPACE_CONFIG.mmToPixels(5), // 5mm high text
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
    if (!obj) return;
    
    var inArea = isObjectInBuildArea(obj);
    var info = document.getElementById('objectInfo');
    
    if (info) {
        var dims = getObjectDimensionsInMm(obj);
        var warningText = '';
        
        if (!inArea) {
            warningText = '<br><span style="color: #dc3545; font-weight: bold;">⚠️ En dehors de l\'espace de travail !</span>';
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
