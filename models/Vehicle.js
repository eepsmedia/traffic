import * as TRAFFIC from "../traffic.js"

import Driver from "./Driver.js"
import Location from "./Location.js"
import Edge from "./Edge.js"


export default class Vehicle {

    static nextID = 1;

    constructor(iLoc, iSpeed = 0, iAcc = 0) {
        this.id = Vehicle.nextID++;

        this.driver = new Driver(this);
        this.where = iLoc;
        this.speed = iSpeed;
        this.acceleration = iAcc;
        this.sit = null;

        //  lane-changing
        this.changingLanes = false;
        this.laneFrom = null;
        this.laneTo = null;

        //  vehicle properties
        this.length = TRAFFIC.constants.kDefaultCarLength;
        this.width = TRAFFIC.constants.kDefaultCarWidth;
        this.bodyColor = TRAFFIC.constants.kDefaultBodyColor;

    }

    async step(dt) {
        this.where.u += this.speed * dt + (1/2) * this.acceleration * dt * dt;
        this.speed += this.acceleration * dt;


        //  wrap around the edges
        while (this.where.u > this.where.edge.length) {
            const newEdge = TRAFFIC.getNextEdge(this.where.edge);
            if (newEdge) {
                const leftover = this.where.u - this.where.edge.length;
                this.where.edge = newEdge;
                this.where.u = leftover;
                console.log(`    #${this.id} moved to edge ${newEdge.id} with ${leftover.toFixed(1)} m left over.`);
            } else {
                TRAFFIC.removeVehicleByID(this.id);
                return;     //  don't do any more processing!
            }
        }

        //  do lane changing
        if (this.changingLanes) {
            const dLane = (this.laneTo - this.laneFrom) * dt / this.driver.laneChangeDuration;
            this.where.lane += dLane;
            if (Math.abs(this.where.lane - this.laneFrom) > (1 - dLane + Number.EPSILON)) {
                this.finishLaneChange()
            }
            if (this.where.lane < 0) {
                console.log(`    #${this.id} lane out of bounds to ${this.where.lane} for ${this.laneTo}: finished lane change to zero`);
                this.finishLaneChange();
            }
        }

    }


    startLaneChange(laneTo) {
        this.laneTo = laneTo;
        this.laneFrom = this.where.lane;
        this.changingLanes = true;
    }

    finishLaneChange() {
        this.where.lane = this.laneTo;
        this.laneTo = null;
        this.laneFrom = null;
        this.changingLanes = false;
    }

    /**
     * Updates the acceleration value based on the current situation and time delta.
     *
     * @return {void} This method does not return a value.
     */
    async setAcceleration(dt) {
        this.acceleration = await this.driver.getAcceleration(dt);

        if (this.speed + this.acceleration * dt < 0) {
            this.acceleration = -this.speed / dt;    //  stop, don't go backwards!
        }
    }

    isFocusCar() {
        return this === TRAFFIC.focusCar;
    }

    getFocusString() {
        const edgeData = `loc ${this.where.edge.id}-${this.where.lane.toFixed(1)}-${this.where.u.toFixed(2)}`;
        return `id: ${this.id} ${edgeData} speed: ${this.speed.toFixed(1)} acc: ${this.acceleration.toFixed(1)}`;
    }

    xyTheta() {
        const offset = (this.where.lane + (1/2)) * this.where.edge.laneWidth + this.where.edge.median.width;
        let pos =  this.where.edge.getXYTheta(this.where.u);
        pos.x = pos.x + offset * Math.sin(pos.theta);
        pos.y = pos.y - offset * Math.cos(pos.theta);
        return pos;
    }

}