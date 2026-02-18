import * as TRAFFIC from "../traffic.js"
import * as EDGE from "./Edge.js"
import * as MAPMAKER from "./mapMaker.js";


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
        lane.stop = iEdge.stop;

        lane.routeRoles = {};       //  this plural, an object, exists for "road" lanes

        lane.id = iEdge.id * 100 + iLaneNumber;

        lane.edge = iEdge;
        lane.portIn = null;     //  to be set in the Port's constructor.
        lane.portOut = null;    //  to be set in the Port's constructor.

        lane.node = null;
        lane.width = iEdge.laneWidth ? iEdge.laneWidth : TRAFFIC.constants.kDefaultLaneWidth;
        lane.color = (iEdge.laneColor) ? iEdge.laneColor : TRAFFIC.constants.kDefaultLaneColor
        lane.speedLimit = iEdge.edgeSpeedLimit ? iEdge.edgeSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;

        lane.offset = iEdge.getLaneOffsetScalar(iLaneNumber); //  scalar
        lane.unitvectorIn = lane.edge.unitVectorIn;
        lane.unitvectorOut = lane.edge.unitVectorOut;

        const offStart = iEdge.unitVectorIn.perpendicular().multiply(lane.offset);
        const offEnd = iEdge.unitVectorOut.perpendicular().multiply(lane.offset);

        lane.start = iEdge.start.add(offStart);
        lane.end = iEdge.end.add(offEnd);

        lane.myVector = lane.end.subtract(lane.start);
        lane.mainAngle = lane.myVector.angle();

        lane.maxSafeSpeed = Infinity

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
        lane.speedLimit = startSpeedLimit ? startSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;

        lane.routeRole = MAPMAKER.getRoleFromUnitVectors(iPortIn.unitVector, iPortOut.unitVector);      //  this singular exists for junction lanes.

        lane.edge = null;       //      the parent is not an Edge, it's a Node
        lane.node = iPortIn.node;

        lane.offset = null;

        lane.start = iPortIn.origin;    //  Vector
        lane.end = iPortOut.origin;

        lane.center = lane.getCenter();

        if (lane.center) {   // it's curves
            lane.radius = lane.start.subtract(lane.center);
            const scalarRadius = lane.radius.length;
            lane.maxSafeSpeed = Math.sqrt(scalarRadius * TRAFFIC.constants.kMaxTransverseAcceleration);
        } else {
            lane.radius = null;
            lane.maxSafeSpeed = Infinity
        }
        lane.unitvectorIn = iPortIn.unitVector;
        lane.unitvectorOut = iPortOut.unitVector;

        lane.fixLaneProperties()
        return lane;
    }

    getCenter(iLane) {
        let out = null;

        switch (this.routeRole) {
            case "left":
                out = this.node.origin;
                break;
            case "right":
                const p0 = this.portIn;
                const reduction = p0.edge.outReduction;
                const rightVector = p0.unitVector.perpendicular();
                const cornerVector = p0.unitVector.multiply(-reduction)
                    .add(rightVector.multiply(this.node.width));
                out = this.node.origin.add(cornerVector);

                break;
            case "uturn":
                out = this.node.origin;
                break;
            default:
                break;
        }
        return out;
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

        if (this.center) {
            //  some unit vectors relative to the center of the arc
            const endRadiusUnit = this.end.subtract(this.center).unit();
            const startRadiusUnit = this.start.subtract(this.center).unit();

            //  the angle between the two unit vectors
            const theCosine = endRadiusUnit.dot(startRadiusUnit);
            const theSine = endRadiusUnit.cross(startRadiusUnit);
            const theAngle = -Math.atan2(theSine, theCosine);   //  in radians

            this.length = Math.abs(this.radius.length * theAngle);  //  d = r * theta
        }
    }


    uVector(u, effectiveLaneNumber) {

        if (this.type === "junction") {
            if (this.center) {
                const angleIsPositive = this.unitvectorIn.cross(this.unitvectorOut) >= 0;
                const theAngle = angleIsPositive ? u / this.radius.length : -u / this.radius.length;   //      u is the arc distance
                const currentR = this.radius.rotate(theAngle);
                return this.center.add(currentR);
            } else {
                return this.start.add(this.myVector.unit().multiply(u));
            }
        } else {
            //  straight case
            const offsetScalar = this.edge.getLaneOffsetScalar(effectiveLaneNumber) - this.edge.getLaneOffsetScalar(this.laneNumber);
            return this.start
                .add(this.unitvectorIn.multiply(u))
                .add(this.unitvectorIn.perpendicular().multiply(offsetScalar));
        }
    }

    angle(u) {
        if (this.center) {
            const angleIsPositive = this.unitvectorIn.cross(this.unitvectorOut) >= 0;
            const theAngle = angleIsPositive ? u / this.radius.length : -u / this.radius.length;   //      u is the arc distance
            return theAngle + this.unitvectorIn.angle();
        } else {
            return this.mainAngle;
        }
    }

    toString() {
        const parent = (this.edge) ? `edge ${this.edge.id}` : `node ${this.node.id}`;
        const line1 = `Lane ${this.id} of ${parent} at ${this.start.toString()} to ${this.end.toString()} default: ${(this.defaultSuccessor) ? this.defaultSuccessor.id : "none"}`;
        const line2 = `    laneNumber: ${this.laneNumber}, laneType: ${this.laneType}, type: ${this.type}`;
        let role1 = "";
        if (this.routeRole) {
            role1 = `    role: ${this.routeRole}`;
        }
        let role2 = "";
        if (this.routeRoles) {
            for (let K in this.routeRoles) {
                role2 += `    role: ${this.routeRoles[K]} to lane: ${K}`;
            }
        }
        const line3 = `    ${(this.routeRole) ? role1 : role2}`;
        let line4 = this.center ? `    center: ${this.center.toString()}, r = ${this.radius.length.toFixed(2)}` : `    straight`;
        line4 += ` •• ${this.stop ? "stop sign" : "no stop"}`
        return line1 + "\n" + line2 + "\n" + line3 + "\n" + line4;
    }
}
