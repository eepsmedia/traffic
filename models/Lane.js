import * as TRAFFIC from "../traffic.js"
import * as EDGE from "./Edge.js"


export default class Lane {

    constructor(iLaneNumber) {

        this.laneNumber = iLaneNumber;

        this.defaultSuccessor = null;
        this.defaultPredecessor = null;
    }

    /**
     * Construct a new Lane based on an Edge and a lane number.
     * Called from theEdge constructor.
     *
     * @param iEdge
     * @param iLaneNumber
     * @returns {Lane}
     */
    static fromEdge(iEdge, iLaneNumber) {
        const lane = new Lane(iLaneNumber);
        lane.type = "road";
        lane.laneType = "edge";

        lane.routeRoles = {};       //  this plural, an object, exists for "road" lanes

        lane.id = iEdge.id * 100 + iLaneNumber;

        lane.edge = iEdge;
        lane.portIn = null;     //  to be set in the Port's constructor.
        lane.portOut = null;    //  to be set in the Port's constructor.

        lane.node = null;
        lane.width = iEdge.laneWidth ? iEdge.laneWidth : TRAFFIC.constants.kDefaultLaneWidth;
        lane.color = (iEdge.laneColor) ? iEdge.laneColor : TRAFFIC.constants.kDefaultLaneColor
        lane.speedLimit = iEdge.edgeSpeedLimit ?  iEdge.edgeSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;

        lane.offset = iEdge.getLaneOffsetScalar(iLaneNumber); //  scalar
        lane.unitvectorIn = lane.edge.unitVectorIn;
        lane.unitvectorOut = lane.edge.unitVectorOut;

        const offStart = iEdge.unitVectorIn.perpendicular().multiply(lane.offset);
        const offEnd = iEdge.unitVectorOut.perpendicular().multiply(lane.offset);

        lane.start = iEdge.start.add(offStart);
        lane.end = iEdge.end.add(offEnd);

        lane.myVector = lane.end.subtract(lane.start);
        lane.mainAngle = lane.myVector.angle();

        return lane;
    }

    /**
     * Construct a new Lane based on two ports.
     * Used for lanes internal to a Node (Junction).
     *
     * Called from Node.createPorts(), from the mapMaker.
     *
     * @param iPortIn
     * @param iPortOut
     * @returns {Lane}
     */
    static fromPorts(iPortIn, iPortOut) {
        const lane = new Lane(iPortIn.roadLane.laneNumber);
        lane.type = "junction";
        lane.laneType = "node";


        lane.portIn = iPortIn;
        lane.portOut = iPortOut;

        lane.defaultSuccessor = lane.portOut.roadLane;
        lane.defaultPredecessor = lane.portIn.roadLane;

        lane.id = `${iPortIn.roadLane.id}>${iPortOut.roadLane.id}`;

        const startWidth = iPortIn.roadLane.width;
        const startColor = iPortIn.roadLane.color;
        const startSpeedLimit = iPortIn.roadLane.speedLimit;

        lane.width = startWidth ? startWidth : TRAFFIC.constants.kDefaultLaneWidth;
        lane.color = (startColor) ? startColor : TRAFFIC.constants.kDefaultLaneColor
        lane.speedLimit = startSpeedLimit ?  startSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;

        this.routeRole = null;     //  this singular exists for junction lanes.

        lane.edge = null;
        lane.node = iPortIn.node;

        lane.offset = null;

        lane.start = iPortIn.origin;
        lane.end = iPortOut.origin;

        lane.unitvectorIn = iPortIn.unitVector;
        lane.unitvectorOut = iPortOut.unitVector;

        lane.fixLaneProperties()
        return lane;
    }

    changeEnd(iPoint) {
        this.end = iPoint;  //  vector, a port's origin
        this.fixLaneProperties()
    }

    changeStart(iPoint) {
        this.start = iPoint;  //  vector, a port's origin
        this.fixLaneProperties()
    }

    fixLaneProperties() {
        this.myVector = this.end.subtract(this.start);
        this.mainAngle = this.myVector.angle();
        this.length = this.myVector.length;
    }


    uVector(u, effectiveLaneNumber) {

        if (this.type === "junction") {
            return this.start
                .add(this.myVector.unit().multiply(u));
        } else {
            //  straight case
            const offsetScalar = this.edge.getLaneOffsetScalar(effectiveLaneNumber) - this.edge.getLaneOffsetScalar(this.laneNumber);
            return this.start
                .add(this.unitvectorIn.multiply(u))
                .add(this.unitvectorIn.perpendicular().multiply(offsetScalar));
        }
    }

    angle(u) {
        return this.mainAngle;  //  todo adjust for round arcs...
    }

    toString() {
        const parent = (this.edge) ? `edge ${this.edge.id}` : `node ${this.node.id}`;
        const line1 = `Lane ${this.id} of ${parent} at ${this.start.toString()} to ${this.end.toString()}`;
        const line2 = `    laneNumber: ${this.laneNumber}, laneType: ${this.laneType}, type: ${this.type}`;
        let role1 = "";
        if (this.routeRole) {
            role1 = `    role: ${this.routeRole}`
        }
        let role2 = "";
        if (this.routeRoles) {
            for (let K in this.routeRoles) {
                role2 += `    role: ${this.routeRoles[K]}, edge: ${K}`

            }
        }
        const line3 = `    ${(this.routeRole) ? role1 : role2}`;
        return line1 + "\n" + line2 + "\n" + line3;
    }
}
