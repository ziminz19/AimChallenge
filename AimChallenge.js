import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';
import { Movement_Controls, Body, Simulation, Crosshair } from './util.js';

// TODO: HOW TO GET BACK TO JUST THE REGULAR SOLAR SYSTEM
// TODO: MAYBE FIX THE TILT A LITTLE BIT

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs
const Z_MAX = 200;
const Z_MIN = 50;
const X_MAX = 46;
const X_MIN = -46;



export class AimChallenge extends Simulation {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.bullets = []
        this.targets = []
        this.score = 0
        this.active = true
        this.tm = 0
        this.gravity = 1
        
        this.collider = {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(4), leeway: .3}

        this.cam = vec3(0, 1.8, 0)

        this.fire = false

        this.shapes = {
            sun: new defs.Subdivision_Sphere(4),
            floor: new defs.Cube(),
            ceil: new defs.Cube(),
            target: new Shape_From_File("assets/soldier.obj"),
            side_wall: new defs.Cube(),
            back_wall: new defs.Cube(),
            floor: new defs.Cube(),
            crosshair: new Crosshair(),
            rifle: new Shape_From_File("assets/rifle.obj"),
            bullet: new defs.Subdivision_Sphere(4),
        };

        this.shapes.side_wall.arrays.texture_coord.forEach((v) => {
            v[0] = v[0] * 16;
            v[1] = v[1] * 1;
        });
        this.shapes.back_wall.arrays.texture_coord.forEach((v) => {
            v[0] = v[0] * 8;
            v[1] = v[1] * 1;
        });
        this.shapes.floor.arrays.texture_coord.forEach((v) => {
            v[0] = v[0] * 8;
            v[1] = v[1] * 8;
        });
        this.shapes.ceil.arrays.texture_coord.forEach((v) => {
            v[0] = v[0] * 8;
            v[1] = v[1] * 8;
        });

        this.Background_music = new Audio("assets/bgm.mp3");
        this.shooting_sound = new Audio("assets/shooting_sound.mp3");

