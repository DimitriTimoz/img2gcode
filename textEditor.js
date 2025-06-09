/**
 * Inline Text Editing Module
 * Handles direct text editing on the canvas
 */

/**
 * Start inline editing for a text object
 * @param {fabric.Text} textObject - The text object to edit
 */
function startInlineEditing(textObject) {
    // Create temporary input for inline editing
    var input = document.createElement('input');
    input.type = 'text';
    input.value = textObject.text;
    input.style.position = 'absolute';
    input.style.fontSize = textObject.fontSize + 'px';
    input.style.fontFamily = textObject.fontFamily;
    input.style.color = textObject.fill;
    input.style.border = '2px solid #007bff';
    input.style.borderRadius = '3px';
    input.style.padding = '2px 5px';
    input.style.background = 'white';
    input.style.zIndex = '1000';
    input.style.outline = 'none';
    
    // Calculate input position relative to canvas
    var canvasRect = canvas.getElement().getBoundingClientRect();
    var zoom = canvas.getZoom();
    var vpt = canvas.viewportTransform;
    
    var left = canvasRect.left + (textObject.left + vpt[4]) * zoom;
    var top = canvasRect.top + (textObject.top + vpt[5]) * zoom;
    
    input.style.left = left + 'px';
    input.style.top = top + 'px';
    
    // Add input to body
    document.body.appendChild(input);
    
    // Select text and focus
    input.select();
    input.focus();
    
    // Temporarily hide original text object
    textObject.set('opacity', 0.3);
    canvas.renderAll();
    
    // Function to finish editing
    function finishEditing() {
        var newText = input.value.trim();
        if (newText === '') {
            newText = 'Texte vide';
        }
        
        textObject.set({
            'text': newText,
            'opacity': 1
        });
        canvas.renderAll();
        
        document.body.removeChild(input);
        canvas.setActiveObject(textObject);
    }
    
    // Handle events
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            textObject.set('opacity', 1);
            canvas.renderAll();
            document.body.removeChild(input);
        }
    });
    
    // Adjust input size in real time
    input.addEventListener('input', function() {
        // Create temporary element to measure text width
        var temp = document.createElement('span');
        temp.style.visibility = 'hidden';
        temp.style.position = 'absolute';
        temp.style.fontSize = input.style.fontSize;
        temp.style.fontFamily = input.style.fontFamily;
        temp.textContent = input.value || 'W';
        document.body.appendChild(temp);
        
        input.style.width = (temp.offsetWidth + 20) + 'px';
        document.body.removeChild(temp);
    });
    
    // Trigger initial resize
    input.dispatchEvent(new Event('input'));
}
