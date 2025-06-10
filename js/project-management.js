/**
 * Enhanced Project Management Module
 * Handles multi-project save/load system with improved performance and validation
 */

/**
 * Project data validation and management system
 */
const ProjectManager = {
    maxProjects: 50,
    maxProjectSize: APP_CONFIG.MAX_PROJECT_SIZE,
    compressionEnabled: true,
    
    /**
     * Get all saved projects with validation and cleanup
     */
    getAllProjects: function() {
        try {
            const projectsData = localStorage.getItem(STORAGE_CONFIG.PROJECTS);
            if (!projectsData) return {};
            
            const projects = AppUtils.safeJsonParse(projectsData, {});
            
            // Validate and clean up projects
            return this.validateAndCleanupProjects(projects);
            
        } catch (error) {
            console.error('Error getting projects:', error);
            return {};
        }
    },
    
    /**
     * Validate and cleanup projects data
     */
    validateAndCleanupProjects: function(projects) {
        const validatedProjects = {};
        const projectNames = Object.keys(projects);
        
        // Sort projects by timestamp (newest first)
        const sortedProjects = projectNames
            .map(name => ({ name, data: projects[name] }))
            .filter(project => this.isValidProject(project.data))
            .sort((a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp))
            .slice(0, this.maxProjects); // Keep only recent projects
        
        sortedProjects.forEach(project => {
            validatedProjects[project.name] = project.data;
        });
        
        return validatedProjects;
    },
    
    /**
     * Validate project data structure
     */
    isValidProject: function(projectData) {
        if (!projectData || typeof projectData !== 'object') return false;
        
        const required = ['name', 'timestamp', 'objects'];
        return required.every(field => projectData.hasOwnProperty(field));
    },
    
    /**
     * Calculate project size in bytes
     */
    getProjectSize: function(projectData) {
        try {
            return new Blob([JSON.stringify(projectData)]).size;
        } catch (error) {
            return JSON.stringify(projectData).length * 2; // Rough estimate
        }
    },
    
    /**
     * Compress project data if needed
     */
    compressProjectData: function(projectData) {
        // Simple compression: remove unnecessary whitespace and optimize object data
        if (!this.compressionEnabled) return projectData;
        
        const compressed = { ...projectData };
        
        // Optimize objects array
        if (compressed.objects) {
            compressed.objects = compressed.objects.map(obj => {
                const optimized = { ...obj };
                
                // Remove default values to save space
                if (optimized.angle === 0) delete optimized.angle;
                if (optimized.scaleX === 1) delete optimized.scaleX;
                if (optimized.scaleY === 1) delete optimized.scaleY;
                if (optimized.opacity === 1) delete optimized.opacity;
                
                return optimized;
            });
        }
        
        return compressed;
    },
    
    /**
     * Save project with enhanced validation and error handling
     */
    saveCurrentProject: async function() {
        const projectNameInput = document.getElementById('currentProjectName');
        if (!projectNameInput) {
            throw new Error('Project name input not found');
        }
        
        const projectName = projectNameInput.value.trim();
        if (!projectName) {
            throw new Error('Veuillez entrer un nom pour le projet');
        }
        
        // Validate project name
        if (projectName.length > 50) {
            throw new Error('Le nom du projet est trop long (maximum 50 caractères)');
        }
        
        if (!/^[a-zA-Z0-9\s\-_àáâãäåçèéêëìíîïñòóôõöùúûüÿ]+$/.test(projectName)) {
            throw new Error('Le nom du projet contient des caractères non valides');
        }
        
        try {
            // Performance monitoring
            const startTime = performance.now();
            
            // Get canvas objects safely
            const objectsToSave = this.getCanvasObjectsForSave();
            
            // Prepare project data with enhanced metadata
            const projectData = {
                name: projectName,
                version: APP_CONFIG.VERSION,
                timestamp: new Date().toISOString(),
                zoom: AppGlobalState.currentZoom,
                viewport: canvas.viewportTransform.slice(), // Clone array
                objects: objectsToSave,
                settings: this.getCurrentSettings(),
                metadata: {
                    objectCount: objectsToSave.length,
                    workspaceSize: `${WORKSPACE_CONFIG.width}×${WORKSPACE_CONFIG.height}mm`,
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                }
            };
            
            // Compress data if enabled
            const finalData = this.compressProjectData(projectData);
            
            // Check project size
            const projectSize = this.getProjectSize(finalData);
            if (projectSize > this.maxProjectSize) {
                throw new Error(`Projet trop volumineux (${AppUtils.formatFileSize(projectSize)}). Maximum autorisé: ${AppUtils.formatFileSize(this.maxProjectSize)}`);
            }
            
            // Get existing projects and add new one
            const allProjects = this.getAllProjects();
            allProjects[projectName] = finalData;
            
            // Save to storage with error handling
            try {
                localStorage.setItem(STORAGE_CONFIG.PROJECTS, JSON.stringify(allProjects));
                localStorage.setItem(STORAGE_CONFIG.CURRENT_PROJECT, projectName);
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError') {
                    throw new Error('Espace de stockage insuffisant. Supprimez des projets anciens.');
                }
                throw storageError;
            }
            
            // Update application state
            AppGlobalState.currentProjectName = projectName;
            AppGlobalState.performanceStats.lastSaveTime = performance.now();
            
            // Performance logging
            const saveTime = performance.now() - startTime;
            console.log(`Project saved: "${projectName}" (${AppUtils.formatDuration(saveTime)}, ${AppUtils.formatFileSize(projectSize)})`);
            
            // Update UI
            updateSaveStatus(`Projet "${projectName}" sauvegardé !`, 'success');
            
            // Emit event for other modules
            AppEvents.emit('projectSaved', { name: projectName, size: projectSize, duration: saveTime });
            
            return true;
            
        } catch (error) {
            console.error('Error saving project:', error);
            updateSaveStatus(`Erreur: ${error.message}`, 'error');
            throw error;
        }
    },
    
    /**
     * Get canvas objects prepared for saving
     */
    getCanvasObjectsForSave: function() {
        if (!canvas) return [];
        
        try {
            return canvas.getObjects()
                .filter(obj => !obj.excludeFromExport)
                .map(obj => {
                    try {
                        return obj.toObject(['excludeFromExport', 'id']);
                    } catch (objError) {
                        console.warn('Failed to serialize object:', objError);
                        return null;
                    }
                })
                .filter(obj => obj !== null);
        } catch (error) {
            console.error('Failed to get canvas objects:', error);
            return [];
        }
    },
    
    /**
     * Get current application settings
     */
    getCurrentSettings: function() {
        const settings = {};
        
        try {
            // UI settings
            const grayscaleToggle = document.getElementById('grayscaleToggle');
            if (grayscaleToggle) {
                settings.grayscaleToggle = grayscaleToggle.checked;
            }
            
            const fontSelect = document.getElementById('fontSelect');
            if (fontSelect) {
                settings.selectedFont = fontSelect.value;
            }
            
            // Workspace settings
            settings.workspace = {
                width: WORKSPACE_CONFIG.width,
                height: WORKSPACE_CONFIG.height
            };
            
        } catch (error) {
            console.warn('Failed to get current settings:', error);
        }
        
        return settings;
    }
};

