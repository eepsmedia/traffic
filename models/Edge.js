import * as TRAFFIC from "../traffic.js"
import * as LANES from "./Lane.js"
import Lane from "./Lane.js";

export default class Edge {
    constructor(iID, iNodeFrom, iNodeTo, iJSONedge) {
        this.id = iID;
        if (this.id > Edge.maxID) {
            Edge.maxID = this.id;
        }

        this.edgeSpeedLimit = iJSONedge.edgeSpeedLimit ?  iJSONedge.edgeSpeedLimit : null;

        this.connectFrom = iNodeFrom;
        this.connectTo = iNodeTo;    //  if null, this is an end. id of an edge, todo: fix
        this.nLanes = iJSONedge.nLanes;
        this.laneWidth = iJSONedge.laneWidth ?  iJSONedge.laneWidth :  TRAFFIC.constants.kDefaultLaneWidth;
        this.laneColor = iJSONedge.laneColor ?  iJSONedge.laneColor :  TRAFFIC.constants.kDefaultLaneColor;

        this.lanes = [];
        this.median = {};
        this.shoulder = {};

        this.x1 = this.connectFrom.x;   //  det coordinates from the Nodes
        this.y1 = this.connectFrom.y;
        this.x2 = this.connectTo.x;
        this.y2 = this.connectTo.y;

        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;

        this.startAngle = Math.atan2(dy, dx);       //  radians, math convention
        this.endAngle = Math.atan2(dy, dx);       //  radians, math convention
        this.length = Math.sqrt(dx * dx + dy * dy);

        this.startUnitVector = {x: dx / this.length, y: dy / this.length};
        this.endUnitVector = {x: dx / this.length, y: dy / this.length};

        //  useful constant

        const theta = (this.startAngle);

        //      calculate widths and colors for the median and shoulder

        this.shoulder.color = (iJSONedge.shoulderColor) ? iJSONedge.shoulderColor : TRAFFIC.constants.kDefaultShoulderColor;

        if (iJSONedge.oneway) {
            this.shoulder.width = (iJSONedge.shoulderWidth) ? iJSONedge.shoulderWidth : TRAFFIC.constants.kDefaultShoulderWidth;
            this.median.width = (iJSONedge.medianWidth) ? iJSONedge.medianWidth : TRAFFIC.constants.kDefaultShoulderWidth;
            this.median.color = (iJSONedge.medianColor) ? iJSONedge.medianColor : this.shoulder.color;
        } else {
            this.shoulder.width = (iJSONedge.shoulderWidth) ? iJSONedge.shoulderWidth : TRAFFIC.constants.kDefaultShoulderWidth;
            this.median.width = (iJSONedge.medianWidth) ? iJSONedge.medianWidth : TRAFFIC.constants.kDefaultMedianWidth;
            this.median.color = (iJSONedge.medianColor) ? iJSONedge.medianColor : TRAFFIC.constants.kDefaultMedianColor;
        }

        //      do calculations for median and shoulder geometry
        //      do these before lanes because we need the median offset

        this.median.offset = (1 / 2) * this.median.width;
        this.shoulder.offset = this.nLanes * this.laneWidth + this.median.width + (1 / 2) * this.shoulder.width;

        this.median.x1 = this.x1 + this.median.offset * Math.sin(theta);
        this.median.y1 = this.y1 - this.median.offset * Math.cos(theta);
        this.median.x2 = this.x2 + this.median.offset * Math.sin(theta);
        this.median.y2 = this.y2 - this.median.offset * Math.cos(theta);

        this.shoulder.x1 = this.x1 + this.shoulder.offset * Math.sin(theta);
        this.shoulder.y1 = this.y1 - this.shoulder.offset * Math.cos(theta);
        this.shoulder.x2 = this.x2 + this.shoulder.offset * Math.sin(theta);
        this.shoulder.y2 = this.y2 - this.shoulder.offset * Math.cos(theta);


        //  starting at lane 0
        for (let i = 0; i < this.nLanes; i++) {
            const newLane = new Lane(i, this);
            this.lanes.push(newLane);
        }


    }

    static maxID = 0;

    getLaneOffset(eLane) {
        const offset = this.median.width + (eLane + 1/2) * this.laneWidth;
        return offset;
    }

    getAllMyVehicles() {
        let out = [];
        TRAFFIC.theVehicles.forEach((v) => {
            if (v.where.lane.edge.id === this.id) {
                out.push(v);
            }
        })
        return out;
    }

    speedLimit(iLaneNumber) {
        const laneA = Math.floor(iLaneNumber);
        const laneB = Math.ceil(iLaneNumber);
        if (laneA >= 0 && laneB >= 0) {
            if (laneA < this.nLanes && laneB < this.nLanes) {
                return Math.min(this.lanes[laneA].speedLimit, this.lanes[laneB].speedLimit);
            }
        } else {
            console.log(`Error: lane index out of bounds: ${iLaneNumber.toFixed(2)}`);
            return this.lanes[0].speedLimit;
        }
        return 1;
    }

    xyTheta(u, eLane) {
        const offset = this.getLaneOffset(eLane);
        const theta = this.startAngle;
        const x = this.x1 + u * Math.cos(theta) + offset * Math.sin(theta);
        const y = this.y1 + u * Math.sin(theta) - offset * Math.cos(theta);
        return {x, y, theta};
    }
}