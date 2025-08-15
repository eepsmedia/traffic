import * as TRAFFIC from "../traffic.js"
import * as EDGE from "./Edge.js"


export default class Lane {
    static  MaxID = 1;

    constructor(iLaneNumber, iEdge) {
        this.id = iEdge.id * 1000 + iLaneNumber;
        if (this.id > Lane.MaxID) {
            Lane.MaxID = this.id;
        }

        this.laneNumber = iLaneNumber;
        this.edge = iEdge;
        this.offset = iEdge.getLaneOffset(iLaneNumber);

        this.startAngle = iEdge.startAngle;
        this.endAngle = iEdge.endAngle;
        this.speedLimit = iEdge.edgeSpeedLimit ?  iEdge.edgeSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;
        this.width = iEdge.laneWidth ? iEdge.laneWidth : TRAFFIC.constants.kDefaultLaneWidth;
        this.color = (iEdge.laneColor) ? iEdge.laneColor : TRAFFIC.constants.kDefaultLaneColor

        this.getCoordinates();
    }


    getCoordinates() {
        const theta = (this.edge.startAngle);

        this.x1 = this.edge.x1 + this.offset * Math.sin(theta);   //  right π/2 from direction
        this.y1 = this.edge.y1 - this.offset * Math.cos(theta);
        this.x2 = this.edge.x2 + this.offset * Math.sin(theta);   //  right π/2 from direction
        this.y2 = this.edge.y2 - this.offset * Math.cos(theta);
        this.theta = theta;

        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        this.length = Math.sqrt(dx * dx + dy * dy);
    }

/*
    getXYTheta(u) {
        const theta = this.startAngle
        const x = this.x1 + u * Math.cos(theta);
        const y = this.y1 + u * Math.sin(theta);
        return {x, y, theta};
    }
*/

}
