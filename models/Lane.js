import * as TRAFFIC from "../traffic.js"
import * as EDGE from "./Edge.js"


export default class Lane {

    constructor(iLaneNumber) {

        this.laneNumber = iLaneNumber;
    }

    static fromEdge(iEdge, iLaneNumber) {
        const lane = new Lane(iLaneNumber);
        lane.type = "road";

        lane.id = iEdge.id * 1000 + iLaneNumber;

        lane.edge = iEdge;
        lane.portIn = null;
        lane.portOut = null;

        lane.node = null;
        lane.laneType = "edge";
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

    static fromPorts(iPortIn, iPortOut) {
        const lane = new Lane(iPortIn.roadLane.laneNumber);
        lane.type = "junction";

        lane.portIn = iPortIn;
        lane.portOut = iPortOut;

        const startWidth = iPortIn.roadLane.width;
        const startColor = iPortIn.roadLane.color;
        const startSpeedLimit = iPortIn.roadLane.speedLimit;

        lane.width = startWidth ? startWidth : TRAFFIC.constants.kDefaultLaneWidth;
        lane.color = (startColor) ? startColor : TRAFFIC.constants.kDefaultLaneColor
        lane.speedLimit = startSpeedLimit ?  startSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;

        lane.id = `${iPortIn.roadLane.id}>${iPortOut.roadLane.id}`;

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
        return this.mainAngle;  //  adjust for roundness...
    }
}
