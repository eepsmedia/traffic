import * as TRAFFIC from "../traffic.js"

let paper;
let zoomContainer;
let zoomScale = 1;

export function initialize() {
    window.addEventListener("resize", resizeWindow);
    paper = d3.select("#mapSVG");

    rescale()
}

export function rescale() {
    zoomScale = 1;
    // Calculate bounds
    const bounds = calculateBounds(TRAFFIC.theEdges);

    // Set up zoom container first, then viewBox
    setupZoomContainer(bounds);
    setupViewBox(bounds);

    resizeWindow();
    draw();
}

export function draw() {
    drawRoads(TRAFFIC.theEdges);
    drawEdges(TRAFFIC.theEdges);
    drawNodes(TRAFFIC.theNodes);
    drawCars(TRAFFIC.theVehicles);
}

// Modified drawEdges to use zoomContainer
function drawNodes(iNodes) {
    const aNodes = Object.values(iNodes);

    const nodes = zoomContainer.selectAll(".node")
        .data(aNodes, (n) => n.id)
        .join("g")
        .attr("class", "node")

    nodes.selectAll(".nodeCircle")
        .data((node) => [node])
        .join("circle")
        .attr("cx", node => node.origin.x)
        .attr("cy", node => node.origin.y)
        .attr("r", TRAFFIC.constants.kNodeRadius / zoomScale)
        .attr("fill", "red")
        .attr("class", "nodeCircle")

}

function drawEdges(iEdges) {
    const aEdges = Object.values(iEdges);

    const edges = zoomContainer.selectAll(".edge")  // Use zoomContainer instead of paper
        .data(aEdges, (e) => e.id)
        .join("g")
        .attr("class", "edge")

    edges.selectAll(".edgeCenterline")
        .data((e) => [e])
        .join("line")
        .attr("x1", e => e.start.x)
        .attr("y1", e => e.start.y)
        .attr("x2", e => e.end.x)
        .attr("y2", e => e.end.y)
        .attr("stroke", "red")
        .attr("stroke-width", TRAFFIC.constants.kEdgeThickness / zoomScale)
        .attr("class", "edgeCenterline")
}

function drawRoads(iEdges) {
    const aEdges = Object.values(iEdges);

    const roads = zoomContainer.selectAll(".road")  // Use zoomContainer instead of paper
        .data(aEdges, (e) => e.id)
        .join("g")
        .attr("class", "road")

    roads.selectAll(".median")
        .data((e) => [e.median])
        .join("line")
        .attr("x1", m => m.start.x)
        .attr("y1", m => m.start.y)
        .attr("x2", m => m.end.x)
        .attr("y2", m => m.end.y)
        .attr("stroke", m => m.color)
        .attr("stroke-width", m => m.width)
        .attr("class", "median")

    roads.selectAll(".lane")
        .data((e) => e.lanes)
        .join("line")
        .attr("x1", lane => lane.start.x)
        .attr("y1", lane => lane.start.y)
        .attr("x2", lane => lane.end.x)
        .attr("y2", lane => lane.end.y)
        .attr("stroke", lane => lane.color)
        .attr("stroke-width", lane => lane.width)
        .attr("class", "lane")

    roads.selectAll(".shoulder")
        .data((e) => [e.shoulder])
        .join("line")
        .attr("x1", sh => sh.start.x)
        .attr("y1", sh => sh.start.y)
        .attr("x2", sh => sh.end.x)
        .attr("y2", sh => sh.end.y)
        .attr("stroke", sh => sh.color)
        .attr("stroke-width", sh => sh.width)
        .attr("class", "shoulder")


}

