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
        this.laneFromNumber = null;
        this.laneToNumber = null;
        this.effectiveLaneNumber = iLoc.lane.laneNumber;

        //  vehicle properties
        this.length = TRAFFIC.constants.kDefaultCarLength;
        this.width = TRAFFIC.constants.kDefaultCarWidth;
        this.bodyColor = TRAFFIC.constants.kDefaultBodyColor;

    }

    async step(dt) {
        this.where.u += this.speed * dt + (1/2) * this.acceleration * dt * dt;
        this.speed += this.acceleration * dt;

        const myLane = this.where.lane;

        //  wrap around the edges
        while (this.where.u > myLane.length) {
            const newLane = TRAFFIC.getNextLane(myLane);  //  todo: change to lane
            if (newLane) {
                const leftover = this.where.u - myLane.length;
                this.where.lane = newLane;
                this.where.u = leftover;
                console.log(`    #${this.id} moved to lane ${newLane.id} with ${leftover.toFixed(1)} m left over.`);
            } else {
                TRAFFIC.removeVehicleByID(this.id);
                return;     //  don't do any more processing!
            }
        }

        //  do lane changing
        if (this.changingLanes) {

            const dLane = (this.laneToNumber - this.laneFromNumber) * dt / this.driver.laneChangeDuration;
            this.effectiveLaneNumber += dLane;
            if (Math.abs(this.effectiveLaneNumber - this.laneFromNumber) >= (1 - Number.EPSILON)) {
                this.finishLaneChange()
            }
            if (this.effectiveLaneNumber < 0) {
                console.log(`    #${this.id} lane out of bounds to ${this.effectiveLaneNumber} heading for ${this.laneToNumber}: finished lane change to zero`);
                this.finishLaneChange();
            }
        }

    }


    startLaneChange(laneTo) {
        this.laneToNumber = laneTo;
        this.laneFromNumber = this.where.lane.laneNumber;
        this.effectiveLaneNumber = this.where.lane.laneNumber;
        this.changingLanes = true;
    }

    finishLaneChange() {
        this.where.lane = this.where.lane.edge.lanes[this.laneToNumber];
        this.where.lane.laneNumber = this.laneToNumber;

        this.effectiveLaneNumber = this.where.lane.laneNumber;
        this.laneToNumber = null;
        this.laneFromNumber = null;
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

    speedLimit() {
        return this.where.lane.edge.speedLimit(this.effectiveLaneNumber);
        //  return this.where.lane.speedLimit;  //  todo: change to include other lane we're in if changing lanes
    }


    isFocusCar() {
        return this === TRAFFIC.focusCar;
    }

    getFocusString() {
        const edgeData = `loc ${this.where.edge.id}-${this.where.lane.toFixed(1)}-${this.where.u.toFixed(2)}`;
        return `id: ${this.id} ${edgeData} speed: ${this.speed.toFixed(1)} acc: ${this.acceleration.toFixed(1)}`;
    }

    xyTheta() {
        const theEdge = this.where.lane.edge;
        let pos =  theEdge.xyTheta(this.where.u, this.effectiveLaneNumber);
        return pos;
    }

}