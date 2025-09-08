/**
 * Main controller
 */

import Vehicle from "./models/Vehicle.js"
import Location from "./models/Location.js"
import * as MAPVIEW from "./views/mapView.js"
import * as CAREDIITOR from "./carEditor.js"
import * as MAPMAKER from "./models/mapMaker.js"

export let when;
export let theVehicles = [];
let debugText = "";

export let theEdges = {};
export let theNodes = {};

export let focusCar = null;

let dt = 0.02;      //  1/30;
const stepDT = 0.5;
let animationID = null;
let isRunning = false;
let elapsed = 0;
export let codapData = [];

let randomLaneChangeProbability = 0.0;

export async function initialize() {
    when = 0.0;
    isRunning = false;
    addListeners();

    await MAPMAKER.loadMap("test-intersections");

    setUpCODAPData();
    MAPVIEW.initialize();
    setFocusDataVisibility();
    setStartStopVisibility();

    spit("initialized!");
}

export function spit(message) {
    const spitoon = document.getElementById("debug");

    debugText = `t = ${when}: ${message}<br>${debugText}`;
    spitoon.innerHTML = debugText;
}

function step() {
    stopAnimation()
    const now = new Date();
    updateModel(stepDT);
    redraw();
    elapsed = new Date() - now;
}

function updateModel(dt) {
    theVehicles.forEach(c => c.step(dt));
    when += dt;
    theVehicles.forEach(c => c.setAcceleration(dt));
    theVehicles.forEach(c => c.driver.decideAboutLaneChange(dt));
}

function redraw() {
    MAPVIEW.draw();
    displayStep();
    displayFocusCarData();
    displayCarsTable();
}

function animate() {
    if (isRunning) {
        isRunning = true;
        const now = new Date();
        updateModel(dt);
        redraw();
        animationID = requestAnimationFrame(animate);
        elapsed = new Date() - now;
    }
}

function startAnimation() {
    if (isRunning) return;
    isRunning = true;
    animationID = requestAnimationFrame(animate);
    setStartStopVisibility();
}

function stopAnimation() {
    isRunning = false;
    if (animationID) cancelAnimationFrame(animationID);
    setStartStopVisibility();

}

function displayStep() {
    const timeDisplay = document.getElementById("timeDisplay");
    timeDisplay.innerHTML = `${when.toFixed(1)}`;
    const frameRateDisplay = document.getElementById("frameRateDisplay");
    frameRateDisplay.innerHTML = `${elapsed.toFixed(1)} ms`;
}

function displayCarsTable() {
    const spitoon = document.getElementById("debug");
    let out = "<table class = 'carTable'>";
    out += "<tr><th>ID</th><th width='80'>LaneID</th><th>Lane #</th><th>Pos</th><th>Speed</th><th>Acc</th></tr>";

    theVehicles.forEach(c => {

        out += c.getTableLine();
        //  spit(`&emsp;&emsp;&emsp;&emsp;E ${c.where.edge.id} L ${c.where.lane} ${c.where.u.toFixed(2)} ${c.speed.toFixed(2)} ${c.acceleration.toFixed(2)}`);
    })

    out += "</table>";
    document.getElementById("debug").innerHTML = out;

    spitoon.innerHTML = out;
}

function displayFocusCarData() {
    const theData = focusCar ? focusCar.getFocusString() : null;
    const thePlace = document.getElementById("focusCarString");
    thePlace.innerHTML = theData ? theData : "no focus car";
}

function newCar() {
    const theEdge = theEdges[1];        //  the "1" is the id of the first edge.
    const theLaneNumber = Math.floor(Math.random() * theEdge.nLanes);   //    theEdge.nLanes - 1;     //  right lane
    const theLane = theEdge.lanes[theLaneNumber];
    const where = new Location(theLane, 0);
    const me = new Vehicle(where, 0, 0);
    theVehicles.push(me);
    me.where.u = me.length;

    redraw();
}

function deleteCar(iCar) {
    if (iCar) {
        removeVehicleByID(iCar.id);
        if (iCar === focusCar) {
            focusCar = null;
        }
        console.log(`    #${iCar.id} was removed from the map`);
    } else {
        removeVehicleByID(focusCar.id);
        focusCar = null;
    }
    redraw()
}

export function removeVehicleByID(iID) {
    const index = theVehicles.findIndex(c => c.id === iID);
    if (index >= 0) {
        theVehicles.splice(index, 1);
        console.log(`    #${iID} drove off the end`);
    }
}

