import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
    this.initializedMaterialUBO = false;
  }

  _initialize() {
    //this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});

    this.materialUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_MATERIALS * Renderer.MATERIAL_DATA_CHUNK_SIZE));    
    // True for all programs, keep in mesh ??
    this.modelMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal 
    ]);

    this.sceneMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // view
        ...mat4.create(), // projection
    ]);
    this.directionalUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  }

  _renderObject(object, scene, camera) {

    // Each object has its own material, update the UBO
    const materials = object.shader.materials;
    for (let i = 0; i < materials.length; ++i) {
      const m = materials[i];
      this.materialUBO.update([
        //...object._materials[i]
        ...[...m.ambient, 0.0], // vec3 16  0 REAL 12
        ...[...m.diffuse, 0.0], // vec3 16  16
        ...[...m.emissive, 0.0], // vec3 16  32
        ...[...m.specular, 0.0], // vec3 16  48
       // m.specularExponent
      ], i * Renderer.MATERIAL_DATA_CHUNK_SIZE); // Real chunk size here
    }
  
    // For each light source upload position and other info here..
    //const material = object.material;
    
    const shader = object.shader;
    const program = shader.program;
    const programInfo = shader.programInfo;

    shader.activate(); // Unique shader per object
    const gl = glContext();
    gl.uniform1i(programInfo.uniformLocations.numLights, scene.lights.length);

    // Update lights
    shader.bindTextures();
    
    // These doesn't change?
    // Needs to happen per frame
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.material, this.materialUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.scene, this.sceneMatricesUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.model, this.modelMatricesUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.directional, this.directionalUBO.location);

    // Calculate normal matrix
    // Per object    
    // Bind Uniform buffer object
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
    object.draw();
  }

  _internalRender(scene, camera) {
    // Bind UBO's, this needs to happen each frame
    this.sceneMatricesUBO.bind();
    this.directionalUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind();

    // Update per scene ubos
    this.sceneMatricesUBO.update([
      ...camera.viewMatrix,
      ...camera.projectionMatrix
    ]);

    // Update per scene light's UBO
    for (let i = 0; i < scene.lights.length; i++) {
      const l = scene.lights[i];
      this.directionalUBO.update([
         ...l.color,  // vec4 16
         ...[l.intensity, 0.0, 0.0, 0.0], // vec4 16
         ...[l.positionViewSpace[0], l.positionViewSpace[1], l.positionViewSpace[2]], // vec4 16 // EQ : CHUNK SIZE SHOULD BE.... CS = TOTALSIZE / ( SIZEOF(FLOAT) ( == 4 ))
       ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }

    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    scene.objects.forEach(object => {
      this._renderObject(object, scene, camera);
    });
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

Renderer.LIGHT_DATA_CHUNK_SIZE = 12; // EACH element is 4 bytes in float32array yielding an offset of 12 * 4 = 48 !!!
Renderer.MATERIAL_DATA_CHUNK_SIZE = 16;
Renderer.MAX_LIGHTS = 16;
Renderer.MAX_MATERIALS = 30;

export const glContext = () => {
  return context;
}

export default Renderer;