import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
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
    this.guiUBO = new UniformBufferObject(new Float32Array(500));
    this.sceneMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // view
        ...mat4.create(), // projection
    ]);
    this.pointLightUBO = new UniformBufferObject(new Float32Array(    Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
    this.directionalLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  }

  // Render with current material
  _renderObjectWithPrimaryMaterial(object, scene, camera) {
    // Calculate normal matrix
    // Per object    
    // Bind Uniform buffer object
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
    
    // Per material
    //for (let i = 0; i < object.shaders.length; ++i) {
    const material = object._material;
    const program = material.program;
    const programInfo = material.programInfo;
    const materialData = material.materialData;

    // Have to pad stuff
    this.materialUBO.update([
      ...[...materialData.ambient, 0.0], // vec3 16  0 
      ...[...materialData.diffuse, 0.0], // vec3 16  16
      // ...[...materialData.emissive, 0.0], // vec3 16 32
      ...[...materialData.specular, 0.0], // vec3 16  48
      materialData.specularExponent, // 4, 64
      Boolean(materialData.mapDiffuse),  // 4, 72
      Boolean(materialData.mapBump), //4, 76
      Boolean(materialData.mapSpecular),
      Boolean(materialData.mapDissolve)
    ]); // Real chunk size here

    material.activate();
    const gl = glContext();
    gl.uniform1i(programInfo.uniformLocations.numLights, scene.pointLights.length);
    gl.uniform1i(programInfo.uniformLocations.numDirectionalLights, scene.directionalLights.length);
    material.bindTextures();
    
    // Set the uniform block binding for the active program
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.gui, this.guiUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.material, this.materialUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.scene, this.sceneMatricesUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.model, this.modelMatricesUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.pointlights, this.pointLightUBO.location);
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.directionallights, this.directionalLightUBO.location);
    object.draw();
  }

  _uploadLightning(scene, camera) {
    // TODO: Proper padding, it's broken
    for (let i = 0; i < scene.pointLights.length; i++) {
      const l = scene.pointLights[i];
      this.pointLightUBO.update([
        ...[l.positionViewSpace[0], l.positionViewSpace[1], l.positionViewSpace[2], 0.0],
         ...l.color,  // vec4 16
         l.intensity // vec4 16
       ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }

    for (let i = 0; i < scene.directionalLights.length; ++i) {
      const l = scene.directionalLights[i];
      this.directionalLightUBO.update([
        ...[l.directionViewSpace[0], l.directionViewSpace[1], l.directionViewSpace[2], 0.0], 
        ...l.color,  // vec4 16
        l.intensity // vec4 16
      ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }
    scene.pointLights.forEach(light => {
      if (light._debug) {
        // calculate MVP
        const out = mat4.create(); 
        mat4.multiply(out, camera.viewMatrix, light.modelMatrix);
        mat4.multiply(out, camera.projectionMatrix, out);
        light.draw(out);
      }
    })

    scene.directionalLights.forEach(light => {
      if (light._debug) {
        // calculate MVP
        const out = mat4.create();
        mat4.multiply(out, camera.viewMatrix, light.modelMatrix);
        mat4.multiply(out, camera.projectionMatrix, out);
        light.draw(out);
      }
    })
  }

  _internalRender(scene, camera) {
    // Bind UBO's, this needs to happen each frame
    this.sceneMatricesUBO.bind();
    this.pointLightUBO.bind();
    this.directionalLightUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind(); 
    this.guiUBO.bind();

    const displayBump = scene.gui.displayBump;
    const textureLod = scene.gui.diffuseLod;
    const bumpIntensity = scene.gui.bumpIntensity;

    this.guiUBO.update([
      scene.gui.diffuseLod,
      scene.gui.bumpIntensity,
      scene.gui.displayBump,
      scene.gui.displaySpecular
    ]);
    
    // Update per scene ubos
    this.sceneMatricesUBO.update([
      ...camera.viewMatrix,
      ...camera.projectionMatrix
    ]);

    // Update per scene light's UBO

    this._uploadLightning(scene, camera);
    

    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    scene.objects.forEach(object => {
      this._renderObjectWithPrimaryMaterial(object, scene, camera);
    });

   
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
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0); 

    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas
    
    this._internalRender(scene, camera);
  }
}

Renderer.LIGHT_DATA_CHUNK_SIZE = 12; // EACH element is 4 bytes in float32array yielding an offset of 12 * 4 = 48 !!!
Renderer.MATERIAL_DATA_CHUNK_SIZE = 50;
Renderer.MAX_LIGHTS = 16;
Renderer.MAX_MATERIALS = 25;

export const glContext = () => {
  return context;
}

export default Renderer;