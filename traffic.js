/**
 * Main controller
 */

import Vehicle from "./models/Vehicle.js"
import Edge from "./models/Edge.js"
import Lane from "./models/Lane.js"
import Node from "./models/Node.js"
import Port from "./models/Port.js"
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

let dt = 1/30;
let animationID = null;
let isRunning = false;
let elapsed = 0;

export async function initialize() {
    when = 0.0;
    isRunning = false;
    addListeners();

    await loadMap("test-map");

    MAPVIEW.initialize();

    spit("initialized!");
}

function spit(message) {
    const spitoon = document.getElementById("debug");

    debugText = `t = ${when}: ${message}<br>${debugText}`;
    spitoon.innerHTML = debugText;
}


async function step() {
    stopAnimation()
    const now = new Date();
    updateModel(dt);
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
}

function stopAnimation() {
    isRunning = false;
    if (animationID) cancelAnimationFrame(animationID);
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
    out += "<tr><th>ID</th><th>LaneID</th><th>Lane #</th><th>Pos</th><th>Speed</th><th>Acc</th></tr>";

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
    const theEdge = theEdges[1];
    const theLaneNumber = theEdge.nLanes - 1;     //  right lane
    const theLane = theEdge.lanes[theLaneNumber];
    const where = new Location(theLane, 0);
    const me = new Vehicle(where, 0, 0);
    theVehicles.push(me);
    me.where.u = me.length;

    redraw();
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
    redraw();
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
    kHeadlightColor: "#ffffff",

    //  edge display
    kEdgeThickness: 0.5,
    kNodeRadius: 3,
}

export function getNextEdge(iEdge) {
    let outEdge = null;

    const theConnectingNode = iEdge.connectTo;
    if (theConnectingNode.outEdges.length > 0) {
        outEdge = theConnectingNode.outEdges[0];
    }
    return outEdge;
}

