/**
 * Project Management Module
 * Handles multi-project save/load system
 */

/**
 * Get all saved projects
 */
function getAllProjects() {
    try {
        var projectsData = localStorage.getItem(PROJECTS_STORAGE_KEY);
        return projectsData ? JSON.parse(projectsData) : {};
    } catch (error) {
        console.error('Error getting projects:', error);
        return {};
    }
}

/**
 * Save current project with given name
 */
function saveCurrentProject() {
    var projectName = document.getElementById('currentProjectName').value.trim();
    if (!projectName) {
        alert('Veuillez entrer un nom pour le projet');
        return;
    }
    
    try {
        // Get all canvas objects except grid elements
        var objectsToSave = canvas.getObjects().filter(function(obj) {
            return !obj.excludeFromExport;
        });
        
        // Prepare the project data
        var projectData = {
            name: projectName,
            version: '1.0',
            timestamp: new Date().toISOString(),
            zoom: currentZoom,
            viewport: canvas.viewportTransform,
            objects: objectsToSave.map(function(obj) {
                return obj.toObject(['excludeFromExport']);
            }),
            settings: {
                grayscaleToggle: document.getElementById('grayscaleToggle').checked,
                selectedFont: document.getElementById('fontSelect').value
            }
        };
        
        // Get existing projects
        var allProjects = getAllProjects();
        allProjects[projectName] = projectData;
        
        // Save to localStorage
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        localStorage.setItem(CURRENT_PROJECT_KEY, projectName);
        
        // Update current project name
        currentProjectName = projectName;
        
        // Update status
        updateSaveStatus(`Projet "${projectName}" sauvegardé !`, 'success');
        
        console.log('Project saved:', projectName);
        
    } catch (error) {
        console.error('Error saving project:', error);
        updateSaveStatus('Erreur lors de la sauvegarde', 'error');
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
