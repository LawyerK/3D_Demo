# Three.js First-person Game Demo

The goal of this project is to create an educational and instructive demonstration and clean implementation of the basic concepts and that go into making a 3D first-person game, and to demonstrate the strong dependence on Linear Algebra in computer graphics and game development. 

# The Demo

- Left click to lock pointer and control the camera. 
- `Escape` to exit pointer lock
- `W`, `A`, `S`, `D` to move around. 
- Space to jump
- Shift to crouch
- `F` to toggle fly
- `G` to toggle to 3rd person
- `T` to toggle daylight cycle
    - When off, it is forced to a constant point during the day.
- `P` to pause physics simulation
- `L` to tick physics engine when paused.

The physics simulation mirrors Newtonian mechanics and is implemented using the [Velocity Verlet integration technique](https://en.wikipedia.org/wiki/Verlet_integration#Velocity_Verlet). 
Collision detection and resolution is implemented using the [Separating Axis Theorem](https://en.wikipedia.org/wiki/Hyperplane_separation_theorem#Use_in_collision_detection).
