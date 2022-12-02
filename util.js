import {tiny} from '../tiny-graphics.js';
import {defs} from './examples/common.js';
import {widgets} from '../tiny-graphics-widgets.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4,
    Light, Shape, Material, Shader, Texture, Scene
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export {Movement_Controls}

const Movement_Controls = 
    class Movement_Controls extends Scene {
        // **Movement_Controls** is a Scene that can be attached to a canvas, like any other
        // Scene, but it is a Secondary Scene Component -- meant to stack alongside other
        // scenes.  Rather than drawing anything it embeds both first-person and third-
        // person style controls into the website.  These can be used to manually move your
        // camera or other objects smoothly through your scene using key, mouse, and HTML
        // button controls to help you explore what's in it.
        constructor() {
            super();
            const data_members = {
                roll: 0, look_around_locked: true,
                thrust: vec3(0, 0, 0), pos: vec3(0, 0, 0), z_axis: vec3(0, 0, 0),
                radians_per_frame: 1 / 200, meters_per_frame: 20, speed_multiplier: 1
            };
            Object.assign(this, data_members);

            this.mouse_enabled_canvases = new Set();
            this.will_take_over_graphics_state = true;
        }

        set_recipient(matrix_closure, inverse_closure) {
            // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
            // instead, track an external target matrix to modify.  Targets must be pointer references
            // made using closures.
            this.matrix = matrix_closure;
            this.inverse = inverse_closure;
        }

        reset(graphics_state) {
            // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
            // encountered program_state object.  Targets must be pointer references made using closures.
            this.set_recipient(() => graphics_state.camera_transform,
                () => graphics_state.camera_inverse);
        }


        show_explanation(document_element) {
        }

        make_control_panel() {
            // make_control_panel(): Sets up a panel of interactive HTML elements, including
            // buttons with key bindings for affecting this scene, and live info readouts.
            // this.control_panel.innerHTML += "Click and drag the scene to spin your viewpoint around it.<br>";
            this.live_string(box => box.textContent = "- Position: " + this.pos[0].toFixed(2) + ", " + this.pos[1].toFixed(2)
                + ", " + this.pos[2].toFixed(2));
            this.new_line();
            // The facing directions are surprisingly affected by the left hand rule:
            this.live_string(box => box.textContent = "- Facing: " + ((this.z_axis[0] > 0 ? "West " : "East ")
                + (this.z_axis[1] > 0 ? "Down " : "Up ") + (this.z_axis[2] > 0 ? "North" : "South")));
            this.new_line();
            this.new_line();

            this.key_triggered_button("Up", ["w"], () => this.thrust[1] = -1, undefined, () => this.thrust[1] = 0);
            // this.key_triggered_button("Forward", ["w"], () => this.thrust[2] = 1, undefined, () => this.thrust[2] = 0);
            this.new_line();
            this.key_triggered_button("Left", ["a"], () => (this.pos[0] <= 48) ? this.thrust[0] = 1 : this.thrust[0] = 0, undefined, () => this.thrust[0] = 0);
            // this.key_triggered_button("Back", ["s"], () => this.thrust[2] = -1, undefined, () => this.thrust[2] = 0);
            this.key_triggered_button("Right", ["d"], () => (this.pos[0] >= -48) ? this.thrust[0] = -1 : this.thrust[0] = 0, undefined, () => this.thrust[0] = 0);
            this.new_line();
            this.key_triggered_button("Down", ["s"], () => this.thrust[1] = 1, undefined, () => this.thrust[1] = 0);

            const speed_controls = this.control_panel.appendChild(document.createElement("span"));
            speed_controls.style.margin = "30px";
            this.key_triggered_button("-", ["o"], () =>
                this.speed_multiplier /= 1.2, undefined, undefined, undefined, speed_controls);
            this.live_string(box => {
                box.textContent = "Speed: " + this.speed_multiplier.toFixed(2)
            }, speed_controls);
            this.key_triggered_button("+", ["p"], () =>
                (this.speed_multiplier < 3)? this.speed_multiplier *= 1.2: this.speed_multiplier *=1, undefined, undefined, undefined, speed_controls);
            this.new_line();
        }

        first_person_flyaround(radians_per_frame, meters_per_frame, leeway = 70) {
            // (Internal helper function)
            // Compare mouse's location to all four corners of a dead box:
            
            // Now apply translation movement of the camera, in the newest local coordinate frame.
            this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
            this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
        }

        

        display(context, graphics_state, dt = graphics_state.animation_delta_time / 1000) {
            // The whole process of acting upon controls begins here.
            const m = this.speed_multiplier * this.meters_per_frame,
                r = this.speed_multiplier * this.radians_per_frame;

            if (this.will_take_over_graphics_state) {
                this.reset(graphics_state);
                this.will_take_over_graphics_state = false;
            }

            // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
            if(this.pos[0] >= 48 && this.thrust[0] > 0){
                this.thrust[0] = 0
            }

            if(this.pos[0] <= -48 && this.thrust[0] < 0){
                this.thrust[0] = 0
            }

            if(this.pos[1] >= -1 && this.thrust[1] > 0){
                this.thrust[1] = 0
            }

            if(this.pos[1] <= -14 && this.thrust[1] < 0){
                this.thrust[1] = 0
            }

            

            this.first_person_flyaround(dt * r, dt * m);
            // Also apply third-person "arcball" camera mode if a mouse drag is occurring:

            // Log some values:
            this.pos = this.inverse().times(vec4(0, 0, 0, 1));
            this.z_axis = this.inverse().times(vec4(0, 0, 1, 0));
        }
    }



