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

        this.totalDistance = 0;

    }

    async step(dt) {
        const du = this.speed * dt + (1/2) * this.acceleration * dt * dt;
        this.where.u += du;
        this.totalDistance += du;
        this.speed += this.acceleration * dt;

        const myLane = this.where.lane;

        //  wrap to the next lane
        this.wrapLanes(this.where.u, this.where.lane);
/*
        while (this.where.u > myLane.myVector.length) {
            const newLane = TRAFFIC.getNextLane(myLane);
            if (newLane) {
                if (this.changingLanes) this.finishLaneChange();    //  todo: kludge alert! really we shouldn't start a change if we can't finish it before a junction
                const leftover = this.where.u - myLane.myVector.length;
                this.where.lane = newLane;
                this.where.u = leftover;
                console.log(`    #${this.id} moved to lane ${newLane.id} with ${leftover.toFixed(1)} m left over.`);
            } else {
                TRAFFIC.removeVehicleByID(this.id);
                return;     //  don't do any more processing!
            }
        }
*/

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

        //  update the app's data csv...codapData = ["id, when,dist,speed,acceleration, lane, u, effLane"];'
        const now = TRAFFIC.when;
        if (Math.floor(now) !== Math.floor(now - dt)) {
            const basics = `${TRAFFIC.when.toFixed(2)},${this.totalDistance.toFixed(2)},${this.speed.toFixed(2)},${this.acceleration.toFixed(2)}`;
            const laneData = `${this.where.lane.id},${this.where.u.toFixed(2)},${this.effectiveLaneNumber.toFixed(1)}`;
            TRAFFIC.codapData.push(`${this.id},${basics},${laneData}`);
        }
    }

    wrapLanes(u, lane) {
        if (u > lane.length) {
            if (this.changingLanes) this.finishLaneChange();
            const newLane = TRAFFIC.getNextLane(lane);
            if (newLane) {
                const leftover = u - lane.length;
                this.where.lane = newLane;
                this.where.u = leftover;
                console.log(`    #${this.id} moved to lane ${this.where.lane.id} with ${leftover.toFixed(1)} m left over.`);
                this.wrapLanes(this.where.u, this.where.lane);
            } else {
                TRAFFIC.removeVehicleByID(this.id);
                return;
            }
        }
        return;
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

    angle() {
        return this.where.lane.angle(this.where.u);
    }

    speedLimit() {
        return this.where.lane.speedLimit;  //  todo: fix for case where we're changing lanes.
    }

    getTableLine() {
        const focusP = this.isFocusCar() ? "*" : "";
        const laneNum = (this.effectiveLaneNumber).toFixed(1);

        let out = `<tr><td>${this.id}${focusP}</td><td>${this.where.lane.id}</td></td><td>${laneNum}</td>`
            out += `<td>${this.where.u.toFixed(2)}</td><td>${this.speed.toFixed(2)}</td><td>${this.acceleration.toFixed(2)}</td></tr>`

        return out;
    }
    isFocusCar() {
        return this === TRAFFIC.focusCar;
    }

    getFocusString() {
        const laneData = ` ${this.where.lane.id}-${this.where.u.toFixed(2)} EL#${this.effectiveLaneNumber.toFixed(1)}`;
        return `id: ${this.id} ${laneData} speed: ${this.speed.toFixed(1)} acc: ${this.acceleration.toFixed(1)}`;
    }

    uVector() {
        let pos =  this.where.lane.uVector(this.where.u, this.effectiveLaneNumber);
        return pos;
    }

}