// Legacy function compatibility
function getAllProjects() {
    return ProjectManager.getAllProjects();
}

/**
 * Enhanced save function with async support
 */
async function saveCurrentProject() {
    try {
        await ProjectManager.saveCurrentProject();
    } catch (error) {
        // Error already handled in ProjectManager
        throw error;
    }
}

/**
 * Load a specific project by name
 */
function loadProject(projectName) {
    try {
        var allProjects = getAllProjects();
        var projectData = allProjects[projectName];
        
        if (!projectData) {
            updateSaveStatus('Projet non trouvé', 'error');
            return;
        }
        
        // Clear current canvas content (preserve grid)
        var objectsToRemove = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        objectsToRemove.forEach(function(obj) {
            canvas.remove(obj);
        });
        
        // Restore objects
        if (projectData.objects && projectData.objects.length > 0) {
            projectData.objects.forEach(function(objData) {
                fabric.util.enlivenObjects([objData], function(enlivenedObjects) {
                    enlivenedObjects.forEach(function(obj) {
                        canvas.add(obj);
                    });
                    canvas.renderAll();
                });
            });
        }
        
        // Restore settings
        if (projectData.settings) {
            if (projectData.settings.grayscaleToggle !== undefined) {
                document.getElementById('grayscaleToggle').checked = projectData.settings.grayscaleToggle;
            }
            if (projectData.settings.selectedFont) {
                document.getElementById('fontSelect').value = projectData.settings.selectedFont;
            }
        }
        
        // Restore zoom and viewport
        setTimeout(function() {
            if (projectData.viewport) {
                canvas.setViewportTransform(projectData.viewport);
            }
            if (projectData.zoom) {
                currentZoom = projectData.zoom;
                updateZoomDisplay();
            }
            canvas.renderAll();
        }, 100);
        
        // Update current project name
        currentProjectName = projectName;
        document.getElementById('currentProjectName').value = projectName;
        localStorage.setItem(CURRENT_PROJECT_KEY, projectName);
        
        // Update status
        var saveDate = new Date(projectData.timestamp).toLocaleString('fr-FR');
        updateSaveStatus(`Projet "${projectName}" chargé (${saveDate})`, 'success');
        
        console.log('Project loaded:', projectName);
        
    } catch (error) {
        console.error('Error loading project:', error);
        updateSaveStatus('Erreur lors du chargement', 'error');
    }
}

