class Scene {
  constructor() {
    //this.lights = [];
    this.objects = [];
  }

  addModel(object) {
    // 1. Tell renderer to allocate buffers
    // 2. Allocate buffers here.
    this.objects.push(object);
  }


  bugg() {
    console.log('heh');

  }
  // remove(object) {
  //   const id = this.objects.indexOf(object);
  //   if (id !== -1) {
  //     this.objects.splice(id, 1);
  //   }
  // }

  traverse() {
    // if (!object) {
    //   return;
    // }
    // for (let i = 0; i < object.children.length; ++i) {
    //   this.traverse(object.children[i]);
    // }
    for (let i = 0; i < this.objects.length; ++i) {
      this.objects[i].update();
      this.objects[i].render();
    }
  }
}

export default Scene;