function drawCars(iVehicles) {
    const aCars = Object.values(iVehicles);     //  array form of all cars

    //  make the car group
    const cars = zoomContainer.selectAll(".car")
        .data(aCars, (c) => c.id)
        .join("g")
        .attr("class", "car")
        .attr("transform", c => {
            const pos = c.uVector();
            const degreeTheta = c.angle() * 180 / Math.PI;
            const transformString = `translate(${pos.x}, ${pos.y}) rotate(${degreeTheta})`;
            return transformString
        })
        .on("click", function (event, d) {
            TRAFFIC.setFocusCar(event, d);
            console.log(`clicked car #${d.id}`);
        })
        .style("cursor", "pointer");  // Show it's clickable


    //  draw the car body
    cars.selectAll(".carBody")
        .data((c) => [c])
        .join("rect")
        .attr("x", c => -c.length)       //  origin is at the center of the front bumper
        .attr("y", c => -c.width / 2)
        .attr("height", c => c.width)
        .attr("width", c => c.length)
        .attr("fill", c => {
            return (c.isFocusCar()) ? TRAFFIC.constants.kFocusBodyColor : c.bodyColor;
        })
        .attr("class", "carBody")


    //  draw a dot
    cars.selectAll(".right-headlight")
        .data((c) => [c])
        .join("circle")
        .attr("cy", c => -c.width * 0.4)
        .attr("r", TRAFFIC.constants.kHeadlightRadius)
        .attr("fill", TRAFFIC.constants.kHeadlightColor)
        .attr("class", "right-headlight")

    cars.selectAll(".left-headlight")
        .data((c) => [c])
        .join("circle")
        .attr("cy", c => c.width * 0.4)
        .attr("r", TRAFFIC.constants.kHeadlightRadius)
        .attr("fill", TRAFFIC.constants.kHeadlightColor)
        .attr("class", "left-headlight")


}

function setupZoomContainer(bounds) {
    paper.selectAll(".flip-container").remove();

    const centerY = (bounds.yMin + bounds.yMax) / 2;
    const transformString = `scale(1, -1) translate(0, ${-2 * centerY})`;

    const flipContainer = paper.append("g");
    flipContainer
        .attr("transform", transformString)
        .attr("class", "flip-container");

    // Create zoom container for all content
    zoomContainer = flipContainer.append("g")
        .attr("class", "zoom-container")

    // Set up pan/zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            const t = event.transform;
            // Invert Y translation to account for coordinate flip
            const correctedTransform = `translate(${t.x}, ${-t.y}) scale(${t.k})`;
            zoomContainer.attr("transform", correctedTransform);
            zoomScale = t.k;
            updateScalingElements();
        });

    paper.call(zoom).call(zoom.transform, d3.zoomIdentity);;
}

// Fix 2: Separate function to update only scale-dependent elements
function updateScalingElements() {
    zoomContainer.selectAll(".edgeCenterline")
        .attr("stroke-width", TRAFFIC.constants.kEdgeThickness / zoomScale);

    zoomContainer.selectAll(".edgeStartBulb")
        .attr("r", TRAFFIC.constants.kEdgeBulbRadius / zoomScale);
}

function calculateBounds(edges) {
    const edgeArray = Object.values(edges);
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

    edgeArray.forEach(edge => {
        // Check both start and end points
        xMin = Math.min(xMin, edge.start.x, edge.end.x);
        xMax = Math.max(xMax, edge.start.x, edge.end.x);
        yMin = Math.min(yMin, edge.start.y, edge.end.y);
        yMax = Math.max(yMax, edge.start.y, edge.end.y);
    });

    return {xMin, xMax, yMin, yMax};
}

// Set up viewBox with padding
function setupViewBox(bounds, padding = 20) {
    const width = bounds.xMax - bounds.xMin + 2 * padding;
    const height = bounds.yMax - bounds.yMin + 2 * padding;
    const viewBoxX = bounds.xMin - padding;
    const viewBoxY = bounds.yMin - padding;

    paper.attr("viewBox", `${viewBoxX} ${viewBoxY} ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
}


export function resizeWindow() {
    const editorOpen = document.getElementById('carEditor')?.classList.contains('visible');
    const availableWidth = editorOpen ? window.innerWidth - 320 : window.innerWidth;

    paper
        .attr("width", availableWidth)
        .attr("height", window.innerHeight * 0.6)
}

