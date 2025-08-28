

export default class Port {
    constructor(iNode, iLane, iInOut) {

        this.id = `N${iNode.id}  L${iLane.id}`;
        this.origin = null;
        this.roadLane = iLane;      //  the lane on the "road" side of the port
        this.edge = this.roadLane.edge;     //  which edge it connects to

        this.junctionLanes = [];    //  "inner" lanes, connecting inPorts to outPorts
        this.node = iNode;
        this.inOut = iInOut;        //  is this an input or an output port (wrt the node, the junction)

        this.unitVector = (this.inOut === "in") ? this.edge.unitVectorOut : this.edge.unitVectorIn;
        this.theta = this.unitVector.angle();

        this.speedLimit = this.roadLane.speedLimit;
        this.width = this.roadLane.width;

        //  tell each lane that this port is its connector.

        if (this.inOut === "in") {
            this.roadLane.portOut = this;
        } else {
            this.roadLane.portIn = this;
        }
    }

    /**
     * adjust the lane ends to match the port's origin,
     * which may have been moved to account for reductions in a junction.
     */
    adjustLaneEndsToMatch() {
        if (this.inOut === "in") {
            this.roadLane.changeEnd(this.origin);
        } else {
            this.roadLane.changeStart(this.origin);
        }
    }

/*
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
*/

}