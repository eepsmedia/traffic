import * as TRAFFIC from "../traffic.js"

export default class Edge {
    constructor(iID, iX1, iY1, iX2, iY2, iLanes = 2, iToConnect = null) {
        this.id = iID;
        this.x1 = iX1;
        this.y1 = iY1;
        this.x2 = iX2;
        this.y2 = iY2;
        this.connectFrom = null;
        this.connectTo = iToConnect;    //  if null, this is an end. id of an edge, todo: fix
        this.laneWidth = TRAFFIC.constants.kDefaultLaneWidth;

        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;

        this.startAngle = Math.atan2(dy, dx);       //  radians, math convention
        this.length = Math.sqrt(dx * dx + dy * dy);

        this.nLanes = iLanes;

        if (this.id > Edge.maxID) {
            Edge.maxID = this.id;
        }

        //  create the `lanes` member, which is an array of objects

        this.lanes = [];
        const theta = (this.startAngle);
        const w = TRAFFIC.constants.kDefaultLaneWidth;

        //  starting at lane 0
        for (let i = 0; i < this.nLanes; i++) {
            const offset = (i + (1 / 2)) * this.laneWidth;

            this.lanes.push({
                    speedLimit: TRAFFIC.constants.kDefaultSpeedLimit,
                    laneWidth: this.laneWidth,
                    x1: this.x1 + offset * Math.sin(theta),   //  right π/2 from direction
                    y1: this.y1 - offset * Math.cos(theta),
                    x2: this.x2 + offset * Math.sin(theta),   //  right π/2 from direction
                    y2: this.y2 - offset * Math.cos(theta)
                }
            )
        }

    }

    static maxID = 0;

    getAllMyVehicles() {
        let out = [];
        TRAFFIC.theVehicles.forEach((v) => {
            if (v.where.edge === this) {
                out.push(v);
            }
        })
        return out;
    }

    getXYTheta(u) {
        const theta = this.startAngle
        const x = this.x1 + u * Math.cos(theta);
        const y = this.y1 + u * Math.sin(theta);
        return {x, y, theta};
    }

    speedLimit(iLane) {
        const laneA = Math.floor(iLane);
        const laneB = Math.ceil(iLane);
        if (laneA >= 0 && laneB >= 0) {
            if (laneA < this.nLanes && laneB < this.nLanes) {
                return Math.min(this.lanes[laneA].speedLimit, this.lanes[laneB].speedLimit);
            }
        } else {
            console.log(`Error: lane index out of bounds: ${iLane.toFixed(2)}`);
            return this.lanes[0].speedLimit;
        }
        return 1;
    }

    setSpeedLimit(iSL) {
        this.speedLimit = iSL;

        for (let i = 0; i < this.nLanes; i++) {
            this.lanes.push({
                    speedLimit: this.speedLimit,
                }
            )
        }
    }
}