        // *** Materials
        this.materials = {
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#ffffff")}),
            floor: new Material(new Texture_Scroll_X(),
                {ambient: 0.4, specularity: 0, texture: new Texture("assets/floor.png", "NEAREST")}),
            ceil: new Material(new Texture_Scroll_X(),
                {ambient: 0.7, specularity: 0, texture: new Texture("assets/ceil.jpg", "NEAREST")}),
            target: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, color: hex_color("#ff0000")}),
            wall: new Material(new Texture_Scroll_X(),
                {ambient: 1, diffusivity: 0.5, specularity: 0, texture: new Texture("assets/wall.jpg", "NEAREST")}),
            crosshair: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#00ff00")}),
            rifle: new Material(new Texture_Scroll_X(),
                {ambient: 1, texture: new Texture("assets/rifle_texture.png", "NEAREST")}),
            bullet: new Material(new defs.Phong_Shader(),
                {ambient: 1, specularity: 1, diffusitivity: 1, color: hex_color("#000000")}),
            collision_box:
                new Material(new defs.Phong_Shader(), {color: color(0, 1, 0, .5), ambient: 1})
        }

        

        this.initial_camera_location = Mat4.look_at(vec3(0, 1.8, 0), vec3(0, 1.8, -15), vec3(0, 2, -1));
        
    }

    

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        

        this.new_line()
        
        const gravity_controls = this.control_panel.appendChild(document.createElement("span"));
            gravity_controls.style.margin = "30px";
            this.key_triggered_button("-", ["u"], () =>
                this.gravity /= 1.2, undefined, undefined, undefined, gravity_controls);
            this.live_string(box => {
                box.textContent = "Gravity: " + this.gravity.toFixed(2)
            }, gravity_controls);
            this.key_triggered_button("+", ["i"], () =>
                (this.gravity < 10)? this.gravity *= 1.2: this.gravity *=1, undefined, undefined, undefined, gravity_controls);
            this.new_line();


        this.key_triggered_button("fire", [" "], () => {
            this.fire = true
            this.shooting_sound.currentTime = 0.0
            this.shooting_sound.play();
        })
        this.key_triggered_button("reset game", ["r"], () => {
            this.reset()
            this.Background_music.currentTime = 0.0
            this.Background_music.play();
        });
    }

    reset() {
        this.active = true
        this.tm = 0
        this.score = 0
    }
    
    update_state(dt) {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate additional moving bodies if there ever aren't enough:

        if(this.targets.length < 8){
            let new_x = Math.floor(Math.random() * (X_MAX - X_MIN + 1)) + X_MIN;
            let new_z = Math.floor(Math.random() * (Z_MAX - Z_MIN + 1)) + Z_MIN;
            this.targets.push(new Body(this.shapes.target, this.materials.target, vec3(1, 1, 1))
            .emplace(Mat4.translation(new_x, 3.25, -new_z), vec3(0,0,0),0))

            
        }


        if (this.fire){
            this.bullets.push(new Body(this.shapes.bullet, this.materials.bullet, vec3(0.8, 0.8, 0.8))
                .emplace(Mat4.translation(...this.cam.plus(vec3(0, 0, -15))),
                    vec3(0, 0, -30), 0));
            this.fire = !this.fire
        }
            

        for (let b of this.bullets) {
            // Gravity on Earth, where 1 unit in world space = 1 meter:
            b.linear_velocity[1] += dt * this.gravity * -0.1;
            // If about to fall through floor, reverse y velocity:
        }


        for (let a of this.bullets) {
            a.inverse = Mat4.inverse(a.drawn_location);
            // *** Collision process is here ***
            // Loop through all bodies again (call each "b"):
            for (let b of this.targets) {
                // Pass the two bodies and the collision shape to check_if_colliding():
                if (a.check_if_colliding(b, this.collider)){
                    a.hit = true
                    b.hit = true
                    if(this.active){
                        this.score += 1
                    }
                    
                    console.log(this.score)
                }
            }
        }
        
        // Delete bodies that stop or stray too far away:
        this.targets = this.targets.filter(b => !b.hit);
        this.bullets = this.bullets.filter(b => b.center[2] > -200 && b.center[1] > 0 && !b.hit);
        this.bodies = this.targets.concat(this.bullets)

    }
    

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrdix, projection matrix, and lights:

        super.display(context, program_state);
        

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        if(dt <100){
            this.Background_music.play()
        }


        if(this.tm < 60){
            this.tm = this.tm + dt;
        } else {
            this.active = false
        }
        const light_position1 = vec4(0, 14, -50, 1);
        const light_position2 = vec4(0, 14, -150, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position1, color(1, 1, 1, 1), 5000), new Light(light_position2, color(1, 1, 1, 1), 5000)];
        

        // Draw crosshair
        let cam_x = -program_state.camera_inverse[0][3];
        let cam_y = -program_state.camera_inverse[1][3];
        let cam_z = -program_state.camera_inverse[2][3];
        this.cam = vec3(cam_x, cam_y, cam_z)
        this.shapes.crosshair.draw(context, program_state, Mat4.translation(cam_x, cam_y, cam_z - 20), this.materials.crosshair);

        // Draw Rifle
        let model_transform_rifle = Mat4.translation(cam_x + 0.7, cam_y - 0.75, cam_z - 0.2).times(Mat4.rotation(19 * Math.PI / 18, 0, 1, 0)).times(Mat4.rotation(-Math.PI / 23, 1, 0, 0));
        this.shapes.rifle.draw(context, program_state, model_transform_rifle, this.materials.rifle);
        
        // Draw walls
        let model_transform_wall_left = Mat4.translation(-51, 0, 0).times(Mat4.scale(0.5, 8, 100)).times(Mat4.translation(1, 1, -1));
        this.shapes.side_wall.draw(context, program_state, model_transform_wall_left, this.materials.wall);
        let model_transform_wall_right = Mat4.translation(50, 0, 0).times(Mat4.scale(0.5, 8, 100)).times(Mat4.translation(1, 1, -1));
        this.shapes.side_wall.draw(context, program_state, model_transform_wall_right, this.materials.wall);
        let model_transform_wall_back = Mat4.translation(-51, 0, -200).times(Mat4.scale(51, 8, 0.5)).times(Mat4.translation(1, 1, -1));
        this.shapes.back_wall.draw(context, program_state, model_transform_wall_back, this.materials.wall);

        // Draw floor and ceiling
        let model_transform_floor = Mat4.translation(-51, -1, 0).times(Mat4.scale(51, 0.5, 100)).times(Mat4.translation(1, 1, -1));
        this.shapes.floor.draw(context, program_state, model_transform_floor, this.materials.floor);
        let model_transform_ceil = Mat4.translation(-51, 16, 0).times(Mat4.scale(51, 0.5, 100)).times(Mat4.translation(1, 1, -1));
        this.shapes.ceil.draw(context, program_state, model_transform_ceil, this.materials.ceil);

        let scoreEl = document.getElementById("Score");
        let timeEl = document.getElementById("Time");
        scoreEl.textContent = this.score;
        timeEl.textContent = 60 - this.tm.toFixed();


    



    }
        
    show_explanation(document_element) {
        document_element.innerHTML += `
        <head>
        <link href='https://fonts.googleapis.com/css2?family=Silkscreen&display=swap' rel='stylesheet' type='text/css'>
        <style>
        body {
            margin: 0;
            padding: 0;
            justify-content: center;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #10002b;
          }
          .container {
            max-width: 1080px;
            max-height: 200px;
            background: #4c1d95;
            border-radius: 12px;
            border: 3px solid white;
            display: flex;
            align-self: center;
            justify-content: space-around;
            align-items: center;
            color: white;
            padding: 68px 82px;
            gap: 100px;
            box-shadow: 0px 0px 3px black;
          }
          .row {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
          }
          .col-heading h1 {
            font-family: "Verdana";
            font-style: normal;
            font-weight: 700;
            font-size: 40px;
            line-height: 36px;
            text-align: center;
          
            color: white;
          }
          .col-display {
            width: 155px;
            height: 120px;
            background: #080001;
            border-radius: 5px;
            font-family: "Silkscreen", cursive;
            font-style: normal;
            font-weight: 400;
            font-size: 90px;
            line-height: 110px;
            text-align: center;
            color: #f94f6d;
          }
          .col-points {
            margin-top: 25px;
            display: flex;
            gap: 10px;
          }
          .add {
            width: 45px;
            height: 45px;
            border: 2px solid white;
            border-radius: 5px;
            font-family: "Silkscreen", cursive;
            font-style: normal;
            font-weight: 400;
            font-size: 18px;
            line-height: 28px;
            text-align: center;
            color: white;
            line-height: 35px;
            background: transparent;
          }
        </style>
        </head>
        <body>
            <div class="container">
                <div class="row">
                    <div class="col col-heading">
                        <h1>Score</h1>
                    </div>
                    <div class="col col-display" id="Score">1</div>
                </div>
                <div class="row">
                    <div class="col col-heading">
                        <h1>Time</h1>
                    </div>
                    <div class="col col-display" id="Time">2</div>
                </div>
            </div>
        </body>
      `
    }

}

class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                vec2 scaled_coord = f_tex_coord - vec2(mod(animation_time * 2.0, 4.0) , 0.0);
                vec4 tex_color = texture2D( texture, f_tex_coord - vec2(mod(animation_time * 2.0, 4.0) , 0.0));
                
                if( tex_color.w < .01 ) discard;  
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}