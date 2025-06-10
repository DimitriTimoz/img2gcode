/**
 * Enhanced Zoom and Pan System Module
 * Handles canvas zoom and pan functionality with performance optimizations
 */

/**
 * Enhanced zoom management with validation and performance optimization
 */
const ZoomManager = {
    animationFrame: null,
    isZooming: false,
    
    /**
     * Smooth zoom with animation
     */
    smoothZoom: function(targetZoom, centerPoint) {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const currentZoom = canvas.getZoom();
        const steps = 10;
        const zoomStep = (targetZoom - currentZoom) / steps;
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep < steps) {
                const newZoom = currentZoom + (zoomStep * currentStep);
                this.setZoom(newZoom, centerPoint);
                currentStep++;
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.setZoom(targetZoom, centerPoint);
                this.isZooming = false;
            }
        };
        
        this.isZooming = true;
        animate();
    },
    
    /**
     * Set zoom with validation and caching
     */
    setZoom: function(zoom, centerPoint) {
        const clampedZoom = AppUtils.clamp(zoom, APP_CONFIG.MIN_ZOOM, APP_CONFIG.MAX_ZOOM);
        
        if (centerPoint) {
            canvas.zoomToPoint(centerPoint, clampedZoom);
        } else {
            const center = canvas.getCenter();
            canvas.zoomToPoint(new fabric.Point(center.left, center.top), clampedZoom);
        }
        
        AppGlobalState.currentZoom = canvas.getZoom();
        this.updateZoomDisplay();
        this.updateMeasurementIndicators();
    },
    
    /**
     * Update zoom display with throttling
     */
    updateZoomDisplay: AppUtils.throttle(function() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            const percentage = Math.round(AppGlobalState.currentZoom * 100);
            zoomDisplay.textContent = `${percentage}%`;
        }
    }, 50),
    
    /**
     * Update measurement indicators with throttling  
     */
    updateMeasurementIndicators: AppUtils.throttle(function() {
        try {
            if (typeof updateMeasurementIndicators === 'function') {
                updateMeasurementIndicators();
            }
        } catch (error) {
            console.warn('Failed to update measurement indicators:', error);
        }
    }, 100)
};

/**
 * Enhanced zoom functions with better UX
 */
function zoomIn() {
    try {
        const currentZoom = canvas.getZoom();
        const newZoom = Math.min(currentZoom + APP_CONFIG.ZOOM_STEP, APP_CONFIG.MAX_ZOOM);
        
        const center = canvas.getCenter();
        ZoomManager.setZoom(newZoom, new fabric.Point(center.left, center.top));
        
    } catch (error) {
        console.warn('Zoom in failed:', error);
    }
}

function zoomOut() {
    try {
        const currentZoom = canvas.getZoom();
        const newZoom = Math.max(currentZoom - APP_CONFIG.ZOOM_STEP, APP_CONFIG.MIN_ZOOM);
        
        const center = canvas.getCenter();
        ZoomManager.setZoom(newZoom, new fabric.Point(center.left, center.top));
        
    } catch (error) {
        console.warn('Zoom out failed:', error);
    }
}

function resetZoom() {
    try {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        AppGlobalState.currentZoom = canvas.getZoom();
        ZoomManager.updateZoomDisplay();
        ZoomManager.updateMeasurementIndicators();
        
    } catch (error) {
        console.warn('Reset zoom failed:', error);
    }
}

// Legacy function for compatibility
function updateZoomDisplay() {
    ZoomManager.updateZoomDisplay();
}

/**
 * Enhanced fit to window with better calculation and animation
 */