export class Body {
        // **Body** can store and update the properties of a 3D body that incrementally
        // moves from its previous place due to velocities.  It conforms to the
        // approach outlined in the "Fix Your Timestep!" blog post by Glenn Fiedler.
        constructor(shape, material, size) {
            Object.assign(this,
                {shape, material, size})

            this.hit = false
        }
    
        // (within some margin of distance).
        static intersect_cube(p, margin = 0) {
            return p.every(value => value >= -1 - margin && value <= 1 + margin)
        }
    
        static intersect_sphere(p, margin = 0) {
            return p.dot(p) < 1 + margin;
        }
    
        emplace(location_matrix, linear_velocity, angular_velocity, spin_axis = vec3(0, 0, 0).randomized(1).normalized()) {                               // emplace(): assign the body's initial values, or overwrite them.
            this.center = location_matrix.times(vec4(0, 0, 0, 1)).to3();
            this.rotation = Mat4.translation(...this.center.times(-1)).times(location_matrix);
            this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
            // drawn_location gets replaced with an interpolated quantity:
            this.drawn_location = location_matrix;
            this.temp_matrix = Mat4.identity();
            return Object.assign(this, {linear_velocity, angular_velocity, spin_axis})
        }
    
        advance(time_amount) {
            // advance(): Perform an integration (the simplistic Forward Euler method) to
            // advance all the linear and angular velocities one time-step forward.
            this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
            // Apply the velocities scaled proportionally to real time (time_amount):
            // Linear velocity first, then angular:
            this.center = this.center.plus(this.linear_velocity.times(time_amount));
            this.rotation.pre_multiply(Mat4.rotation(time_amount * this.angular_velocity, ...this.spin_axis));
        }
    
        // The following are our various functions for testing a single point,
        // p, against some analytically-known geometric volume formula
    
        blend_rotation(alpha) {
            // blend_rotation(): Just naively do a linear blend of the rotations, which looks
            // ok sometimes but otherwise produces shear matrices, a wrong result.
    
            // TODO:  Replace this function with proper quaternion blending, and perhaps
            // store this.rotation in quaternion form instead for compactness.
            return this.rotation.map((x, i) => vec4(...this.previous.rotation[i]).mix(x, alpha));
        }
    
