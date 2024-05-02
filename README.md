# Three.js First-person Game Demo

The goal of this project is to create an educational and instructive demonstration a clean implementation of the basic concepts and that go into making a 3D first-person game, and to demonstrate the strong dependence on Linear Algebra in computer graphics and game development. 

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

The physics simulation is implemented using semester 1 physics concepts, namely kinematics. The kinematics equations used are technically invalidated due to the inclusion of a retarding drag force, however testing has showed that above 5 discrete steps per second (FPS), it is still a very solid approximation.
