import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

import ScreenSpaceImageShader from '../materials/screenspaceimageshader.js'
import StandardShader from '../materials/standardshader.js'
import ShadowShader from '../materials/shadowshader.js'
import VoxelConeTracer from '../gi/voxelconetracer.js'
import Mesh from '../core/mesh.js'
import FrameBufferObject from '../utils/framebufferobject.js'
import OrthographicCamera from '../cameras/orthographiccamera.js'
import Quad from '../geometry/quad.js'

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
  }

  _initialize() {
    context = canvas.getContext('webgl2', {antialias: true});

    let gl = glContext();
    console.log("amx draw buffers", gl.getParameter(gl.MAX_DRAW_BUFFERS));

    // Exists in 2 places now
    this.quad = new Quad();
    this.renderShadowMap = true;
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
    this.shadowShader = new ShadowShader();
    this.screenSpaceImageShader = new ScreenSpaceImageShader();
    this.voxelConeTracer = new VoxelConeTracer(/*sceneScale=*/3000, /*cubeSize*/2000, /*resolution*/256, this.materialUBO, this.pointLightUBO, this.modelMatricesUBO, this.sceneUBO);

    this.sceneUBO.bind();
    this.pointLightUBO.bind();
    this.directionalLightUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind();
    this.guiUBO.bind();

    this._initShadowMap();
  }

  _initShadowMap() {
    const gl = glContext();
    
    // Set up depth fbo
    this.depthFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFBO);

    // Set up depth texture
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);

    //gl.getExtension('WEBGL_depth_texture');
    //gl.getExtension("EXT_color_buffer_float");
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, 2048, 2048, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    gl.drawBuffers([gl.NONE]);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      console.error("FBO is not complete" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
    }
    
    // Set up ortho camera
    this.shadowCam = new OrthographicCamera(
      -1200.0,
      1200.0,
      -1200.0,
      1200.0,
      -2000.0,
      2000.0); 

      // Get point light position... direction i mean
    this.shadowCam.position = vec3.fromValues(-0.3, 0.9, -0.25);
    this.shadowCam.lookAt(0.0, 0.0, 0.0);

    // Set back normal FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

  _renderShadowMapToScreen() {
    const gl = glContext();
    this.screenSpaceImageShader.activate();
    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.uniform1i(gl.getUniformLocation(this.screenSpaceImageShader.program, 'Texture'), 1);

    gl.viewport(0, 0, 600, 600);
    this.quad.draw();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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

    if (this.renderShadowMap) {
      this._renderToShadowMap(scene, camera);
      this.renderShadowMap = false;
    }

    //this._renderShadowMapToScreen();

    // For debug
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

  _renderToShadowMap(scene, camera) {
    const gl = glContext();
    this.shadowShader.activate();

    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);
    //gl.enable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFBO);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   // gl.viewport(0, 0, 2048, 2048);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.shadowShader.program, 'depthView'), false, this.shadowCam.viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.shadowShader.program, 'depthProj'), false, this.shadowCam.projectionMatrix);

    scene.objects.forEach(object => {
      this.modelMatricesUBO.update([
        ...object.modelMatrix,
        ...object.normalMatrix
      ]);
      gl.uniformBlockBinding(this.shadowShader.program, gl.getUniformBlockIndex(this.shadowShader.program, 'modelMatrices'), this.modelMatricesUBO.location);
      object.draw();
    });

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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