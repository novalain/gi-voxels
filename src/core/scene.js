class Scene {
  constructor() {
    this.objects = [];
    this.lights = [];
  }

  add(object) {
    // TODO: Sort by material
    this.objects.push(object);
  }

  // TODO: One generic add
  addLight(light) {
    this.lights.push(light);
  }

  traverse(camera) {
    for (let i = 0; i < this.objects.length; ++i) {
      // TODO: Very inefficient with many objects
      // Make sure to update objects accordingly and send a single draw call to OpenGL if possible
      this.objects[i].update();

      // For each light source upload position and other info here..
      const material = this.objects[i].material;

      // TODO sort objects by material, uniform buffer objects
      material.activate();

      // TODO: Hipster loop
      // for (let j = 0; j < this.lights.length; ++j) {
      //   material.setUniform("vec4", "dLightPositions[" + j + "]", this.lights[j].position);
      //   material.setUniform("float". "dLightIntensities[" + j + "]", this.lights[j].intensity)
      // }


      material.setUniform("dLightPosition", this.lights[0].position);
      material.setUniform("dLightIntensity", this.lights[0].intensity);

      this.objects[i].render(camera);
    }
  }
}

export default Scene;