/**
 * Creates an object representing a map grid.
 */

//      4 nodes wide, 3 tall

const nodesWide = 4;
const nodesTall = 4;


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

    let edgeID = 1;

    //  now create the horizontal edges
    for (let col = 0; col < nodesWide - 1; col++) {
        for (let row = 0; row < nodesTall; row++) {
            const id = edgeID++;
            const isEven = (row % 2 === 0);
            const edgeHoriz = {
                from: isEven ? row * nodesWide + col +1: row * nodesWide + col,
                to: isEven ? row * nodesWide + col : row * nodesWide + col + 1,
                nLanes: 2,
                oneway: true,
                shoulder: null,
                median: null
            };
            map.edges[id] = edgeHoriz;
        }
    }
    //  now create the vertical edges
    for (let col = 0; col < nodesWide; col++) {
        for (let row = 0; row < nodesTall - 1; row++) {
            const id = edgeID++;
            const startNode = row * nodesWide + col;
            const isEven = (col % 2 === 0);

            const edgeVert = {
                from: isEven ? startNode : startNode + nodesWide,
                to: isEven ? startNode + nodesWide : startNode,
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

