import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

// TODO: Remove global
let context;

// window.onresize = function(event) {
//   const gl = glContext();
//   console.log(gl.canvas.clientWidth)

//   var width = window.innerWidth;
//   var height = window.innerHeight;

//   gl.canvas.width = width;
//   gl.canvas.height = height;
//   //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
// };

class Renderer {
  constructor(canvas) {
    this._initialize();
    this.initializedMaterialUBO = false;
  }

  _initialize() {
    //this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});

    this.materialUBO = new UniformBufferObject(new Float32Array(Renderer.MATERIAL_DATA_CHUNK_SIZE));    
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
    // Calculate normal matrix
    // Per object    
    // Bind Uniform buffer object
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
    
    // Per material
    for (let i = 0; i < object.shaders.length; ++i) {
      const shader = object.shaders[i];
      const program = shader.program;
      const programInfo = shader.programInfo;
      const materialData = shader.materialData;
      const hasDiffuse = Boolean(materialData.mapDiffuse);

      // UPDATE THIS
      this.materialUBO.update([
        //...object._materials[i]
        ...[...materialData.ambient, 0.0], // vec3 16  0 REAL 12
        ...[...materialData.diffuse, 0.0], // vec3 16  16
        ...[...materialData.emissive, 0.0], // vec3 16  32
        ...[...materialData.specular, 0.0], // vec3 16  48
        materialData.specularExponent, // 4 alignment, 0 FUCKS UP
        hasDiffuse ? true : false  // bool 
      ]); // Real chunk size here

      shader.activate();

      const gl = glContext();
      gl.uniform1i(programInfo.uniformLocations.numLights, scene.lights.length);

      // Update lights

      if (hasDiffuse) {
        shader.bindTextures();
      }
      
      // These doesn't change?
      // Needs to happen per frame
      gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.material, this.materialUBO.location);
      gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.scene, this.sceneMatricesUBO.location);
      gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.model, this.modelMatricesUBO.location);
      gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.directional, this.directionalUBO.location);
      object.draw(i);
    }
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
        ...[l.positionViewSpace[0], l.positionViewSpace[1], l.positionViewSpace[2]], // vec4 16 // EQ : CHUNK SIZE SHOULD BE.... CS = TOTALSIZE / ( SIZEOF(FLOAT) ( == 4 ))
         ...l.color,  // vec4 16
         ...[l.intensity, 0.0, 0.0, 0.0] // vec4 16
       ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }

    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    scene.objects.forEach(object => {
      this._renderObject(object, scene, camera);
    });

    scene.lights.forEach(light => {
      if (light._debug) {
        // calculate MVP
        const out = mat4.create();
        mat4.multiply(out, camera.viewMatrix, light.modelMatrix);
        mat4.multiply(out, camera.projectionMatrix, out);
        light.draw(out);
      }
    })
  }

  setSize(width, height) {
    const w = width * window.devicePixelRatio;
    const h = height * window.devicePixelRatio;

    const gl = glContext();
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.canvas.style.width = `${w / window.devicePixelRatio}px`;
    gl.canvas.style.height = `${h / window.devicePixelRatio}px`;
  }

  render(scene, camera) {
    const gl = glContext();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (true) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0); // Clear all
    }

    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas
    
    this._internalRender(scene, camera);
  }
}

Renderer.LIGHT_DATA_CHUNK_SIZE = 12; // EACH element is 4 bytes in float32array yielding an offset of 12 * 4 = 48 !!!
Renderer.MATERIAL_DATA_CHUNK_SIZE = 24;
Renderer.MAX_LIGHTS = 16;
Renderer.MAX_MATERIALS = 25;

export const glContext = () => {
  return context;
}

export default Renderer;