/**
 * Delete a project
 */
function deleteProject(projectName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`)) {
        return;
    }
    
    try {
        var allProjects = getAllProjects();
        delete allProjects[projectName];
        
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        
        // If this was the current project, clear current project reference
        if (currentProjectName === projectName) {
            localStorage.removeItem(CURRENT_PROJECT_KEY);
            currentProjectName = 'Projet par défaut';
            document.getElementById('currentProjectName').value = currentProjectName;
        }
        
        updateSaveStatus(`Projet "${projectName}" supprimé`, 'info');
        
        // Refresh project manager if open
        var modal = document.getElementById('projectModal');
        if (modal.style.display !== 'none') {
            loadProjectManager();
        }
        
    } catch (error) {
        console.error('Error deleting project:', error);
        updateSaveStatus('Erreur lors de la suppression', 'error');
    }
}

/**
 * Duplicate a project
 */
function duplicateProject(originalName) {
    var newName = prompt(`Nom du nouveau projet (copie de "${originalName}") :`, originalName + ' - Copie');
    if (!newName || newName.trim() === '') {
        return;
    }
    
    newName = newName.trim();
    
    try {
        var allProjects = getAllProjects();
        var originalProject = allProjects[originalName];
        
        if (!originalProject) {
            alert('Projet original non trouvé');
            return;
        }
        
        // Check if name already exists
        if (allProjects[newName]) {
            if (!confirm(`Un projet nommé "${newName}" existe déjà. Le remplacer ?`)) {
                return;
            }
        }
        
        // Create duplicate with new name and timestamp
        var duplicatedProject = JSON.parse(JSON.stringify(originalProject));
        duplicatedProject.name = newName;
        duplicatedProject.timestamp = new Date().toISOString();
        
        allProjects[newName] = duplicatedProject;
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        
        updateSaveStatus(`Projet "${newName}" créé`, 'success');
        
        // Refresh project manager if open
        var modal = document.getElementById('projectModal');
        if (modal.style.display !== 'none') {
            loadProjectManager();
        }
        
    } catch (error) {
        console.error('Error duplicating project:', error);
        updateSaveStatus('Erreur lors de la duplication', 'error');
    }
}

/**
 * Create a new project (clear canvas)
 */
function newProject() {
    if (confirm('Créer un nouveau projet ? Le travail actuel sera perdu s\'il n\'est pas sauvegardé.')) {
        // Clear canvas content (preserve grid)
        var objectsToRemove = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        objectsToRemove.forEach(function(obj) {
            canvas.remove(obj);
        });
        
        // Reset zoom and viewport
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        currentZoom = 1;
        updateZoomDisplay();
        
        // Reset project name
        currentProjectName = 'Nouveau projet';
        document.getElementById('currentProjectName').value = currentProjectName;
        
        canvas.renderAll();
        updateSaveStatus('Nouveau projet créé', 'info');
    }
}

/**
 * Show project manager modal
 */
function showProjectManager() {
    loadProjectManager();
    document.getElementById('projectModal').style.display = 'block';
}

/**
 * Close project manager modal
 */
function closeProjectManager() {
    document.getElementById('projectModal').style.display = 'none';
}

/**
 * Load and display all projects in the manager
 */
function loadProjectManager() {
    var allProjects = getAllProjects();
    var projectList = document.getElementById('projectList');
    
    if (Object.keys(allProjects).length === 0) {
        projectList.innerHTML = '<div class="empty-projects">Aucun projet sauvegardé</div>';
        return;
    }
    
    var html = '';
    Object.keys(allProjects).forEach(function(projectName) {
        var project = allProjects[projectName];
        var saveDate = new Date(project.timestamp).toLocaleString('fr-FR');
        var objectCount = project.objects ? project.objects.length : 0;
        var isCurrentProject = projectName === currentProjectName;
        
        html += `
            <div class="project-item ${isCurrentProject ? 'selected' : ''}">
                <div class="project-info">
                    <h4>${project.name}</h4>
                    <div class="project-meta">
                        <span>Sauvegardé : ${saveDate}</span>
                        <span>${objectCount} objet(s)</span>
                    </div>
                    <div class="project-actions">
                        <button class="btn-small btn-load-project" onclick="loadProject('${projectName}'); closeProjectManager();">
                            Charger
                        </button>
                        <button class="btn-small btn-duplicate-project" onclick="duplicateProject('${projectName}')">
                            Dupliquer
                        </button>
                        <button class="btn-small btn-delete-project" onclick="deleteProject('${projectName}')">
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    projectList.innerHTML = html;
}

