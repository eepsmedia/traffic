

export default class Port {
    constructor(iNode, iLane, iInOut) {

        this.lane = iLane;
        this.node = iNode;
        this.inOut = iInOut;
        this.edge = this.lane.edge;     //  which edge it connects to

        this.unitVector = (this.inOut = "in") ? this.edge.endUnitVector : this.edge.startUnitVector;

    }
}