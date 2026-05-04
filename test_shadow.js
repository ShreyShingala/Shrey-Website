const THREE = require('three');
const eye = new THREE.Vector3(22.4, 0, -31);
const gandalf = new THREE.Vector3(-3.9, 0, -2.5);
const dir = new THREE.Vector2(gandalf.x - eye.x, gandalf.z - eye.z).normalize();
const shadowYaw = Math.atan2(-dir.x, dir.y);

const euler = new THREE.Euler(-Math.PI/2, 0, shadowYaw, 'XYZ');
// The "top" of the shadow (local +Y) after translation:
const top = new THREE.Vector3(0, 1, 0);
top.applyEuler(euler);
console.log("Dir XZ:", dir);
console.log("Shadow Top extends towards:", top);
