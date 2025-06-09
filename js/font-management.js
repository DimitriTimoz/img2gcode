/**
 * Font Management Module
 * Handles font loading and management
 */

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
