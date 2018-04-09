import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

import StandardShader from '../materials/standardshader.js'
import VoxelConeTracer from '../gi/voxelconetracer.js'
import Mesh from '../core/mesh.js'

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
  }

  _initialize() {
    context = canvas.getContext('webgl2', {antialias: false});

    let gl = glContext();
    console.log("amx draw buffers", gl.getParameter(gl.MAX_DRAW_BUFFERS));

    this.voxelize = true; 
    this.materialUBO = new UniformBufferObject(new Float32Array(Renderer.MATERIAL_DATA_CHUNK_SIZE));    
    // True for all programs, keep in mesh ??
    // With this declaration - does not work to put in float in here
    this.modelMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal 
    ]);
    this.guiUBO = new UniformBufferObject(new Float32Array(500));
    this.sceneUBO = new UniformBufferObject(new Float32Array(400));
    this.pointLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
    this.directionalLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  
    this.standardShader = new StandardShader();
    this.voxelConeTracer = new VoxelConeTracer(/*sceneScale=*/3000, /*cubeSize*/2000, /*resolution*/256, this.materialUBO, this.pointLightUBO, this.modelMatricesUBO, this.sceneUBO);

    this.sceneUBO.bind();
    this.pointLightUBO.bind();
    this.directionalLightUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind();
    this.guiUBO.bind();
  }

  _renderObject(object, scene, camera, program) {
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
  
    const materialData = object.materialData;
    // Different between objects
    this.materialUBO.update([
      ...[...materialData.ambient, 0.0], // vec3 16  0 
      ...[...materialData.diffuse, 0.0], // vec3 16  16
      // ...[...materialData.emissive, 0.0], // vec3 16 32
      ...[...materialData.specular, 0.0], // vec3 16  48
      materialData.specularExponent, // 4, this.voxelTextureSize
      Boolean(materialData.mapDiffuse),  // 4, 72
      Boolean(materialData.mapBump), //4, 76
      Boolean(materialData.mapSpecular),
      Boolean(materialData.mapDissolve)
    ]); // Real chunk size here

    const gl = glContext();
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'materialBuffer'), this.materialUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'modelMatrices'), this.modelMatricesUBO.location);
    object.uploadTextures(program);
    object.draw();
  }

  _uploadLightning(scene, camera) {
    // TODO: Proper padding, it's broken
    for (let i = 0; i < scene.pointLights.length; i++) {
      const l = scene.pointLights[i];
      this.pointLightUBO.update([
        ...[l.position[0], l.position[1], l.position[2], 0.0], // should be view space in the rest
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
  }

  _debugLightning(scene, camera) {
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
    this.guiUBO.update([
      scene.gui.diffuseLod,
      scene.gui.bumpIntensity,
      scene.gui.displayBump,
      scene.gui.displaySpecular
    ]);

    // TODO: Why doens't integers work? Float32Array??
    this.sceneUBO.update([
      ...camera.viewMatrix, // Starts at multiple of base
      ...camera.projectionMatrix,
      scene.pointLights.length, // 4 bytes .. 
      scene.directionalLights.length
    ]);

    this._uploadLightning(scene, camera);

    if (this.voxelize) {
      this.voxelConeTracer.voxelize(scene, camera);
      this.voxelize = false;
    }

    if (scene.gui.showVoxels) {
      // Render debug scene
      this.voxelConeTracer.renderVoxelDebug(scene, camera);
    } else {
      this._renderScene(scene, camera);
    }
  }

  _renderScene(scene, camera) {
    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    // All objects rendered with the same shader
    this.standardShader.activate();
    const program = this.standardShader.program;
    const gl = glContext();
    // Set the uniform block binding for the active program
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'guiDataBuffer'), this.guiUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'directionalLightsBuffer'), this.directionalLightUBO.location);
    
    // Render scene normal
    scene.objects.forEach(object => {
      this._renderObject(object, scene, camera, program);
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
    gl.clearColor(127.0, 127.0, 213.0, 1.0);
    gl.clearDepth(1.0);  // TODO remove

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