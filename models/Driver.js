import * as TRAFFIC from "../traffic.js";
import Location from "./Location.js"

export default class Driver {

    constructor(iCar) {
        this.myCar = iCar;

        //  driver behavior
        this.maxSpeed = TRAFFIC.constants.kDefaultMaxSpeed;
        this.maxAcceleration = TRAFFIC.constants.kDefaultMaxAcceleration;
        this.maxDeceleration = TRAFFIC.constants.kDefaultMaxDeceleration;
        this.coastAcc = TRAFFIC.constants.kDefaultCoastAcceleration;
        this.lookAhead = TRAFFIC.constants.kDefaultLookAhead;
        this.tau = TRAFFIC.constants.kDefaultTau;       //  following distance
        this.normalAcc = Number((1 + Math.random()).toFixed(2));
        this.speedZoneWidth = TRAFFIC.constants.kDefaultDesiredSpeedZoneWidth;
        this.overSpeedLimit = TRAFFIC.constants.kDefaultOverSpeedLimit;
        this.laneChangeDuration = TRAFFIC.constants.kDefaultLaneChangeDuration;


    }

    async getAcceleration(dt) {
        let acc = 0;
        const sit = await this.findNearestCar();

        const speedLimitAcc = this.getSpeedLimitAcc(dt);   // null if at or over limit
        const tailgateAcc = this.getTailgateAcc(dt, sit);
        const matchSpeedsAcc = this.getMatchSpeedsAcc(dt, sit);

        const cautionAccelerations = [tailgateAcc, matchSpeedsAcc];
        const cautionAcc = TRAFFIC.minIgnoringNulls(cautionAccelerations);


        acc = cautionAcc || speedLimitAcc || 0;

        return acc;
    }

    getSpeedLimitAcc(dt) {
        let acc = null;
        const my = this;
        const myCar = this.myCar;
        
        const speedLimit = myCar.where.edge.speedLimit(myCar.where.lane);

        //  accelerate to the speed limit if nothing else is happening

        const targetSpeedLimit = speedLimit + my.overSpeedLimit;

        if (myCar.speed < targetSpeedLimit) {
            acc = my.normalAcc;
            if (myCar.speed + acc * dt > targetSpeedLimit) {
                acc = (targetSpeedLimit - myCar.speed) / dt;
            }
        } else if (myCar.speed > targetSpeedLimit + this.speedZoneWidth) {
            acc = my.coastAcc;
        }
        return acc;
    }

    getTailgateAcc(dt, sit) {
        let acc = null;
        const myCar = this.myCar;
        const my = this;

        if (sit.veh) {
            const yourCar = sit.veh;
            const dx = sit.dist;
            const dv = yourCar.speed - myCar.speed;       //  negative means closing

            const follow = yourCar.length + myCar.speed * my.tau;     //      following distance

            if (dx < yourCar.length) {
                console.log(`  collision!  •  at t = ${TRAFFIC.when}, #${myCar.id} rear-ends #${yourCar.id}`);
                acc = yourCar.acceleration - my.normalAcc;
            } else if (dx < follow) {
                acc = yourCar.acceleration - my.normalAcc;  //  coasting, with brake if I see brake lights
                if (dv < 0) {   //  if we're closing, may need to brake harder
                    const timeToImpact = -dx / dv;  //  positive if we are getting closer (dv is negative)
                    acc = Math.min(dv / timeToImpact + yourCar.acceleration, acc);
                }
            }
        }
        return acc;
    }

    getMatchSpeedsAcc(dt, sit) {
        let acc = null;

        if (sit.veh) {
            const myCar = this.myCar;
            const my = this;
            const yourCar = sit.veh;
            const dx = sit.dist;
            const dv = yourCar.speed - myCar.speed;       //  negative means closing
            const follow = yourCar.length + myCar.speed * my.tau;     //      following distance

            if (dx < my.lookAhead && dv < 0) {
                acc = -(dv * dv) / (2 * (dx - follow)) + yourCar.acceleration;
            }
        }
        return acc;
    }

    /*
            In this section, we have methods for deciding whether to
            change lanes.
     */

    async decideAboutLaneChange(dt) {
        if (!this.changingLanes) {
            if (Math.random() < 0.1 * dt) {
                const newLane = Math.floor(Math.random() * this.myCar.where.edge.nLanes);
                if (newLane !== this.myCar.where.lane) {
                    console.log(`    #${this.myCar.id} decided to change lanes to ${newLane}`);
                    this.myCar.startLaneChange(newLane);
                }
            }
        }
    }

    /*
            In this section, we have methods for finding nearby traffic
            and other obstructions.
     */


    async findNearestCar() {
        let nearestCar = null;
        let distance = Infinity;

        //  get the two possible lane numbers, L1 and L2.
        //  if we're not changing lanes, they will be the same.
        const loc = this.myCar.where;
        const L1 = Math.floor(loc.lane);
        const L2 = Math.ceil(loc.lane);

        const survey = await this.surveyNearbyCars();

        if (survey[L1] && survey[L1].veh) {
            nearestCar = survey[L1].veh;
            distance = survey[L1].dist;
        }
        if (survey[L2] && survey[L2].veh && survey[L2].dist < distance) {
            nearestCar = survey[L2].veh;
            distance = survey[L2].dist;
        }

        return {
            veh: nearestCar,
            dist: distance
        }
    }


    async surveyNearbyCars() {
        let nearestCarByLane = [];
        const loc = this.myCar.where;

        for (let L = 0; L < loc.edge.nLanes; L++) {
            nearestCarByLane[L] = this.findNextCarInLane(loc.edge, L, loc.u, 0);
        }

        return nearestCarByLane;
    }

    findNextCarInLane(iEdge, iLane, iPos, iDistFromPreviousEdges = 0) {
        if (iDistFromPreviousEdges > this.lookAhead) {
            return null;        //  too far ahead, we don't care!
        }

        let distance = Infinity;
        let theClosestVehicle = null;
        const startingX = iPos;

        if (iEdge) {
            const carsInEdge = iEdge.getAllMyVehicles();    //

            carsInEdge.forEach(c => {
                const carLane = c.where.lane;
                if (iLane === Math.floor(carLane) || iLane === Math.ceil(carLane)) {
                    const carX = c.where.u;
                    const tDist = carX - startingX + iDistFromPreviousEdges;
                    if (tDist > 0 && tDist < distance) {
                        distance = tDist;
                        theClosestVehicle = c;
                    }
                }
            })

            if (theClosestVehicle) {
                return {
                    veh: theClosestVehicle,
                    dist: distance
                }
            } else {
                iDistFromPreviousEdges += (iEdge.length - startingX);
            }

            if (iEdge.connectTo) {
                //  recurse
                const nextEdge = TRAFFIC.getNextEdge(iEdge);
                return this.findNextCarInLane(nextEdge, iLane, 0, iDistFromPreviousEdges);
                //  todo: account for the case where the lane number changes
            }
        }

        return null;
    }

}