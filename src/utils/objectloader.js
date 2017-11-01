import ObjMtlLoader from 'obj-mtl-loader';
import { flatten, generateVertexNormals } from './common.js';

class ObjectLoader {
  constructor() {
    this.loader = new ObjMtlLoader();
  }
  // TODO: Load list of obj's + mtl's
  load(obj, mtl) {
    return new Promise(resolve => {
      this.loader.load(obj, mtl, (err, res) => {
        if (err) {
          console.warn("Error loading obj or mtl");
          reject(err);
        }
        console.log(res);

        const indices = [];
        const vertices = [];
        const normals = [];
        const resVertices = res.vertices;
        const resNormals = res.normals;

        res.vertices.forEach(vertex => {
          const v0 = vertex[0];
          const v1 = vertex[1];
          const v2 = vertex[2];
          vertices.push(v0);
          vertices.push(v1);
          vertices.push(v2);
        })

        // TODO: Index buffer
        res.faces.forEach(face => {
          //const v0 = resVertices[face.indices[0] - 1];
          //const v1 = resVertices[face.indices[1] - 1];
          //const v2 = resVertices[face.indices[2] - 1];

          const i0 = face.indices[0] - 1;
          const i1 = face.indices[1] - 1;
          const i2 = face.indices[2] - 1;

          indices.push(i0);
          indices.push(i1);
          indices.push(i2);

          // vertices.push(v0[0]);
          // vertices.push(v0[1]);
          // vertices.push(v0[2]);

          // vertices.push(v1[0]);
          // vertices.push(v1[1]);
          // vertices.push(v1[2]);

          // vertices.push(v2[0]);
          // vertices.push(v2[1]);
          // vertices.push(v2[2]);

          // const n0 = resNormals[face.normal[0] - 1];
          // const n1 = resNormals[face.normal[1] - 1];
          // const n2 = resNormals[face.normal[2] - 1];

          // normals.push(n0[0]);
          // normals.push(n0[1]);
          // normals.push(n0[2]);

          // normals.push(n1[2]);
          // normals.push(n1[2]);
          // normals.push(n1[2]);

          // normals.push(n2[2]);
          // normals.push(n2[2]);
          // normals.push(n2[2]);
        });


        const resobject = {};
        resobject.positions = vertices;
        resobject.normals = generateVertexNormals(vertices, indices);
        resobject.indices = indices;
        resolve(resobject);
      });
    });
  }
}

export default ObjectLoader;