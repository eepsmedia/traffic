/**
 * Entirely written by Claude
 *
 */
import {resizeWindow} from "./views/mapView.js"

let currentEditingVehicle = null;

// Show the editor with vehicle data
export function showCarEditor(vehicle) {
    currentEditingVehicle = vehicle;

    // Populate form with current values
    document.getElementById('vehicleLength').value = vehicle.length;
    document.getElementById('vehicleWidth').value = vehicle.width;
    document.getElementById('bodyColor').value = vehicle.bodyColor;

    document.getElementById('maxSpeed').value = vehicle.driver.maxSpeed;
    document.getElementById('tau').value = vehicle.driver.tau;
    document.getElementById('maxAcceleration').value = vehicle.driver.maxAcceleration;
    document.getElementById('maxDeceleration').value = vehicle.driver.maxDeceleration;
    document.getElementById('overSpeedLimit').value = vehicle.driver.overSpeedLimit;
    document.getElementById('lookAhead').value = vehicle.driver.lookAhead;

    // Update all display values
    updateAllDisplayValues();

    // Show the panel and adjust layout
    document.getElementById('carEditor').classList.add('visible');

    // Trigger resize to account for panel space
    setTimeout(() => {
        resizeWindow();
    }, 300); // Match the CSS transition duration (0.3s)
}

// Hide the editor
function hideCarEditor() {
    document.getElementById('carEditor').classList.remove('visible');
    currentEditingVehicle = null;

    // Trigger resize to reclaim panel space
    setTimeout(() => {
        resizeWindow();
    }, 300); // Match the CSS transition duration (0.3s)

}

// Update display values for all range inputs
function updateAllDisplayValues() {
    const ranges = document.querySelectorAll('input[type="range"]');
    ranges.forEach(range => {
        const displaySpan = document.getElementById(range.id + 'Value');
        if (displaySpan) {
            displaySpan.textContent = range.value;
        }
    });
}

// Apply changes to the vehicle
export function applyCarEdit() {
    if (!currentEditingVehicle) return;

    const vehicle = currentEditingVehicle;

    // Update vehicle properties
    vehicle.length = parseFloat(document.getElementById('vehicleLength').value);
    vehicle.width = parseFloat(document.getElementById('vehicleWidth').value);
    vehicle.bodyColor = document.getElementById('bodyColor').value;

    // Update driver properties
    vehicle.driver.maxSpeed = parseFloat(document.getElementById('maxSpeed').value);
    vehicle.driver.tau = parseFloat(document.getElementById('tau').value);
    vehicle.driver.maxAcceleration = parseFloat(document.getElementById('maxAcceleration').value);
    vehicle.driver.maxDeceleration = parseFloat(document.getElementById('maxDeceleration').value);
    vehicle.driver.overSpeedLimit = parseFloat(document.getElementById('overSpeedLimit').value);
    vehicle.driver.lookAhead = parseFloat(document.getElementById('lookAhead').value);

    // Trigger a redraw to show changes
    if (window.TRAFFIC && window.TRAFFIC.draw) {
        window.TRAFFIC.draw();
    }

    hideCarEditor();
}

export function cancelCarEdit() {
    hideCarEditor();
}

// Add event listeners for live value updates
document.addEventListener('DOMContentLoaded', function() {
    const ranges = document.querySelectorAll('input[type="range"]');
    ranges.forEach(range => {
        range.addEventListener('input', function() {
            const displaySpan = document.getElementById(this.id + 'Value');
            if (displaySpan) {
                displaySpan.textContent = this.value;
            }
        });
    });
});
