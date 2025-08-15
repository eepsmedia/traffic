

export default class Node {

    constructor(iKey, iJSON) {
        this.id = iKey;
        this.x = iJSON.x;
        this.y = iJSON.y;

        this.inEdges = [];      //  array of edges (not IDs)
        this.outEdges = [];

        this.ports = [];        //  array of ports (not IDs)
    }

}