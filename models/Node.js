import * as TRAFFIC from "../traffic.js"
import * as MAPMAKER from "./mapMaker.js"

import Lane from "./Lane.js";
import Port from "./Port.js";
//  import {getEdgeReduction} from "./mapMaker.js";


export default class Node {

    constructor(iKey, iJSON) {
        this.id = iKey;
        this.origin = new Vector(iJSON.x, iJSON.y);
        this.x = iJSON.x;
        this.y = iJSON.y;

        this.inEdges = [];      //  array of edges (not IDs)
        this.outEdges = [];

        this.inPorts = [];      //  array of ports (not IDs)
        this.outPorts = [];

        this.junctionLanes = [];    //  "inner" lanes, connecting inPorts to outPorts

    }

    getAllMyVehicles() {
        let out = [];
        TRAFFIC.theVehicles.forEach((v) => {
            if (v.where.lane.node && v.where.lane.node.id === this.id) {
                out.push(v);
            }
        })
        return out;
    }

    findWidth() {
        let theWidth = 0;

        this.outEdges.forEach(edge => {
            if (edge.width > theWidth) {
                theWidth = edge.width;
            }
        });
        this.inEdges.forEach(edge => {
            if (edge.width > theWidth) {
                theWidth = edge.width;
            }
        })

        this.width = theWidth;      //  we will use this for the width of the junction
        console.log(`   node #${this.id} has width ${this.width.toFixed(1)}`);
    }

    makeEdgeReductions() {
        //  now calculate the length reductions for each edge coming into the node:

        this.inEdges.forEach(e0 => {
            this.outEdges.forEach(e1 => {
                const theReduction = Node.getEdgeReduction(e0, e1);

                //  reduce the length of the "incoming" edge, which is at its "out" end
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
    }

    createPorts() {

        const node = this;

        console.log(`   creating ports for node #${node.id}`);

        this.inPorts = [];
        this.outPorts = [];

        //  create the in-ports, then the out-ports

        this.inEdges.forEach(edge => {
            edge.lanes.forEach(lane => {
                const newPort = new Port(this, lane, "in");
                this.inPorts.push(newPort);
            });
        });

        this.outEdges.forEach(edge => {
            edge.lanes.forEach(lane => {
                const newPort = new Port(this, lane, "out");
                this.outPorts.push(newPort);
            });
        });
    }

    locatePorts() {
        //  find locations for all in-ports

        this.inPorts.forEach(p0 => {
            const lane = p0.roadLane;
            const reduction = p0.edge.outReduction;
            const rightVector = p0.unitVector.perpendicular();
            const portVector = p0.unitVector.multiply(-reduction)
                .add(rightVector.multiply(lane.offset));
            p0.origin = p0.node.origin.add(portVector);
            p0.adjustLaneEndsToMatch();
            console.log(`     inPort ${p0.id} is at (${p0.origin.x.toFixed(1)}, ${p0.origin.y.toFixed(1)})`);
        })

        //  find locations for all out-ports

        this.outPorts.forEach(p0 => {
            const lane = p0.roadLane;
            const reduction = p0.edge.inReduction;
            const rightVector = p0.unitVector.perpendicular();
            const portVector = p0.unitVector.multiply(reduction)
                .add(rightVector.multiply(lane.offset));
            p0.origin = p0.node.origin.add(portVector);
            p0.adjustLaneEndsToMatch();
            console.log(`     outPort ${p0.id} is at (${p0.origin.x.toFixed(1)}, ${p0.origin.y.toFixed(1)})`);
        })
    }

    createJunctionLanes() {

        //  for now, only two edge connections per node, one in one out

        console.log(`   creating junction lanes for node #${this.id}`);
        //  connect every in EDGE to every out EDGE, given lane numbers match
        //  these are the "internal" connections
        this.inPorts.forEach(inPort => {
            this.outPorts.forEach(outPort => {
                if (inPort.roadLane.laneNumber === outPort.roadLane.laneNumber) {
                    const aLane = Lane.fromPorts(inPort, outPort);  //  make new `Lane` object
                    inPort.junctionLanes.push(aLane);
                    outPort.junctionLanes.push(outPort.roadLane);   //  todo: figure out if this is necessary.
                    this.junctionLanes.push(aLane);
                    const outID = outPort.roadLane.id;

                    //  junction lanes like this have only one route role.
                    aLane.routeRole = MAPMAKER.getRoleFromUnitVectors(inPort.unitVector, outPort.unitVector);

                    //  todo: consider other possibilities of OK connections

                    console.log(`     node  #${this.id} (internal) connecting L${inPort.roadLane.id} to junction lane L${aLane.id}`);
                }
            })

        });

    }

    assignRouteRolesToJunctionLanes() {

    }

    /**
     * Given two edges (at a node) calculate the amount that each edge's
     * length will need to be reduced to account for the junction.
     *
     * @param e1
     * @param e2
     */
    static getEdgeReduction(e1, e2) {
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

            //  note: uses edge width rather than entire node width
            //  (but what if the roads coming in have different widths??)
            theReduction = e1.width * tanPhi;
            console.log(`   edge ${e1.id} is to the left of edge ${e2.id}, reducing by ${theReduction.toFixed(2)}`);
        }
        return theReduction;
    }

}