/**
 * Check for existing projects and load last current project
 */
function checkForSavedProjects() {
    try {
        var allProjects = getAllProjects();
        var projectCount = Object.keys(allProjects).length;
        
        if (projectCount > 0) {
            // Try to load the last current project
            var lastCurrentProject = localStorage.getItem(CURRENT_PROJECT_KEY);
            if (lastCurrentProject && allProjects[lastCurrentProject]) {
                currentProjectName = lastCurrentProject;
                document.getElementById('currentProjectName').value = currentProjectName;
                updateSaveStatus(`${projectCount} projet(s) trouvé(s). Dernier: "${currentProjectName}"`, 'info');
            } else {
                updateSaveStatus(`${projectCount} projet(s) sauvegardé(s)`, 'info');
            }
        } else {
            updateSaveStatus('Aucun projet sauvegardé', 'info');
        }
    } catch (error) {
        console.error('Error checking for saved projects:', error);
        updateSaveStatus('Erreur de vérification', 'error');
    }
}

/**
 * Update save status display
 */
function updateSaveStatus(message, type) {
    var statusElement = document.getElementById('saveStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'status';
        
        // Add type-specific styling
        switch (type) {
            case 'success':
                statusElement.style.color = '#28a745';
                statusElement.style.fontWeight = '500';
                break;
            case 'error':
                statusElement.style.color = '#dc3545';
                statusElement.style.fontWeight = '500';
                break;
            case 'info':
                statusElement.style.color = '#666';
                statusElement.style.fontWeight = 'normal';
                break;
            default:
                statusElement.style.color = '#666';
                statusElement.style.fontWeight = 'normal';
        }
        
        // Clear success/error styling after 3 seconds
        if (type === 'success' || type === 'error') {
            setTimeout(function() {
                if (statusElement) {
                    statusElement.style.color = '#666';
                    statusElement.style.fontWeight = 'normal';
                }
            }, 3000);
        }
    }
}

/**
 * Auto-save functionality (optional)
 */
function enableAutoSave() {
    // Auto-save current project every 3 minutes if there are changes
    setInterval(function() {
        var objects = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        if (objects.length > 0 && currentProjectName) {
            // Only auto-save if project has a meaningful name
            if (currentProjectName !== 'Nouveau projet' && currentProjectName.trim() !== '') {
                saveCurrentProject();
                console.log('Auto-saved project:', currentProjectName);
            }
        }
    }, 180000); // 3 minutes
}
