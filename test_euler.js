const THREE = require('three');
const e1 = new THREE.Euler(-Math.PI/2, Math.PI/4, 0, 'XYZ');
const v1 = new THREE.Vector3(0, 0, 1); // normal
v1.applyEuler(e1);
console.log("Normal after (-PI/2, PI/4, 0) XYZ:", v1);

const v2 = new THREE.Vector3(0, 1, 0); // texture up
v2.applyEuler(e1);
console.log("Up after (-PI/2, PI/4, 0) XYZ:", v2);

const e2 = new THREE.Euler(-Math.PI/2, 0, Math.PI/4, 'XYZ');
const v3 = new THREE.Vector3(0, 0, 1); // normal
v3.applyEuler(e2);
console.log("Normal after (-PI/2, 0, PI/4) XYZ:", v3);

const v4 = new THREE.Vector3(0, 1, 0); // texture up
v4.applyEuler(e2);
console.log("Up after (-PI/2, 0, PI/4) XYZ:", v4);
