import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

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

class Crosshair extends Shape{
    constructor() {
        super("position", "normal", "texture_coord");
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        for (let i = 0; i < 4; i++){
            const square_transform = Mat4.rotation(Math.PI / 2 * i, 0, 0, 1).times(Mat4.translation(0.1, -0.05, 0)).times(Mat4.scale(0.5*0.2, 0.5*0.1, 1)).times(Mat4.translation(1, 1, 0));
            defs.Square.insert_transformed_copy_into(this, [], square_transform);
        }
    }
}


export class AimChallenge extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sun: new defs.Subdivision_Sphere(4),
            floor: new defs.Cube(),
            target: new Shape_From_File("assets/soldier.obj"),
            side_wall: new defs.Cube(),
            back_wall: new defs.Cube(),
            floor: new defs.Cube(),
            crosshair: new Crosshair(),
        };

        this.shapes.side_wall.arrays.texture_coord.forEach((v) => {
            v[0] = v[0] * 16;
            v[1] = v[1] * 1;
        });
        this.shapes.back_wall.arrays.texture_coord.forEach((v) => {
            v[0] = v[0] * 8;
            v[1] = v[1] * 1;
        });

        // *** Materials
        this.materials = {
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#ffffff")}),
            floor: new Material(new defs.Phong_Shader(),
                {ambient: 0.3, specularity: 0, color: hex_color("#ffffff")}),
            target: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, color: hex_color("#ff0000")}),
            wall: new Material(new Texture_Scroll_X(),
                {ambient: 1, diffusivity: 0.5, specularity: 0, texture: new Texture("assets/wall.jpg", "NEAREST")}),
            crosshair: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#00ff00")})
        }

        // target-related variables
        this.is_targets_down = [true, true, true, true, true, true, true, true];
        this.target_list = [];
        for (let i = 0; i < this.is_targets_down.length; i++) {
            this.target_list.push(Mat4.identity());
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 1.8, 0), vec3(0, 1.8, -15), vec3(0, 2, -1));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Toggle target1", ["Control", "0"], () => this.is_targets_down[0] = !this.is_targets_down[0])
        this.new_line();
        this.key_triggered_button("Toggle target2", ["Control", "1"], () => this.is_targets_down[1] = !this.is_targets_down[1]);
        this.new_line();
        this.key_triggered_button("Toggle target3", ["Control", "2"], () => this.is_targets_down[2] = !this.is_targets_down[2]);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        console.log(program_state.camera_inverse[1])

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const light_position1 = vec4(0, 14, -50, 1);
        const light_position2 = vec4(0, 14, -150, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position1, color(1, 1, 1, 1), 10000), new Light(light_position2, color(1, 1, 1, 1), 10000)];
        this.shapes.sun.draw(context, program_state, Mat4.translation(0, 14, -50), this.materials.sun);
        this.shapes.sun.draw(context, program_state, Mat4.translation(0, 14, -150), this.materials.sun);
        //draw crosshair
        let cam_x = -program_state.camera_inverse[0][3];
        let cam_y = -program_state.camera_inverse[1][3];
        let cam_z = -program_state.camera_inverse[2][3];
        this.shapes.crosshair.draw(context, program_state, Mat4.translation(cam_x, cam_y, cam_z - 20), this.materials.crosshair);
        
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
        this.shapes.floor.draw(context, program_state, model_transform_ceil, this.materials.floor);

        // Setup targets
        for(let i = 0; i < 8; i++){
            if(this.is_targets_down[i]){
                let new_x = Math.floor(Math.random() * (X_MAX - X_MIN + 1)) + X_MIN;
                let new_z = Math.floor(Math.random() * (Z_MAX - Z_MIN + 1)) + Z_MIN;
                this.target_list[i] = Mat4.translation(new_x, 0, -new_z).times(Mat4.translation(0, 3.25, 0));
                this.is_targets_down[i] = false;
            }
            this.shapes.target.draw(context, program_state, this.target_list[i], this.materials.target);
        }
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
