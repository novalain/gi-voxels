import { vec3 } from 'gl-matrix';

// Cred https://github.com/andrevenancio/engine

export function flatten(arr) {
  let output = [];
  for (let i = 0; i < arr.length; ++i) {
    if (Array.isArray(arr[i]) || arr[i] instanceof Float32Array) {
      output = output.concat(flatten(arr[i]));
    } else {
      output.push(arr[i]);
    }
  }
  return output;
}

export function unflatten(arr, amount) {
  const output = [];
  for (let i = 0; i < arr.length; i += amount) {
    const value = [];
    for (let j = 0; j < amount; j++) {
      value.push(arr[i + j]);
    }
    output.push(value);
  }
  return output;
}

export function generateVertexUVs(vertices) {
  const res = [];
  for (let i = 0; i < vertices.length; ++i) {
    res[i] = 0.5;
  }
  return res;
}

export function generateVertexNormals(positions, indices) {
  const faces = unflatten(indices, 3);
  const vertices = unflatten(positions, 3);

  const temp = [];

  const cb = vec3.create();
  const ab = vec3.create();
  const cross = vec3.create();

  let vA;
  let vB;
  let vC;

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    const a = face[0];
    const b = face[1];
    const c = face[2];

    vA = vertices[a];
    vB = vertices[b];
    vC = vertices[c];

    vec3.subtract(cb, vC, vB);
    vec3.subtract(ab, vA, vB);
    vec3.cross(cross, cb, ab);

    if (temp[a] === undefined) {
      temp[a] = vec3.create();
    }

    if (temp[b] === undefined) {
      temp[b] = vec3.create();
    }

    if (temp[c] === undefined) {
      temp[c] = vec3.create();
    }

    vec3.add(temp[a], temp[a], cross);
    vec3.add(temp[b], temp[b], cross);
    vec3.add(temp[c], temp[c], cross);
  }

  for (let i = 0; i < temp.length; i++) {
    vec3.normalize(temp[i], temp[i]);
  }

  return flatten(temp, 3);
}

export function mergeVertices(data) {
  const positions = unflatten(data.positions, 3);
  const verticesMap = {};
  const unique = [];
  const changes = [];

  const precisionPoints = 4; // Number of decimal points, e.g. 4 for epsilon of 0.0001
  const precision = Math.pow(10, precisionPoints); // eslint-disable-line

  // Remove duplicated positions
  for (let i = 0; i < positions.length; i++) {
    const v = positions[i];
    const key = `
        ${Math.round(v[0] * precision)}_
        ${Math.round(v[1] * precision)}_
        ${Math.round(v[2] * precision)}
    `;

    if (verticesMap[key] === undefined) {
      verticesMap[key] = i;
      unique.push(positions[i]);
      changes[i] = unique.length - 1;
    } else {
      changes[i] = changes[verticesMap[key]];
    }
  }

  // Remove duplicated faces
  const faceIndicesToRemove = [];
  const faces = unflatten(data.indices, 3);

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];

    face[0] = changes[face[0]];
    face[1] = changes[face[1]];
    face[2] = changes[face[2]];

    const indices = [face[0], face[1], face[2]];

    for (let n = 0; n < 3; n++) {
      if (indices[n] === indices[(n + 1) % 3]) {
        faceIndicesToRemove.push(i);
        break;
      }
    }
  }

  // Remove duplicated UV's
  for (let i = faceIndicesToRemove.length - 1; i >= 0; i--) {
    const idx = faceIndicesToRemove[i];
    faces.splice(idx, 1);

    for (let j = 0; j < this.faceVertexUvs.length; j++) {
      this.faceVertexUvs[j].splice(idx, 1);
    }
  }

  const p = flatten(unique, 3);
  const f = flatten(faces, 3);

  return {
    positions: new Float32Array(p),
    indices: new Uint16Array(f),
    normals: new Float32Array(generateVertexNormals(p, f)),
  };
}