/**
 * Creates an object representing a map grid.
 */

//      4 nodes wide, 3 tall

const nodesWide = 4;
const nodesTall = 3;


export function makeGrid() {

    let map = {};
    map.nodes = {};
    map.edges = {};
    map.name = `constructed grid of ${nodesWide}x${nodesTall} nodes`;

    for (let i = 0; i < nodesTall; i++) {
        for (let j = 0; j < nodesWide; j++) {
            const node = {
                id: i * nodesWide + j,
                x: j * 100,
                y: i * 100,
            };
            map.nodes[node.id] = node;
        }
    }

    let edgeID = 0;

    //  now create the horizontal edges
    for (let i = 0; i < nodesWide - 1; i++) {
        for (let j = 0; j < nodesTall; j++) {
            const id = edgeID++;
            const edgeHoriz = {
                from: i * nodesWide + j,
                to: i * nodesWide + j + 1,
                nLanes: 2,
                oneway: true,
                shoulder: null,
                median: null
            };
            map.edges[id] = edgeHoriz;
        }
    }
    //  now create the vertical edges
    for (let i = 0; i < nodesWide; i++) {
        for (let j = 0; j < nodesTall - 1; j++) {
            const id = edgeID++;
            const startNode = j * nodesWide + i;

            const edgeVert = {
                from: startNode,
                to: startNode + nodesWide,
                nLanes: 2,
                oneway: true,
                shoulder: null,
                median: null
            };
            map.edges[id] = edgeVert;
        }
    }

    return { "map" : map};
}