        blend_state(alpha) {
            // blend_state(): Compute the final matrix we'll draw using the previous two physical
            // locations the object occupied.  We'll interpolate between these two states as
            // described at the end of the "Fix Your Timestep!" blog post.
            this.drawn_location = Mat4.translation(...this.previous.center.mix(this.center, alpha))
                .times(this.blend_rotation(alpha))
                .times(Mat4.scale(...this.size));
        }
    
        check_if_colliding(b, collider) {
            // check_if_colliding(): Collision detection function.
            // DISCLAIMER:  The collision method shown below is not used by anyone; it's just very quick
            // to code.  Making every collision body an ellipsoid is kind of a hack, and looping
            // through a list of discrete sphere points to see if the ellipsoids intersect is *really* a
            // hack (there are perfectly good analytic expressions that can test if two ellipsoids
            // intersect without discretizing them into points).
            if (this == b)
                return false;
            // Nothing collides with itself.
            // Convert sphere b to the frame where a is a unit sphere:
            const T = this.inverse.times(b.drawn_location, this.temp_matrix);
    
            const {intersect_test, points, leeway} = collider;
            // For each vertex in that b, shift to the coordinate frame of
            // a_inv*b.  Check if in that coordinate frame it penetrates
            // the unit sphere at the origin.  Leave some leeway.
            return points.arrays.position.some(p =>
                intersect_test(T.times(p.to4(1)).to3(), leeway));
        }
    }


export class Simulation extends Scene {
        // **Simulation** manages the stepping of simulation time.  Subclass it when making
        // a Scene that is a physics demo.  This technique is careful to totally decouple
        // the simulation from the frame rate (see below).
        constructor() {
            super();
            Object.assign(this, {time_accumulator: 0, time_scale: 1, t: 0, dt: 1 / 20, bodies: [], steps_taken: 0});
        }
    
        simulate(frame_time) {
            // simulate(): Carefully advance time according to Glenn Fiedler's
            // "Fix Your Timestep" blog post.
            // This line gives ourselves a way to trick the simulator into thinking
            // that the display framerate is running fast or slow:
            frame_time = this.time_scale * frame_time;
    
            // Avoid the spiral of death; limit the amount of time we will spend
            // computing during this timestep if display lags:
            this.time_accumulator += Math.min(frame_time, 0.1);
            // Repeatedly step the simulation until we're caught up with this frame:
            while (Math.abs(this.time_accumulator) >= this.dt) {
                // Single step of the simulation for all bodies:
                this.update_state(this.dt);
                for (let b of this.bodies)
                    b.advance(this.dt);
                // Following the advice of the article, de-couple
                // our simulation time from our frame rate:
                this.t += Math.sign(frame_time) * this.dt;
                this.time_accumulator -= Math.sign(frame_time) * this.dt;
                this.steps_taken++;
            }
            // Store an interpolation factor for how close our frame fell in between
            // the two latest simulation time steps, so we can correctly blend the
            // two latest states and display the result.
            let alpha = this.time_accumulator / this.dt;
            for (let b of this.bodies) b.blend_state(alpha);
        }
    
    
        display(context, program_state) {
            // display(): advance the time and state of our whole simulation.
            if (program_state.animate)
                this.simulate(program_state.animation_delta_time);
            // Draw each shape at its current location:
            for (let b of this.bodies)
                b.shape.draw(context, program_state, b.drawn_location, b.material);
        }
    
        update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
        {
            throw "Override this"
        }
    }


    export class Crosshair extends Shape{
        constructor() {
            super("position", "normal", "texture_coord");
            // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
            for (let i = 0; i < 4; i++){
                const square_transform = Mat4.rotation(Math.PI / 2 * i, 0, 0, 1).times(Mat4.translation(0.1, -0.05, 0)).times(Mat4.scale(0.5*0.2, 0.5*0.1, 1)).times(Mat4.translation(1, 1, 0));
                defs.Square.insert_transformed_copy_into(this, [], square_transform);
            }
        }
    }