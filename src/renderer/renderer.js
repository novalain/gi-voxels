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

    this.quad = new Quad();
    this.renderToShadowMap = true;
    this.voxelize = true;
    this.materialUBO = new UniformBufferObject(new Float32Array(Renderer.MATERIAL_DATA_CHUNK_SIZE));
    // True for all programs, keep in mesh ??
    // With this declaration - does not work to put in float in here
    this.modelMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal
    ]);
    this.guiUBO = new UniformBufferObject(new Float32Array(600));
    this.sceneUBO = new UniformBufferObject(new Float32Array(500));
    this.pointLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
    this.directionalLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
    this.shadowMapResolution = 4096;
    this.sceneScale = 3000;

    this.standardShader = new StandardShader();
    this.shadowShader = new ShadowShader();
    this.screenSpaceImageShader = new ScreenSpaceImageShader();
    this.voxelConeTracer = new VoxelConeTracer(/*sceneScale=*/this.sceneScale, /*cubeSize*/2000, /*resolution*/256, this.materialUBO, this.pointLightUBO, this.modelMatricesUBO, this.sceneUBO);

    this.sceneUBO.bind();
    this.pointLightUBO.bind();
    this.directionalLightUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind();
    this.guiUBO.bind();
  }

  _initShadowMap(directionalLightPos) {
    const gl = glContext();

    // Set up depth fbo
    this.depthFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFBO);

    // Set up depth texture
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, this.shadowMapResolution, this.shadowMapResolution, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
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
      -this.sceneScale,
      this.sceneScale,
      -this.sceneScale,
      this.sceneScale,
      -this.sceneScale,
      this.sceneScale);

    // Get point light position... direction i mean
    this.shadowCam.position = vec3.fromValues(directionalLightPos[0], directionalLightPos[1], directionalLightPos[2]);
    this.shadowCam.lookAt(vec3.fromValues(0.0, 0.0, 0.0));
    this.shadowCam.MVP = mat4.create();
    mat4.multiply(this.shadowCam.MVP, this.shadowCam.projectionMatrix, this.shadowCam.viewMatrix);

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
  }

  _renderShadowMapToScreen() {
    const gl = glContext();
    this.screenSpaceImageShader.activate();
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.uniform1i(gl.getUniformLocation(this.screenSpaceImageShader.program, 'Texture'), 0);

    gl.viewport(0, 0, 300 * window.devicePixelRatio, 300 * window.devicePixelRatio);
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
      scene.gui.bumpIntensity,
      scene.gui.indirectLightningMultiplier,
      scene.gui.directLightningMultiplier,
      scene.gui.specularLightningMultiplier,
      scene.gui.occlusionMultiplier,
      scene.gui.voxelConeStepSize,
      scene.gui.voxelConeMaxDist,
      scene.gui.displayBump,
      scene.gui.displayOcclusion
    ]);

    if (this.renderToShadowMap) {
      this._initShadowMap(scene.directionalLights[0].direction);
      this._renderToShadowMap(scene, camera);
      this.renderToShadowMap = false;
    }

    const depthMVP = this.shadowCam.MVP;
    // TODO: Why doens't integers work? Float32Array??
    this.sceneUBO.update([
      ...camera.viewMatrix,
      ...camera.projectionMatrix,
      ...depthMVP,
      ...scene.directionalLights[0].direction
    ]);

    this._uploadLightning(scene, camera);

    if (scene.gui.displayShadowMapTextureQuad) {
      this._renderShadowMapToScreen();
    }

    // For debug
    if (this.voxelize) {
      this.voxelConeTracer.voxelize(scene, camera, this.depthTexture, this.sceneUBO, this.materialUBO, this.modelMatricesUBO);
      this.voxelize = false;
    }

    if (scene.gui.showVoxels) {
      // Render debug scene
      this.voxelConeTracer.renderVoxelDebug(scene, camera, this.sceneUBO);
    } else if (scene.gui.useVoxelGI) {
      this.voxelConeTracer.render(scene, camera, this.depthTexture, this.guiUBO, this.sceneUBO, this.materialUBO, this.modelMatricesUBO);
    } else {
      this._renderScene(scene, camera);
    }
  }

  _renderScene(scene, camera) {
    this.standardShader.activate();

    const gl = glContext();
    const program = this.standardShader.program;

    gl.uniform3fv(gl.getUniformLocation(program, 'camera_world'), camera.position);

    // Upload shadow map
    gl.activeTexture(gl.TEXTURE0 + 4);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'shadowMap'), 4);

    // Set the uniform block binding for the active program
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'guiDataBuffer'), this.guiUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);

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
    gl.viewport(0, 0, this.shadowMapResolution, this.shadowMapResolution);

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