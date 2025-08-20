

export default class Port {
    constructor(iNode, iLane, iInOut) {

        this.id = iNode.id * 1000000 + iLane.id;
        this.origin = null;
        this.roadLane = iLane;
        this.junctionLanes = [];
        this.node = iNode;
        this.inOut = iInOut;
        this.edge = this.roadLane.edge;     //  which edge it connects to

        this.unitVector = (this.inOut === "in") ? this.edge.unitVectorOut : this.edge.unitVectorIn;
        this.theta = (this.inOut === "in") ? this.edge.endAngle : this.edge.startAngle;

        this.speedLimit = this.roadLane.speedLimit;
        this.width = this.roadLane.width;

        if (this.inOut === "in") {
            this.roadLane.portOut = this;
        } else {
            this.roadLane.portIn = this;
        }
    }

    adjustLaneEndsToMatch() {
        if (this.inOut === "in") {
            this.roadLane.changeEnd(this.origin);
        } else {
            this.roadLane.changeStart(this.origin);
        }
    }

    setXY(ix, iy) {
        console.log("*** call to Port.setXY");

        this.x = ix;
        this.y = iy;

        if (this.inOut === "in") {
            this.roadLane.end = this.origin;
        } else {
            this.roadLane.start = this.origin;
        }

    }

}