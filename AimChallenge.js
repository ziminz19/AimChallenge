import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

// TODO: HOW TO GET BACK TO JUST THE REGULAR SOLAR SYSTEM
// TODO: MAYBE FIX THE TILT A LITTLE BIT

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

export class AimChallenge extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sun: new defs.Subdivision_Sphere(4),
            wall_obj: new Shape_From_File("assets/wall.obj"),
            floor: new defs.Cube(),
            target: new Shape_From_File("assets/soldier.obj"),
            rect: new defs.Cube(),
        };

        // *** Materials
        this.materials = {
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#ffffff")}),
            damaged_text: new Material(new defs.Phong_Shader, {
                ambient: 1, color: hex_color("#808080")}),
            floor: new Material(new defs.Phong_Shader(),
                {ambient: 0, color: hex_color("#228B22")}),
            target: new Material(new defs.Phong_Shader(),
                {ambient: 0.2, color: hex_color("#ff0000")}),
            wall: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#ffffff")}),
        }

        this.is_targets_down = [false, false, false];

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

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const light_position = vec4(0, 8, 0, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10000)];
        this.shapes.sun.draw(context, program_state, Mat4.translation(0, 16, 0), this.materials.sun);
        
        // Draw walls
        let model_transform_wall_left = Mat4.translation(-11, 0, 0).times(Mat4.scale(0.5, 8, 50)).times(Mat4.translation(1, 1, -1));
        this.shapes.rect.draw(context, program_state, model_transform_wall_left, this.materials.wall);
        let model_transform_wall_right = Mat4.translation(10, 0, 0).times(Mat4.scale(0.5, 8, 50)).times(Mat4.translation(1, 1, -1));
        this.shapes.rect.draw(context, program_state, model_transform_wall_right, this.materials.wall);
        let model_transform_wall_back = Mat4.translation(-11, 0, -100).times(Mat4.scale(11, 8, 0.5)).times(Mat4.translation(1, 1, -1));
        this.shapes.rect.draw(context, program_state, model_transform_wall_back, this.materials.wall);

        // Draw floor and ceiling
        let model_transform_floor = Mat4.translation(-11, -1, 0).times(Mat4.scale(11, 0.5, 50)).times(Mat4.translation(1, 1, -1));
        this.shapes.rect.draw(context, program_state, model_transform_floor, this.materials.floor);
        let model_transform_ceil = Mat4.translation(-11, 16, 0).times(Mat4.scale(11, 0.5, 50)).times(Mat4.translation(1, 1, -1));
        this.shapes.rect.draw(context, program_state, model_transform_ceil, this.materials.floor);

        // Setup targets
        let model_transform_target = (Mat4.translation(0, 0, -1));

        this.shapes.target.draw(context, program_state, model_transform_target, this.materials.target);
        
        // let model_transform_wall_front = Mat4.translation(0, 0, -45).times(Mat4.scale(30, 30, 10));
        // this.shapes.wall_obj.draw(context, program_state, model_transform_wall_front, this.materials.damaged_text);
        // let model_transform_wall_left = Mat4.translation(-45, 0, 0).times(Mat4.rotation(Math.PI / 2, 0, 1, 0)).times(Mat4.scale(30, 30, 10));
        // this.shapes.wall_obj.draw(context, program_state, model_transform_wall_left, this.materials.damaged_text);
        // let model_transform_wall_right = Mat4.translation(45, 0, 0).times(Mat4.rotation(-Math.PI / 2, 0, 1, 0)).times(Mat4.scale(30, 30, 10));
        // this.shapes.wall_obj.draw(context, program_state, model_transform_wall_right, this.materials.damaged_text);
        // let model_transform_floor = Mat4.identity().times(Mat4.translation(0, -11, 0)).times(Mat4.scale(30, 0.1, 300));
        // this.shapes.wall_obj.draw(context, program_state, model_transform_floor, this.materials.floor);

        // let model_transform_target1 = Mat4.identity();
        // let model_transform_target2 = Mat4.identity();
        // let model_transform_target3 = Mat4.identity();

        // let model_transform_targets = [model_transform_target1, model_transform_target2, model_transform_target3]

        // for (let i = 0; i < this.is_targets_down.length; i++){
        //     if (this.is_targets_down[i]){
        //         model_transform_targets[i] = model_transform_targets[i].times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
        //     }
        // }

        // model_transform_targets[0] = Mat4.translation(-18, -1.25, -15).times(Mat4.scale(3, 3, 3)).times(model_transform_targets[0]);
        // model_transform_targets[1] = Mat4.translation(18, -1.25, -15).times(Mat4.scale(3, 3, 3)).times(model_transform_targets[1]);
        // if (this.is_targets_down[2]){
        //     this.tmp = Mat4.translation(20 * Math.sin(0.7 * t), -1.25, 3 * Math.sin(0.6 * t)).times(Mat4.scale(3, 3, 3)).times(model_transform_targets[2]);
        //     model_transform_targets[2] = this.tmp;
        // }
        // else{
        //     model_transform_targets[2] = Mat4.translation(20 * Math.sin(0.7 * t), -1.25, 3 * Math.sin(0.6 * t)).times(Mat4.scale(3, 3, 3)).times(model_transform_targets[2]);
        // }


        // for (let i = 0; i < this.is_targets_down.length; i++){
        //     if (this.is_targets_down[i]){
        //         model_transform_targets[i] = Mat4.translation(0, -9, -10).times(model_transform_targets[i]);
        //     }
        // }
        
        
        // for (let i = 0; i < model_transform_targets.length; i++){
        //     this.shapes.target.draw(context, program_state, model_transform_targets[i], this.materials.target);
        // }
        
    }
}