export function getNextLane(iLane) {
    //  todo: reduce these calculations by pre-computing lanes' next lanes when we read in the map

    let outLane = null;
    const portOut = iLane.portOut;
    if (!portOut) {   console.log(`    no next lane for ${iLane.id}`);
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

    //  convert to the "Node" class and give each Node an id key (`theNodes` is a dictionary with id keys and Nodes as values)
    for (let k in loadedMap.nodes) {
        const jsonNode = loadedMap.nodes[k];
        theNodes[k] = new Node(k, jsonNode);
        nNodes++
    }

    //  convert to the "Edge" class and give each Edge an id key (`theEdges` is a dictionary with id keys and Edges as values)
    for (let k in loadedMap.edges) {
        const JSONedge = loadedMap.edges[k];    //  one edge, k is the key

        const from = theNodes[JSONedge.from];   //  a node
        const to = theNodes[JSONedge.to];

        const newEdge = new Edge(k, from, to, JSONedge);    //  also creates lanes
        theEdges[k] = newEdge;
        theNodes[JSONedge.to].inEdges.push(newEdge);
        theNodes[JSONedge.from].outEdges.push(newEdge);

        nEdges++;
    }

    spit(`loaded ${nEdges} edges and ${nNodes} nodes.`);

    //  find the widest edge...
    //  we need widths to find the ports...

    for (let k in theNodes) {
        let theWidth = 0;
        const node = theNodes[k];
        node.outEdges.forEach(edge => {
            if (edge.width > theWidth) {
                theWidth = edge.length;
            }
        });
        node.inEdges.forEach(edge => {
            if (edge.width > theWidth) {
                theWidth = edge.length;
            }
        })

        node.width = theWidth;      //  we will use this for the width of the junction
        console.log(`   node #${node.id} has width ${node.width.toFixed(1)}`);
    }

    //  create the ports for each node

    for (let k in theNodes) {
        createPorts(theNodes[k]);
    }

}

function createPorts(node) {
    console.log(`   creating ports for node #${node.id}`);

    node.inPorts = [];
    node.outPorts = [];

    //  create the in-ports, then the out-ports

    node.inEdges.forEach(edge => {
        edge.lanes.forEach(lane => {
            const newPort = new Port(node, lane, "in");
            node.inPorts.push(newPort);
        });
    });

    node.outEdges.forEach(edge => {
        edge.lanes.forEach(lane => {
            const newPort = new Port(node, lane, "out");
            node.outPorts.push(newPort);
        });
    });


    //  now calculate the length reductions for each edge coming into the node:

    node.inEdges.forEach( e0 => {
        node.outEdges.forEach( e1 => {
            const theReduction = getEdgeReduction(e0, e1);
            //  reduce the length of the "incoming" edge
            //  which is at its "out" end
            if (theReduction > e0.outReduction) {
                e0.outReduction = theReduction;
            }
            //  reduce the length of the "outgoing" edge, at its "in" end
            if (theReduction > e1.inReduction) {
                e1.inReduction = theReduction;
            }
            console.log(
                `     connection E${e0.id} -> E${e1.id} reducing lengths by ${theReduction.toFixed(2)}`
            )
        })
    });

    //  find locations for all in-ports

    node.inPorts.forEach(p0 => {
        const lane = p0.roadLane;
        const reduction = p0.edge.outReduction;
        const rightVector = p0.unitVector.perpendicular();
        const portVector = p0.unitVector.multiply(-reduction)
            .add(rightVector.multiply(lane.offset));
        p0.origin = p0.node.origin.add(portVector);
        p0.adjustLaneEndsToMatch();
        //  p0.setXY(p0.node.origin.x + portVector.x, p0.node.origin.y + portVector.y)
        console.log(`     inPort ${p0.id} is at (${p0.origin.x.toFixed(1)}, ${p0.origin.y.toFixed(1)})`);
    })

    node.outPorts.forEach(p0 => {
        const lane = p0.roadLane;
        const reduction = p0.edge.inReduction;
        const rightVector = p0.unitVector.perpendicular();
        const portVector = p0.unitVector.multiply(reduction)
            .add(rightVector.multiply(lane.offset));
        p0.origin = p0.node.origin.add(portVector);
        p0.adjustLaneEndsToMatch();

        //  p0.setXY(p0.node.origin.x + portVector.x, p0.node.origin.y + portVector.y)
        console.log(`     outPort ${p0.id} is at (${p0.origin.x.toFixed(1)}, ${p0.origin.y.toFixed(1)})`);
    })

    //  for now, only two edge connections per node, one in one out

    //  connect every in EDGE to every out EDGE, given lane numbers match
    //  these are the "internal" connections
    node.inPorts.forEach(p0 => {
        node.outPorts.forEach(p1 => {
            if (p0.roadLane.laneNumber === p1.roadLane.laneNumber) {
                const inPort = p0;
                const outPort = p1;
                const aLane = Lane.fromPorts(inPort, outPort);
                p0.junctionLanes.push(aLane);
                p1.junctionLanes.push(p1.roadLane);
                node.junctionLanes.push(aLane);

                //  todo: consider other possibilities of OK connections

                console.log(`     node  #${node.id} (internal) connecting L${inPort.roadLane.id} to junction lane L${aLane.id}`);
            }
        })

    });

}

/**
 * Given two edges (at a node) calculate the amount that each edge's
 * length will need to be reduced to account for the junction.
 *
 * @param e1
 * @param e2
 */
function getEdgeReduction(e1, e2) {
    let theReduction = 0;
    //  let phi be the angle between the two unit vectors
    const sinTheta = e1.unitVectorOut.cross(e2.unitVectorIn); //  positive for left turns

    if (sinTheta > 0) {
        console.log(`   edge ${e1.id} is to the right of edge ${e2.id}`);
        //  theReduction remains zero...
    } else {
        const cosTheta = e1.unitVectorOut.dot(e2.unitVectorIn);
        //  now, phi is theta / 2...
        const tanPhi = Math.sqrt((1 - cosTheta) / (1 + cosTheta));
        theReduction = e1.width * tanPhi;
        console.log(`   edge ${e1.id} is to the left of edge ${e2.id}, reducing by ${theReduction.toFixed(2)}`);
    }
    return theReduction;
}


export function minIgnoringNulls(values) {
    const filtered = values.filter(v => v !== null);
    return filtered.length > 0 ? Math.min(...filtered) : null;
}


