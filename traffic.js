/**
 * Main controller
 */

import Vehicle from "./models/Vehicle.js"
import Edge from "./models/Edge.js"
import Location from "./models/Location.js"
import * as MAPVIEW from "./views/mapView.js"
import * as CAREDIITOR from "./carEditor.js"

export let when;
export let theVehicles = [];
let debugText = "";

export let theEdges = {};
export let theNodes = {};
export let theMap = {};

export let focusCar = null;

export async function initialize() {
    when = 0.0;

    document.getElementById('stepButton').addEventListener('click', () => {step();});
    document.getElementById('carButton').addEventListener('click', () => {newCar();});
    document.getElementById('editCarButton').addEventListener('click', () => {CAREDIITOR.showCarEditor(focusCar);});
    document.getElementById('cancelCarEditButton').addEventListener('click', () => {CAREDIITOR.cancelCarEdit(focusCar);});
    document.getElementById('applyCarEditButton').addEventListener('click', () => {CAREDIITOR.applyCarEdit(focusCar);});

    await loadMap("infinite");

    MAPVIEW.initialize();

    spit("initialized!");
}

function spit(message) {
    const spitoon = document.getElementById("debug");

    debugText = `t = ${when}: ${message}<br>${debugText}`;
    spitoon.innerHTML = debugText;
}

function step(dt = 1.0) {

    theVehicles.forEach(c => c.step(dt));

    when += dt;

    theVehicles.forEach(c => c.setAcceleration(dt));
    theVehicles.forEach(c => c.driver.decideAboutLaneChange(dt));

    redraw();
}

function redraw() {
    MAPVIEW.draw();
    displayStep();
    displayFocusCarData();
    displayCarsTable();
}

function displayStep() {
    const timePlace = document.getElementById("timePlace");
    timePlace.innerHTML = `${when.toFixed(1)}`;
}

function displayCarsTable() {
    const spitoon = document.getElementById("debug");
    let out = "<table class = 'carTable'>";
    out += "<tr><th>ID</th><th>Edge</th><th>Lane</th><th>Pos</th><th>Speed</th><th>Acc</th></tr>";

    theVehicles.forEach(c => {
        const focusP = c.isFocusCar() ? "*" : "";
        out += `<tr><td>${c.id}${focusP}</td><td>${c.where.edge.id}</td><td>${c.where.lane.toFixed(1)}</td><td>${c.where.u.toFixed(2)}</td><td>${c.speed.toFixed(2)}</td><td>${c.acceleration.toFixed(2)}</td></tr>`;
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
    const theEdge = theEdges[1];
    const theLane = theEdge.nLanes - 1;     //  right lane
    const where = new Location(theEdge, 0, theLane);
    const me = new Vehicle(where, 0, 0);
    theVehicles.push(me);

    redraw();
}

export function setFocusCar(event, iCar) {
    console.log(`traffic setFocusCar(${iCar.getFocusString()})`);
    focusCar = (iCar === focusCar) ? null : iCar;
    redraw();
}


export const constants = {
    kDefaultLaneWidth: 3.6,
    kDefaultSpeedLimit: 11, //      just under 25 mph
    kDefaultCarLength : 4.6,    //      VW ID.4
    kDefaultCarWidth : 1.9,      //      VW ID.4
    kDefaultLookAhead : 300,    //      m
    kDefaultTau : 3,    //      s, for following distance
    kDefaultMaxSpeed : 120,     //      mph
    kDefaultMaxAcceleration : 2,    //  m/s^2
    kDefaultMaxDeceleration : 4,    //  m/s^2
    kDefaultOverSpeedLimit : 2,     //      m/s
    kDefaultCoastAcceleration : -0.5,    //      m / s^2
    kDefaultDesiredSpeedZoneWidth : 1,  //  how many m/s above the desired speed is still OK
    kDefaultBodyColor : "blue",
    kDefaultLaneChangeDuration : 3,

    kFocusBodyColor : "yellow",
    kEdgeThickness : 0.5,
    kEdgeBulbRadius : 3,
    kHeadlightRadius : 0.35,
    kHeadlightColor : "white",
}

export function getNextEdge(iEdge)  {
    const theIndex = iEdge.connectTo;
    return theEdges[theIndex];
}

async function loadMap(iMapFilename) {
    let theFileName = `maps/${iMapFilename}.json`;
    //  this.fileNameMap[iLang];
    let response;

    try {
        response = await fetch(theFileName);
        if (!response.ok) {
            alert(`map file "${iMapFilename}" is not available. Reverting to the infinite road.`);
            response = await fetch("maps/infinite.json");
        }
    } catch (msg) {
        console.error(msg);
    }
    const theText = await response.text();
    const loadedMap = JSON.parse(theText).map;

    theMap["title"] = loadedMap.name;

    let nNodes = 0;
    let nEdges = 0;

    for (let k in loadedMap.nodes) {
        const n = loadedMap.nodes[k];
        theNodes[k] = n;
        nNodes++
    }

    //  convert to the "Edge" class and give each Edge an id key (`theEdges` is a dictionary with id keys and Edges as values)
    for (let k in loadedMap.edges) {
        const e = loadedMap.edges[k];    //  one edge, k is the key

        const from = theNodes[e.from];
        const to = theNodes[e.to];
        e.x1 = from.x;
        e.y1 = from.y;
        e.x2 = to.x;
        e.y2 = to.y;

        const newEdge = new Edge(k, e.x1, e.y1, e.x2, e.y2, e.nLanes, e.connectTo);
        theEdges[k] = newEdge;
        nEdges++;
    }

    spit(`loaded ${nEdges} edges and ${nNodes} nodes.`);
}

