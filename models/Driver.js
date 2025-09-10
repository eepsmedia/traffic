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
        this.normalDecel = 2;       //  m/s^2
        this.speedZoneWidth = TRAFFIC.constants.kDefaultDesiredSpeedZoneWidth;
        this.overSpeedLimit = TRAFFIC.constants.kDefaultOverSpeedLimit;
        this.laneChangeDuration = TRAFFIC.constants.kDefaultLaneChangeDuration;

    }

    async getAcceleration(dt) {
        this.myCar.usingBrake = false;
        let acc = 0;
        const sit = await this.findNearestCar();

        const speedLimitAcc = this.getSpeedLimitAcc(dt);   // null if at or over limit
        const tailgateAcc = this.getTailgateAcc(dt, sit);
        const matchSpeedsAcc = this.getMatchSpeedsAcc(dt, sit);
        const roadIssueAcc = this.getRoadIssueAcc();

        const cautionAccelerations = [tailgateAcc, matchSpeedsAcc, roadIssueAcc];
        const cautionAcc = TRAFFIC.minIgnoringNulls(cautionAccelerations);


        acc = cautionAcc || speedLimitAcc || 0;

        return acc;
    }

    getSpeedLimitAcc(dt) {
        let acc = null;
        const my = this;
        const myCar = this.myCar;
        
        const speedLimit = myCar.speedLimit();

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
                console.log(`t = ${TRAFFIC.when.toFixed(2)} •• collision! #${myCar.id} rear-ends #${yourCar.id}`);
                acc = yourCar.acceleration - my.normalAcc;
                this.myCar.usingBrake = true;

            } else if (dx < follow) {
                acc = yourCar.acceleration - my.normalAcc;  //  coasting, with brake if I see brake lights
                if (dv < 0) {   //  if we're closing, may need to brake harder
                    const timeToImpact = -dx / dv;  //  positive if we are getting closer (dv is negative)
                    acc = Math.min(dv / timeToImpact + yourCar.acceleration, acc);
                    this.myCar.usingBrake = true;

                }
            }
            if (acc < -1) {
                console.log(`t = ${TRAFFIC.when.toFixed(2)} •• tailgating: #${myCar.id} gets ${acc.toFixed(2)} about #${yourCar.id} range ${sit.dist.toFixed(2)} m.`);
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

            if (dx < my.lookAhead && dv < -1) {
                acc = -(dv * dv) / (2 * (dx - follow)) ;    //  + yourCar.acceleration;
                this.myCar.usingBrake = true;

            }
            if (acc < -1) {
                console.log(`t = ${TRAFFIC.when.toFixed(2)} •• match speeds: #${myCar.id} gets ${acc.toFixed(2)} about #${yourCar.id} [range ${dx.toFixed(2)} m acc= ${yourCar.acceleration}]. dv = ${dv.toFixed(2)} follow = ${follow.toFixed(0)}   `);
            }
        }
        return acc;
    }

    getRoadIssueAcc() {
        let acc = null;

        const issue = this.findNearestRoadIssue();
        if (issue.issue) {
            if (issue.issue === "curve" && issue.targetSpeed < this.myCar.speed) {
                acc = (issue.targetSpeed *  issue.targetSpeed - this.myCar.speed * this.myCar.speed) / 2 / issue.dist;
            }
        }

        return acc;
    }

    /*
            In this section, we have methods for deciding whether to
            change lanes.

            todo: actually implement reasons
     */

    async decideAboutLaneChange(dt) {
        if (this.myCar.where.lane.type === "road") {

            if (!this.changingLanes) {
                if (Math.random() < TRAFFIC.randomLaneChangeProbability * dt) {
                    const newLaneNumber = Math.floor(Math.random() * this.myCar.where.lane.edge.nLanes);
                    if (newLaneNumber !== this.myCar.where.lane.laneNumber) {
                        console.log(`    #${this.myCar.id} decided to change lanes to ${newLaneNumber}`);
                        this.myCar.startLaneChange(newLaneNumber);
                    }
                }
            }
        }
    }

    /*
            In this section, we have methods for finding nearby traffic
            and other obstructions.
     */

    findNearestRoadIssue() {
        let theIssue = { issue : null, dist : Infinity};
        const myLane = this.myCar.where.lane;

        if (myLane.type === "road") {
            const theJunctionLane = myLane.defaultSuccessor;
            const curveSpeed = theJunctionLane.maxSafeSpeed;
            const deltaV = this.myCar.speed - curveSpeed;
            const theDistance = myLane.length - this.myCar.where.u;     //  our distance to the curve
            if (theDistance < (deltaV * this.myCar.speed) / this.normalDecel ) {
                theIssue = {
                    issue: "curve",
                    targetSpeed : curveSpeed,
                    dist: theDistance
                }
            }
        }
        return theIssue;
    }



    async findNearestCar() {
        let nearestCar = null;
        let distance = Infinity;

        //  get the two possible lane numbers, L1 and L2.
        //  if we're not changing lanes, they will be the same.
        const myLane = this.myCar.where.lane;
        const L1 = Math.floor(myLane.laneNumber);
        const L2 = Math.ceil(myLane.laneNumber);

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
        const myLane = loc.lane;

        if (myLane.type === "road") {
            const theEdge = myLane.edge;
            //  nearestCarByLane = theEdge.getAllMyVehicles();
            for (let L = 0; L < theEdge.nLanes; L++) {
                const thisLane = theEdge.lanes[L];
                nearestCarByLane[L] = this.findNextCarInLane(thisLane, loc.u, 0);
            }
        } else {
            let L = myLane.laneNumber;
            nearestCarByLane[L] = this.findNextCarInLane(myLane, loc.u, 0);
        }

        return nearestCarByLane;
    }

    findNextCarInLane(iLane, iPos, iDistFromPreviousEdges = 0) {
        if (iDistFromPreviousEdges > this.lookAhead) {
            return null;        //  too far ahead, we don't care!
        }

        let distance = Infinity;
        let theClosestVehicle = null;
        const startingX = iPos;

        if (iLane) {
            const carsToConsider = (iLane.type === "road") ?
                iLane.edge.getAllMyVehicles() :
                iLane.node.getAllMyVehicles()   ;


            carsToConsider.forEach(c => {
                const carLane = c.where.lane;
                const thisLaneNumber = iLane.laneNumber;
                const thatLaneNumber = carLane.laneNumber;
                if (Math.abs(thisLaneNumber - thatLaneNumber) < 0.95) {     //      couls be 1, but...
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
                iDistFromPreviousEdges += (iLane.myVector.length - startingX);
            }

            if (iLane.portOut) {
                //  recurse
                const nextLane = iLane.defaultSuccessor;    //  TRAFFIC.getNextLane(iLane);
                return this.findNextCarInLane(nextLane, 0, iDistFromPreviousEdges);
                //  todo: account for the case where the lane number changes
            }
        }

        return null;
    }

    chooseNextLane() {
        const myCar = this.myCar;
        const myLane = myCar.where.lane;
        let nextLane = null;

        if (myLane.type === "road") {
            const theLanes = myLane.portOut.junctionLanes;
            const ix = Math.floor(Math.random() * theLanes.length);
            nextLane = theLanes[ix];
        } else {
            nextLane = myLane.portOut.roadLane;
        }

        return nextLane
    }

}