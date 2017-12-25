import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js';

// TODO: Make class
const FlyControls = function (camera, domElement = undefined) {
  const gl = glContext();

  this.camera = camera;
  this.domElement = gl.canvas;

  // API
  this.movementSpeed = 1.5;
  this.rollSpeed = 0.12;

  this.dragToLook = true;
  this.autoForward = false;

  // internals
  this.mouseStatus = 0;
  this.moveState = { up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0 };
  this.moveVector = vec3.create();
  this.rotationVector = vec3.create();

  this.isDirty = false;

  this.keydown = function (event) {
    if (event.altKey) {
      return;
    }
    //event.preventDefault();
    switch (event.keyCode) {
      case 16: /* shift */ this.movementSpeedMultiplier = .1; break;

      case 87: /*W*/ this.moveState.forward = 1; break;
      case 83: /*S*/ this.moveState.back = 1; break;

      case 65: /*A*/ this.moveState.left = 1; break;
      case 68: /*D*/ this.moveState.right = 1; break;

      case 82: /*R*/ this.moveState.up = 1; break;
      case 70: /*F*/ this.moveState.down = 1; break;

      case 38: /*up*/ this.moveState.pitchUp = 1; break;
      case 40: /*down*/ this.moveState.pitchDown = 1; break;

      case 37: /*left*/ this.moveState.yawLeft = 1; break;
      case 39: /*right*/ this.moveState.yawRight = 1; break;

      case 81: /*Q*/ this.moveState.rollLeft = 1; break;
      case 69: /*E*/ this.moveState.rollRight = 1; break;
    }
    this.updateMovementVector();
    this.updateRotationVector();
  };

  this.keyup = function (event) {
    switch (event.keyCode) {
      case 16: /* shift */ this.movementSpeedMultiplier = 1; break;

      case 87: /*W*/ this.moveState.forward = 0; break;
      case 83: /*S*/ this.moveState.back = 0; break;

      case 65: /*A*/ this.moveState.left = 0; break;
      case 68: /*D*/ this.moveState.right = 0; break;

      case 82: /*R*/ this.moveState.up = 0; break;
      case 70: /*F*/ this.moveState.down = 0; break;

      case 38: /*up*/ this.moveState.pitchUp = 0; break;
      case 40: /*down*/ this.moveState.pitchDown = 0; break;

      case 37: /*left*/ this.moveState.yawLeft = 0; break;
      case 39: /*right*/ this.moveState.yawRight = 0; break;

      case 81: /*Q*/ this.moveState.rollLeft = 0; break;
      case 69: /*E*/ this.moveState.rollRight = 0; break;
    }

    this.updateMovementVector();
    this.updateRotationVector();
  };

  this.mousedown = function (event) {
    if (this.domElement !== document) {
      this.domElement.focus();
    }
    event.preventDefault();
    event.stopPropagation();
    if (this.dragToLook) {
      this.mouseStatus++;
    } else {
      switch (event.button) {
        case 0: this.moveState.forward = 1; break;
        case 2: this.moveState.back = 1; break;
      }
      this.updateMovementVector();
      //this.updateViewMatrix();
    }
  };

  this.mousemove = function (event) {
    if (!this.dragToLook || this.mouseStatus > 0) {
      //get the change from last position to this position
      //this.deltaX = this.last_position.x - event.clientX;
      //this.deltaY = this.last_position.y - event.clientY;
      var container = this.getContainerDimensions();
      var halfWidth = container.size[0] / 2;
      var halfHeight = container.size[1] / 2;

      this.moveState.yawLeft = -((event.pageX - container.offset[0]) - halfWidth) / halfWidth;
      this.moveState.pitchDown = ((event.pageY - container.offset[1]) - halfHeight) / halfHeight;

      this.updateRotationVector();
      //this.updateViewMatrix();
    }
  };

  this.mouseup = function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.dragToLook) {
      this.mouseStatus--;
      this.moveState.yawLeft = this.moveState.pitchDown = 0;
    } else {
      switch (event.button) {
        case 0: this.moveState.forward = 0; break;
        case 2: this.moveState.back = 0; break;
      }
      this.updateMovementVector();
      //this.updateViewMatrix();
    }
    this.updateRotationVector();
    //this.updateViewMatrix();
  };

  this.update = function (delta = 0.9) {
    const moveMult = delta * this.movementSpeed;
    const rotMult = 1.0 * delta * this.rollSpeed;

    const viewMatrix = this.camera.viewMatrix;
    
    const strafe = vec3.create();
    strafe[0] = viewMatrix[0];
    strafe[1] = viewMatrix[4];
    strafe[2] = viewMatrix[8];

    const forward = vec3.create();
    forward[0] = viewMatrix[2];
    forward[1] = viewMatrix[6];
    forward[2] = viewMatrix[10];

    const up  = vec3.create();
    up[0] = viewMatrix[1];
    up[1] = viewMatrix[5];
    up[2] = viewMatrix[11];

    const dz = -this.moveVector[2];
    const dy = this.moveVector[1];
    const dx = this.moveVector[0];

    // TODO: Remove element-wise
    this.camera.position[0] += (-dz * forward[0] + dy * up[0] + dx * strafe[0]) * moveMult;
    this.camera.position[1] += (-dz * forward[1] + dy * up[1] + dx * strafe[1]) * moveMult;
    this.camera.position[2] += (-dz * forward[2] + dy * up[2] + dx * strafe[2]) * moveMult;

    // ACCUMULATE ROTATIONS
    this.camera.rotation[0] += this.rotationVector[0] * rotMult;
    this.camera.rotation[1] += this.rotationVector[1] * rotMult;
    this.camera.rotation[2] += -this.rotationVector[2] * rotMult;

    // OK BUT TILTS
    //const tmpQuaternion = quat.fromValues(this.rotationVector[0] * rotMult, this.rotationVector[1] * rotMult, 0, 1);
    //quat.identity(this.camera.quaternion);
    //quat.multiply(this.camera.quaternion, tmpQuaternion, this.camera.quaternion);
    //const rotationMatrix = mat4.create();
    //mat4.fromQuat(rotationMatrix, this.camera.quaternion);

    quat.identity(this.camera.quaternion);
    quat.rotateX(this.camera.quaternion, this.camera.quaternion, this.camera.rotation[0]);
    quat.rotateY(this.camera.quaternion, this.camera.quaternion, this.camera.rotation[1]);
    quat.rotateZ(this.camera.quaternion, this.camera.quaternion, this.camera.rotation[2]);

    const axisAngle = quat.getAxisAngle(this.camera.quaternionAxisAngle, this.camera.quaternion);
    
    mat4.identity(this.camera.viewMatrix);
    const negatedVec = vec3.create();
    vec3.negate(negatedVec, this.camera.position);
  
    const translationMatrix = mat4.create();
    mat4.rotate(this.camera.viewMatrix, this.camera.viewMatrix, axisAngle, this.camera.quaternionAxisAngle);
    mat4.translate(this.camera.viewMatrix, this.camera.viewMatrix, negatedVec);
  };

  this.updateMovementVector = function () {
    const forward = (this.moveState.forward || (this.autoForward && !this.moveState.back)) ? 1 : 0;
    this.moveVector[0] = (- this.moveState.left + this.moveState.right);
    this.moveVector[1] = (- this.moveState.down + this.moveState.up);
    this.moveVector[2] = (- forward + this.moveState.back);
  };

  this.updateRotationVector = function () {
    this.rotationVector[0] = (this.moveState.pitchDown - this.moveState.pitchUp);
    this.rotationVector[1] = (this.moveState.yawRight - this.moveState.yawLeft);
    this.rotationVector[2] = (this.moveState.rollRight - this.moveState.rollLeft);
    this.isDirty = true;
  };

  this.getContainerDimensions = function () {
    if (this.domElement != document) {
      return {
        size: [this.domElement.offsetWidth, this.domElement.offsetHeight],
        offset: [this.domElement.offsetLeft, this.domElement.offsetTop]
      };
    } else {
      return {
        size: [window.innerWidth, window.innerHeight],
        offset: [0, 0]
      };
    }
  };

  function bind(scope, fn) {
    return function () {
      fn.apply(scope, arguments);
    };
  }

  function contextmenu(event) {
    event.preventDefault();

  }

  this.dispose = function () {
    this.domElement.removeEventListener('contextmenu', contextmenu, false);
    this.domElement.removeEventListener('mousedown', _mousedown, false);
    this.domElement.removeEventListener('mousemove', _mousemove, false);
    this.domElement.removeEventListener('mouseup', _mouseup, false);

    window.removeEventListener('keydown', _keydown, false);
    window.removeEventListener('keyup', _keyup, false);
  };

  var _mousemove = bind(this, this.mousemove);
  var _mousedown = bind(this, this.mousedown);
  var _mouseup = bind(this, this.mouseup);
  var _keydown = bind(this, this.keydown);
  var _keyup = bind(this, this.keyup);

  this.domElement.addEventListener('contextmenu', contextmenu, false);

  this.domElement.addEventListener('mousemove', _mousemove, false);
  this.domElement.addEventListener('mousedown', _mousedown, false);
  this.domElement.addEventListener('mouseup', _mouseup, false);

  window.addEventListener('keydown', _keydown, false);
  window.addEventListener('keyup', _keyup, false);

  this.updateMovementVector();
  this.updateRotationVector();
};

export default FlyControls;