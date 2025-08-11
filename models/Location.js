export default class Location {

    constructor(iEdge, iPos = 0, iLane = 0) {
        this.edge = iEdge;
        this.lane = iLane;
        this.u = iPos;
    }

    speedLimit() {
        return this.edge.speedLimit(this.lane);     //  lanes have speed limits
    }
}