import * as TRAFFIC from "../traffic.js"
import Lane from "./Lane.js";


export default class Node {

    constructor(iKey, iJSON) {
        this.id = iKey;
        this.origin = new Vector(iJSON.x, iJSON.y);
        this.x = iJSON.x;
        this.y = iJSON.y;

        this.inEdges = [];      //  array of edges (not IDs)
        this.outEdges = [];

        this.inPorts = [];      //  array of ports (not IDs)
        this.outPorts = [];

        this.junctionLanes = [];    //  "inner" lanes, connecting inPorts to outPorts

    }

    getAllMyVehicles() {
        let out = [];
        TRAFFIC.theVehicles.forEach((v) => {
            if (v.where.lane.node && v.where.lane.node.id === this.id) {
                out.push(v);
            }
        })
        return out;
    }

}