import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});

    this.perModel = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal
    ]);
    this.perScene = new UniformBufferObject([
        ...mat4.create(), // view
        ...mat4.create(), // projection
    ]);
    this.directional = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  }

  setRatio(ratio) {
    this.ratio = ratio;
  }

  _internalRender(scene, camera) {
    this.perScene.bind();
    this.directional.bind();
    this.perModel.bind();

    // Per scene
    this.perScene.update([
      ...camera.viewMatrix,
      ...camera.projectionMatrix
    ]);

    // Lights
    for (let i = 0; i < scene.lights.length; i++) {

      const pos = scene.lights[i].position;
     // console.log(pos);

      const lightPosVec4 = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);


      const lModelMatrix = scene.lights[i].modelMatrix;
      const lModelView = mat4.create();
      mat4.multiply(lModelView, camera.viewMatrix, lModelMatrix);

      const out = vec4.create();
      //console.log(lightPosVec4)

      vec4.transformMat4(out, lightPosVec4, camera.viewMatrix);

      //console.log(out);

      this.directional.update([
        ...scene.lights[i].color,
        ...[scene.lights[i].intensity, 0.0, 0.0, 0.0],
        ...out,
      ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }

    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    const objects = scene.objects;
    for (let i = 0; i < objects.length; ++i) {
      // For each light source upload position and other info here..
      const material = objects[i].material;
      const program = material.program;

      material.activate();
      material.setUniform("numLights", scene.lights.length);

      const gl = glContext();

      const modelLocation = gl.getUniformBlockIndex(program, 'perModel');
      const sceneLocation = gl.getUniformBlockIndex(program, 'perScene');
      const directionalLocation = gl.getUniformBlockIndex(program, 'directional');

      gl.uniformBlockBinding(program, sceneLocation, this.perScene.location);
      gl.uniformBlockBinding(program, modelLocation, this.perModel.location);
      gl.uniformBlockBinding(program, directionalLocation, this.directional.location);

      // Calculate normal matrix
      const modelMatrix = objects[i].modelMatrix;
      const normalMatrix = mat4.create();
      const modelViewMatrix = mat4.create();

      mat4.multiply(modelViewMatrix, camera.viewMatrix, modelMatrix);
      mat4.invert(normalMatrix, modelViewMatrix);
      mat4.transpose(normalMatrix, normalMatrix);

      this.perModel.update([
        ...modelMatrix,
        ...normalMatrix
      ]);
      material.setInternalUniforms();
      objects[i].render(camera);
    }
  }

  render(scene, camera) {
    const gl = glContext();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (true) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0); // Clear all
    }

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas

    camera.update();

    // Update
    scene.traverse(camera);
    this._internalRender(scene, camera);
  }
}

Renderer.LIGHT_DATA_CHUNK_SIZE = 12;
Renderer.MAX_LIGHTS = 16;

export const glContext = () => {
  return context;
}

export default Renderer;