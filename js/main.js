/**
 * Main Application File
 * Handles application initialization and coordination between modules
 */

/**
 * Initialize the application
 */
function initApp() {
    canvas = new fabric.Canvas('c');
    
    // Canvas configuration
    canvas.selection = true;
    canvas.preserveObjectStacking = true;
    
    // Set up flexible workspace
    setupWorkspaceArea();
    
    // Add grid overlay
    addGridOverlay();
    
    // Set up event listeners
    setupEventListeners();
    
    // Display dimension info
    updateDimensionInfo();
    
    // Initialize zoom display
    updateZoomDisplay();
    
    // Check for saved project
    checkForSavedProjects();
    
    // Enable auto-save
    enableAutoSave();
    
    // Update canvas title
    if (typeof updateCanvasTitle === 'function') {
        updateCanvasTitle();
    }
    
    console.log('Application initialized successfully');
    console.log(`Workspace area: ${WORKSPACE_CONFIG.width}x${WORKSPACE_CONFIG.height}mm`);
    console.log(`Pixels per mm: ${WORKSPACE_CONFIG.pixelsPerMm.toFixed(2)}`);
    console.log('Origin: Current printer position (no homing required)');
    console.log('Zoom controls: Mouse wheel, Ctrl+/-, or buttons');
}

// Toggle collapsible sections in the interface
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    const toggleIcon = header.querySelector('.toggle-icon');
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
    } else {
        section.classList.add('collapsed');
        toggleIcon.textContent = '▶';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        var modal = document.getElementById('projectModal');
        if (event.target == modal) {
            closeProjectManager();
        }
    };
});

/**
 * Show machine profile creation dialog
 */
function showMachineProfileDialog() {
    document.getElementById('machineProfileModal').style.display = 'block';
    document.getElementById('profileName').value = '';
    document.getElementById('profileKey').value = '';
    document.getElementById('profileName').focus();
}

/**
 * Close machine profile dialog
 */
function closeMachineProfileDialog() {
    document.getElementById('machineProfileModal').style.display = 'none';
}

/**
 * Save machine profile from dialog
 */
function saveMachineProfileFromDialog() {
    var nameInput = document.getElementById('profileName');
    var keyInput = document.getElementById('profileKey');
    
    var name = nameInput.value.trim();
    var key = keyInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (!name || !key) {
        alert('Veuillez saisir un nom et une clé pour le profil.');
        return;
    }
    
    if (LASER_CONFIG.machineProfiles[key]) {
        if (!confirm('Un profil avec cette clé existe déjà. Voulez-vous l\'écraser ?')) {
            return;
        }
    }
    
    // Save the profile
    if (saveMachineProfile(key, name)) {
        // Update the dropdown
        var select = document.getElementById('machineProfile');
        if (select) {
            // Add option if it doesn't exist
            var existingOption = select.querySelector('option[value="' + key + '"]');
            if (!existingOption) {
                var option = document.createElement('option');
                option.value = key;
                option.textContent = name;
                select.appendChild(option);
            } else {
                existingOption.textContent = name;
            }
            select.value = key;
        }
        
        // Update current profile
        LASER_CONFIG.currentMachineProfile = key;
        
        // Show success message
        var statusElement = document.getElementById('laserStatus');
        if (statusElement) {
            statusElement.textContent = 'Profil machine sauvegardé: ' + name;
            statusElement.style.color = '#28a745';
        }
        
        closeMachineProfileDialog();
        alert('Profil machine sauvegardé avec succès!');
    } else {
        alert('Erreur lors de la sauvegarde du profil.');
    }
}

/**
 * Auto-generate profile key from name
 */
function updateProfileKey() {
    var nameInput = document.getElementById('profileName');
    var keyInput = document.getElementById('profileKey');
    
    if (nameInput && keyInput && nameInput.value) {
        var key = nameInput.value.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
        keyInput.value = key;
    }
}

// Add event listener for auto-generating profile key
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        var nameInput = document.getElementById('profileName');
        if (nameInput) {
            nameInput.addEventListener('input', updateProfileKey);
        }
    });
}

/**
 * Load machine profiles into dropdown
 */
function loadMachineProfilesIntoDropdown() {
    var select = document.getElementById('machineProfile');
    if (!select) return;
    
    // Clear existing options except defaults
    var options = select.querySelectorAll('option');
    options.forEach(function(option) {
        if (!option.value.startsWith('ender3_')) {
            option.remove();
        }
    });
    
    // Add saved profiles
    Object.keys(LASER_CONFIG.machineProfiles).forEach(function(key) {
        if (!key.startsWith('ender3_')) {
            var profile = LASER_CONFIG.machineProfiles[key];
            var option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name;
            select.appendChild(option);
        }
    });
    
    // Set current selection
    select.value = LASER_CONFIG.currentMachineProfile;
}

/**
 * Initialize enhanced configuration system
 */
function initializeEnhancedConfig() {
    // Load machine profiles into dropdown
    loadMachineProfilesIntoDropdown();
    
    // Update UI from current config
    updateUIFromConfig();
    
    console.log('Enhanced configuration system initialized');
}

// Enhanced initialization
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        setTimeout(function() {
            initializeLaserConfig();
            initializeEnhancedConfig();
        }, 200);
    });
}
