/**
 * Export Functionality Module
 * Handles G-code export and download functionality
 */

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
