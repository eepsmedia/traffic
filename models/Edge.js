import * as TRAFFIC from "../traffic.js"
import Lane from "./Lane.js";

export default class Edge {
    constructor(iID, iNodeFrom, iNodeTo, iJSONedge) {
        this.id = iID;
        if (this.id > Edge.maxID) {
            Edge.maxID = this.id;
        }

        this.routeRoles = {};
        this.defaultSuccessor = null;
        this.defaultPredecessor = null;

        this.edgeSpeedLimit = iJSONedge.edgeSpeedLimit ?  iJSONedge.edgeSpeedLimit : TRAFFIC.constants.kDefaultSpeedLimit;

        this.connectFrom = iNodeFrom;
        this.connectTo = iNodeTo;    //  if null, this is an end. id of an edge, todo: fix
        this.nLanes = iJSONedge.nLanes;
        this.laneWidth = iJSONedge.laneWidth ?  iJSONedge.laneWidth :  TRAFFIC.constants.kDefaultLaneWidth;
        this.laneColor = iJSONedge.laneColor ?  iJSONedge.laneColor :  TRAFFIC.constants.kDefaultLaneColor;

        this.stop = iJSONedge.stop ?  iJSONedge.stop :  false;

        this.inReduction = 0;
        this.outReduction = 0;

        this.lanes = [];
        this.median = {};
        this.shoulder = {};

        this.start = this.connectFrom.origin;
        this.end = this.connectTo.origin;

        this.myVector = this.end.subtract(this.start);     //  suitable for straight lines

        this.startAngle = this.myVector.angle();       //  radians, math convention
        this.endAngle = this.myVector.angle();       //  radians, math convention
        this.length = this.myVector.length;

        this.unitVectorIn = this.myVector.unit();
        this.unitVectorOut = this.myVector.unit();

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

        this.median.start = this.start
            .add(this.myVector.perpendicular().unit().multiply(this.median.offset));
        this.median.end = this.end
            .add(this.myVector.perpendicular().unit().multiply(this.median.offset));

        this.shoulder.start = this.start
            .add(this.myVector.perpendicular().unit().multiply(this.shoulder.offset));
        this.shoulder.end = this.end
            .add(this.myVector.perpendicular().unit().multiply(this.shoulder.offset));

        //      width of the whole road...
        this.width = this.shoulder.width + this.median.width + (this.nLanes * this.laneWidth);

        //  starting at lane 0, make new lanes
        for (let i = 0; i < this.nLanes; i++) {
            const newLane = Lane.fromEdge(this, i);
            this.lanes.push(newLane);
        }


    }

    static maxID = 0;

    getLaneOffsetScalar(eLane) {
        const offset = this.median.width + (eLane + 1/2) * this.laneWidth;
        return offset;
    }

    getAllMyVehicles() {
        let out = [];
        TRAFFIC.theVehicles.forEach((v) => {
            if (v.where.lane.edge && v.where.lane.edge.id === this.id) {
                out.push(v);
            }
        })
        return out;
    }

    assignRolesToLanes() {
        //  this.routeRoles has already been set in mapMaker.js

        for (let edgeID in this.routeRoles) {
            const nextEdge = TRAFFIC.theEdges[edgeID];

            const role = this.routeRoles[edgeID];
            for (let L = 0; L < this.lanes.length; L++) {
                const lane = this.lanes[L];
                switch (role) {
                    case "straight":

                        break;
                    case "left":
                        if (lane.laneNumber === 0) {
                            lane.routeRoles.left = true;
                            lane.defaultSuccessor = nextEdge.lanes[0];
                            lane.defaultPredecessor = nextEdge.lanes[nextEdge.lanes.length - 1];
                        }
                        break;
                    case "right":
                        if (lane.laneNumber === this.lanes.length - 1) {}
                        break;
                }


            }
        }
    }
/*
    xyTheta(u, eLane) {
        const offset = this.getLaneOffsetScalar(eLane);
        const theta = this.startAngle;
        const x = this.x1 + u * Math.cos(theta) + offset * Math.sin(theta);
        const y = this.y1 + u * Math.sin(theta) - offset * Math.cos(theta);
        return {x, y, theta};
    }
*/
}