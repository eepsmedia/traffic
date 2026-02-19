# traffic
a simple traffic simulator

## Edges and nodes
The road network is a collection of (directed) edges (class `Edge`)
that connect at nodes (class `Node`).
A two-way street will have two (opposing) edges.
Edges must begin and end at nodes.

The edge-node graph is abstract and used to position everything and find routes.
The more concrete part of this system we might call roads and junctions.
These are made up of lanes (class `Lane`), which is where cars actually drive.
Each edge has a number of lanes.

Cars (class `Vehicle`) are actually positioned in lanes,
using a number that indicates how far the (center front of) the car
is from the lane's beginning.
We refer to these as "road lanes."
Each node also has lanes, representing all possible routes from
"in" Edges to "out" edges.
We refer to these as "junction lanes."

## Ports
Where an edge enters or leaves a node, we construct things called ports (`Port`),
one for each lane.
So a 90° intersection between two four-lane roads will have 16 ports.
Eight of those will be input ports (`Node` has an array, `inPorts`)
and eight will be output ports.
This means that every [road] lane begins at a node's output port and ends
at a node's input port.

## Edge and lane route roles
Every edge and every lane has what we call "route roles."
The idea is that we need to know about turning right or left, going straight, or making a u-turn.
For a section of road, this is done thinking about the upcoming junction.

For an Edge, that means that there is a role for every "out" edge from that node.
That is, you're saying, if we're on this edge, when we get to the next node,
it's possible to go ... right, straight, left, and/or make a u-turn.
The routeRoles object tells us, for every possible subsequent edge,
which of these will have happened.

For a Lane, this is a bit different.
For a road lane,
there is a routeRoles object that is the same,
listing what's possible for that lane.
For a junction lane,
there are no choices, so there is simply routeRole, a string.
One consequence of this design is that the final choice of what to do,
the route choice if you will,
happens when a car enters a junction (though a port).
Cars on a route may have to change lanes to anticipate that choice.
