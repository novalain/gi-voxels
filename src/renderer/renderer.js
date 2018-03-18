import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';
import OrthographicCamera from '../cameras/orthographiccamera.js'
import StandardShader from '../materials/standardshader.js'

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
  }

  _initialize() {
    //this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});

    let gl = glContext();
    console.log("amx draw buffers", gl.getParameter(gl.MAX_DRAW_BUFFERS));

    this.materialUBO = new UniformBufferObject(new Float32Array(Renderer.MATERIAL_DATA_CHUNK_SIZE));    
    // True for all programs, keep in mesh ??
    // With this declaration - does not work to put in float in here
    this.modelMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal 
    ]);
    this.guiUBO = new UniformBufferObject(new Float32Array(500));
    this.sceneUBO = new UniformBufferObject(new Float32Array(400));
   // this.pointLightUBO = new UniformBufferObject(new Float32Array(500));
    this.pointLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
    this.directionalLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  
    this.standardShader = new StandardShader();

    this.sceneUBO.bind();
    this.pointLightUBO.bind();
    this.directionalLightUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind();
    this.guiUBO.bind();
  }

  initializeVoxelization() {
    const gl = glContext();
    
    // Initialize 3d texture
    this.voxelTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 64, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.generateMipmap(gl.TEXTURE_3D);

    // Initialize projection matrices
    const orthoCamera = new OrthographicCamera(-1500, 1500, -1500, 1500, -1500, 4500);
    orthoCamera.position = vec3.fromValues(0, 0, 3000);
    const origin = vec4.fromValues(0.0, 0.0, 0.0);
    orthoCamera.lookAt(origin);
    this.projZ = mat4.create();
    mat4.multiply(this.projZ, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
    this.voxelizationMaterial = new VoxelizationMaterial();
  }

  voxelizeScene() {
    // glDisable(GL_CULL_FACE);
    // glDisable(GL_DEPTH_TEST);

    gl.viewport(0, 0, 512, 512);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);
   // this.voxelizationMaterial.activate();
    const program = this.voxelizationMaterial.program;

    this._uploadLightning();
    gl.uniformBlockBinding(program, programInfo.uniformBlockLocations.pointlights, this.pointLightUBO.location);


    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjZ'), false, this.projZ);
    //framebufferTextureLayer
    const fb = gl.createFrameBuffer();
    gl.bindFrameBuffer(gl.FRAMEBUFFER, fb);
    //gl.frameBufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_0, gl.TEXTURE_2D,  )

    // Render to mip 0, we generate mipmaps after we're done
    void gl.drawBuffers([
      gl.COLOR_ATTACHMENT_0,
      gl.COLOR_ATTACHMENT_1,
      gl.COLOR_ATTACHMENT_2,
      gl.COLOR_ATTACHMENT_4,
      gl.COLOR_ATTACHMENT_5,
      gl.COLOR_ATTACHMENT_6,
      gl.COLOR_ATTACHMENT_7,
      gl.COLOR_ATTACHMENT_8
    ]);

    // [0,7], [8, 15], [16, 23], [24, 31], [32, 39], [40, 47], [48, 55], [56, 63]
    for (let i = 0; i < (64 / 8); i += 8) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_0, voxelTexture, 0, i);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_1, voxelTexture, 0, i + 1);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_2, voxelTexture, 0, i + 2);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_3, voxelTexture, 0, i + 3);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_4, voxelTexture, 0, i + 4);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_5, voxelTexture, 0, i + 5);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_6, voxelTexture, 0, i + 6);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT_7, voxelTexture, 0, i + 7);
      gl.uniform1i(gl.getUniformLocation(program, 'renderTargetLayer'), i);
    }
    
    gl.uniform1i(gl.getUniformLocation(program, 'numLights'), scene.pointLights.length);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneMatrices'), this.sceneUBO.location);
    // Render scene
    scene.objects.forEach(object => {
      this._renderObject(program, object, scene, camera);
    });
    
    gl.bindFrameBuffer(gl.FRAMEBUFFER, 0);
  }

  _renderObjectWithProgram(program, object, scene, camera) {
    const gl = glContext();

    const materialData = object._material.materialData;

    // Update objects model matrices
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
    
    // Update material UBO
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

    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'materialBuffer'), this.materialUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'modelMatrices'), this.modelMatricesUBO.location);
    object.draw();
  }
  
  _renderObject(object, scene, camera) {
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
      materialData.specularExponent, // 4, 64
      Boolean(materialData.mapDiffuse),  // 4, 72
      Boolean(materialData.mapBump), //4, 76
      Boolean(materialData.mapSpecular),
      Boolean(materialData.mapDissolve)
    ]); // Real chunk size here

    const gl = glContext();
  
    gl.uniformBlockBinding(this.standardShader.program, gl.getUniformBlockIndex(this.standardShader.program, 'materialBuffer'), this.materialUBO.location);
    gl.uniformBlockBinding(this.standardShader.program, gl.getUniformBlockIndex(this.standardShader.program, 'modelMatrices'), this.modelMatricesUBO.location);
    object.uploadTextures(this.standardShader.program);
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
    //const gl = glContext();
    //gl.uniform1i(gl.getUniformLocation(this.standardShader.program, 'numLights'), scene.pointLights.length);
    //gl.uniform1i(gl.getUniformLocation(this.standardShader.program, 'numDirectionalLights'), scene.directionalLights.length);
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
      this._renderObject(object, scene, camera);
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