export function setFocusCar(event, iCar) {
    console.log(`traffic setFocusCar(${iCar.getFocusString()})`);
    focusCar = (iCar === focusCar) ? null : iCar;
    setFocusDataVisibility();
    redraw();
}

function setFocusDataVisibility() {
    document.getElementById("focusCarControls").style.display = focusCar ? "flex" : "none";
}

function setStartStopVisibility() {
    const startButton = document.getElementById("startButton");
    startButton.style.display = isRunning ? "none" : "inline";
    const stopButton = document.getElementById("stopButton");
    stopButton.style.display = isRunning ? "inline" : "none";
}

function addListeners() {
    document.getElementById('stepButton').addEventListener('click', () => {
        step();
    });
    document.getElementById('carButton').addEventListener('click', () => {
        newCar();
    });
    document.getElementById('editCarButton').addEventListener('click', () => {
        CAREDIITOR.showCarEditor(focusCar);
    });
    document.getElementById('deleteCarButton').addEventListener('click', () => {
        deleteCar(focusCar);
    });
    document.getElementById('rescaleButton').addEventListener('click', () => {
        rescale();
    });
    document.getElementById('emitDataButton').addEventListener('click', () => {
        emitData();
    });
    document.getElementById('cancelCarEditButton').addEventListener('click', () => {
        CAREDIITOR.cancelCarEdit(focusCar);
    });
    document.getElementById('applyCarEditButton').addEventListener('click', () => {
        CAREDIITOR.applyCarEdit(focusCar);
    });
    document.getElementById('startButton').addEventListener('click', () => {
        startAnimation();
    });
    document.getElementById('stopButton').addEventListener('click', () => {
        stopAnimation();
    });


}

function rescale() {
    MAPVIEW.rescale();
}

function setUpCODAPData() {
    codapData = ["id,when,dist,speed,acceleration,laneID,u,effLane"];
}

function emitData() {
    navigator.clipboard.writeText(codapData.join("\n"));
    alert(`${codapData.length} csv lines copied to clipboard`);
}

export const constants = {

    //  behavior
    kDefaultLookAhead: 300,    //      m
    kDefaultTau: 3,    //      s, for following distance
    kDefaultMaxSpeed: 120,     //      mph
    kDefaultMaxAcceleration: 2,    //  m/s^2
    kDefaultMaxDeceleration: 4,    //  m/s^2
    kDefaultOverSpeedLimit: 2,     //      m/s
    kDefaultCoastAcceleration: -0.5,    //      m / s^2
    kDefaultDesiredSpeedZoneWidth: 1,  //  how many m/s above the desired speed is still OK
    kDefaultLaneChangeDuration: 3,

    //  lanes
    kDefaultSpeedLimit: 11, //      just under 25 mph
    kDefaultLaneWidth: 3.6,
    kDefaultMedianWidth: 1.0,      //  for two-way roads, half-width!
    kDefaultShoulderWidth: 2.5,      //  parking area
    kDefaultMedianColor: "#c4c4c4",
    kDefaultShoulderColor: "#c4c4c4",
    kDefaultLaneColor: "#cccccc",

    //cars
    kDefaultCarLength: 4.6,    //      VW ID.4
    kDefaultCarWidth: 1.9,      //      VW ID.4
    kDefaultBodyColor: "#5588cc",
    kFocusBodyColor: "#00ffff",
    kHeadlightRadius: 0.35,
    kTaillightRadius: 0.45,
    kBrakelightRadius: 0.75,
    kHeadlightColor: "#ffffff",
    kTaillightColor: "#ff0000",

    //  edge display
    kEdgeThickness: 0.3,
    kNodeRadius: 1.2,
}

export function getNextLane(iLane) {
    //  todo: reduce these calculations by pre-computing lanes' next lanes when we read in the map

    let outLane = null;
    const portOut = iLane.portOut;
    if (!portOut) {
        console.log(`    no next lane for ${iLane.id}`);
        return null;
    }

    if (portOut.inOut === "out") {  //  we are leaving a junction
        outLane = portOut.roadLane;
    } else {
        outLane = portOut.junctionLanes[0];
    }

    if (!outLane) {
        //  console.log(`    no next lane for ${iLane.id}`);
        return null;
    }
    //  console.log(`    next lane after ${iLane.id} is ${outLane.id}`);
    return outLane;
}


export function minIgnoringNulls(values) {
    const filtered = values.filter(v => v !== null);
    return filtered.length > 0 ? Math.min(...filtered) : null;
}