function fitToWindow() {
    try {
        const area = WORKSPACE_CONFIG.usableArea;
        const canvasElement = canvas.getElement();
        const containerPadding = 60;
        
        const availableWidth = canvasElement.parentElement.clientWidth - containerPadding;
        const availableHeight = canvasElement.parentElement.clientHeight - containerPadding;
        
        const scaleX = availableWidth / area.width;
        const scaleY = availableHeight / area.height;
        const optimalZoom = Math.min(scaleX, scaleY, 1.5); // Allow up to 150% zoom
        
        // Calculate center position
        const centerX = availableWidth / 2;
        const centerY = availableHeight / 2;
        
        // Apply smooth transition
        const targetTransform = [
            optimalZoom, 0, 0, optimalZoom,
            centerX - (area.offsetX + area.width/2) * optimalZoom,
            centerY - (area.offsetY + area.height/2) * optimalZoom
        ];
        
        // Animate the transformation
        const currentTransform = canvas.viewportTransform.slice();
        const steps = 20;
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep < steps) {
                const progress = currentStep / steps;
                const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
                
                const interpolatedTransform = currentTransform.map((current, index) => {
                    return current + (targetTransform[index] - current) * easedProgress;
                });
                
                canvas.setViewportTransform(interpolatedTransform);
                AppGlobalState.currentZoom = canvas.getZoom();
                
                currentStep++;
                requestAnimationFrame(animate);
            } else {
                canvas.setViewportTransform(targetTransform);
                AppGlobalState.currentZoom = canvas.getZoom();
                ZoomManager.updateZoomDisplay();
                ZoomManager.updateMeasurementIndicators();
            }
        };
        
        animate();
        
    } catch (error) {
        console.warn('Fit to window failed:', error);
    }
}

/**
 * Enhanced pan controls with keyboard support
 */
const PanManager = {
    panStep: 50, // pixels
    
    panLeft: function() {
        this.panBy(-this.panStep, 0);
    },
    
    panRight: function() {
        this.panBy(this.panStep, 0);
    },
    
    panUp: function() {
        this.panBy(0, -this.panStep);
    },
    
    panDown: function() {
        this.panBy(0, this.panStep);
    },
    
    panBy: function(deltaX, deltaY) {
        try {
            const transform = canvas.viewportTransform.slice();
            transform[4] += deltaX;
            transform[5] += deltaY;
            canvas.setViewportTransform(transform);
            
        } catch (error) {
            console.warn('Pan operation failed:', error);
        }
    },
    
    centerWorkspace: function() {
        try {
            const area = WORKSPACE_CONFIG.usableArea;
            const canvasElement = canvas.getElement();
            
            const centerX = canvasElement.width / 2;
            const centerY = canvasElement.height / 2;
            
            const currentZoom = canvas.getZoom();
            const transform = [
                currentZoom, 0, 0, currentZoom,
                centerX - (area.offsetX + area.width/2) * currentZoom,
                centerY - (area.offsetY + area.height/2) * currentZoom
            ];
            
            canvas.setViewportTransform(transform);
            
        } catch (error) {
            console.warn('Center workspace failed:', error);
        }
    }
};

/**
 * Zoom to specific area or object
 */
function zoomToArea(left, top, width, height, padding = 50) {
    try {
        const canvasElement = canvas.getElement();
        const availableWidth = canvasElement.width - padding * 2;
        const availableHeight = canvasElement.height - padding * 2;
        
        const scaleX = availableWidth / width;
        const scaleY = availableHeight / height;
        const optimalZoom = Math.min(scaleX, scaleY, APP_CONFIG.MAX_ZOOM);
        
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        
        const canvasCenterX = canvasElement.width / 2;
        const canvasCenterY = canvasElement.height / 2;
        
        const transform = [
            optimalZoom, 0, 0, optimalZoom,
            canvasCenterX - centerX * optimalZoom,
            canvasCenterY - centerY * optimalZoom
        ];
        
        canvas.setViewportTransform(transform);
        AppGlobalState.currentZoom = canvas.getZoom();
        ZoomManager.updateZoomDisplay();
        
    } catch (error) {
        console.warn('Zoom to area failed:', error);
    }
}

/**
 * Zoom to selected objects
 */
function zoomToSelection() {
    try {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length === 0) return;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        activeObjects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.left + bounds.width);
            maxY = Math.max(maxY, bounds.top + bounds.height);
        });
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        zoomToArea(minX, minY, width, height, 100);
        
    } catch (error) {
        console.warn('Zoom to selection failed:', error);
    }
}
