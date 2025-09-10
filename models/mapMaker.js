import * as TRAFFIC from "../traffic.js"
import Edge from "./Edge.js"
import Lane from "./Lane.js"
import Node from "./Node.js"
import Port from "./Port.js"

import {makeGrid} from "../maps/grid.js"

import * as VECTOR from "../Vector.js"


let theMap = {};

const theMaps = [
    {
        file : "test-map.json",
        title : "Default Map"
    },
    {
        file : "around-rect.json",
        title : "Round and Round"
    },
    {
        file : "test-intersections.json",
        title : "test intersections Map"
    },
    {
        file : "test-two-way.json",
        title : "test two-way roads"
    }
]


export async function loadMap(iMapFilename) {

    if (!iMapFilename) {
        iMapFilename = theMaps[0].file;
    }

    const theNodes = TRAFFIC.theNodes;
    const theEdges = TRAFFIC.theEdges;

    let theFileName = `./maps/${iMapFilename}`;
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

    //  pick one of these!

    const loadedMap = JSON.parse(theText).map;
    // const loadedMap = makeGrid().map;

    theMap["title"] = loadedMap.name;

    let nNodes = 0;
    let nEdges = 0;

    //  convert to the "Node" class and give each Node an id key (`theNodes` is a dictionary with id keys and Nodes as values)
    for (let k in loadedMap.nodes) {
        const jsonNode = loadedMap.nodes[k];
        theNodes[k] = new Node(k, jsonNode);
        nNodes++
    }

    //  convert json edges to the "Edge" class and give each Edge an id key (`theEdges` is a dictionary with id keys and Edges as values)
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

    TRAFFIC.spit(`loaded ${nEdges} edges and ${nNodes} nodes.`);

    //  find the widest edge for each node...
    //  we need widths to find the ports...

    for (let k in theNodes) {
        theNodes[k].findWidth()
    }
    for (let k in theNodes) {
        theNodes[k].makeEdgeReductions()
    }

    //  assign route roles to edges, including default successor and predecessor
    //  Note that EDGES have edges as successors. These are not within a node,
    //  but are the edges that connect to the node.like lanes.

    for (let k in theNodes) {
        const node = theNodes[k];
        node.inEdges.forEach(inEdge => {
            //  only one outEdge, so we can set the default successor and predecessor
            if (node.outEdges.length === 1) {
                const onlyOutEdge = node.outEdges[0];
                inEdge.defaultSuccessor = onlyOutEdge;
                onlyOutEdge.defaultPredecessor = inEdge;
            }
            node.outEdges.forEach(outEdge => {
                assignRouteRolesToEdges(inEdge, outEdge);
            })
        })
    }

    //  create the ports for each node, create junction lanes.
    for (let k in theNodes) {
        const node = theNodes[k];
        node.createPorts();
        node.locatePorts();
        node.createJunctionLanes();
    }

    //  Assign route roles to the LANES leading into a node.
    //  This will let cars tell whether the lane they're in will
    //  work for their route.

    for (let k in theNodes) {
        theNodes[k].inEdges.forEach(inEdge => {
            inEdge.lanes.forEach(roadLane => {
                const startingPort = roadLane.portOut;  //  the "out" port of the incoming lane, "lane"
                startingPort.junctionLanes.forEach(junctionLane => {
                    const innerRole = junctionLane.routeRole;
                    const junctionLaneID = junctionLane.id;

                    roadLane.routeRoles[junctionLaneID] = innerRole;

/*
                    if (innerRole === "straight") {
                        roadLane.defaultSuccessor = junctionLane;
                    }

                    const outLaneNumber = junctionLane.defaultSuccessor.laneNumber;
                    if (outLaneNumber === roadLane.laneNumber) {
                        roadLane.defaultSuccessor = junctionLane;
                    }
*/
                })
            })
        })
        //  node.assignRouteRolesToJunctionLanes();
    }

    displayMapState();
}       //  end loadMap()

/**
 * Assign "route roles" to an edge, e0.
 * These live in an object (`e0.routeRoles`) keyed by the various "out" edges,
 * Therefore, if you're coming into a node on edge e0,
 * you can look up the role for any "out" edge.
 *
 * Importantly, if it's "straight," then the "out" edge is the "default successor."
 *
 * @param e0
 * @param e1
 */
function assignRouteRolesToEdges(e0, e1) {

    const theRole = getRoleFromUnitVectors(e0.unitVectorOut, e1.unitVectorIn);
    if (theRole === "straight") {
        e0.defaultSuccessor = e1;
        e1.defaultPredecessor = e0;
    }

    e0.routeRoles[e1.id] = theRole;
}

export function getRoleFromUnitVectors(v0, v1) {
    const theCosine = v0.dot(v1);
    const theSine = v0.cross(v1);
    let theRole = "none";

    if (theCosine > 0.99) {
        theRole = "straight";
    } else if (theCosine < -0.99) {
        theRole = "uturn";
    } else if (theSine < 0) {
        theRole = "right";
    } else{
        theRole = "left";
    }
    return theRole
}

function displayMapState() {
    const theNodes = TRAFFIC.theNodes;
    const theEdges = TRAFFIC.theEdges;

    console.log("\n*** MAP STATE ***\n")
    for (let k in theNodes) {
        const node = theNodes[k];
        console.log(`node #${node.id} has ${node.inEdges.length} in-edges and ${node.outEdges.length} out-edges.`);
        node.junctionLanes.forEach(junctionLane => { console.log(junctionLane.toString())})
    }

    for (let k in theEdges) {
        const edge = theEdges[k];
        console.log(`edge #${edge.id} has ${edge.lanes.length} lanes.`);
        edge.lanes.forEach(lane => { console.log(lane.toString())})
    }
}

export function makeMapMenuGuts() {

    let out = "";
    theMaps.forEach(map => {
        out += `<option value="${map.file}">${map.title}</option>`;
    })
    return out;
}