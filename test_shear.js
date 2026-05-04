const THREE = require('three');
const w = 1.08;
const l = 0.92;
const geo = new THREE.PlaneGeometry(w, l);
geo.translate(0, l / 2, 0);

// We want local X to be World X, local Y to be along shadowDirXZ.
// Since the plane will just lie flat without extra yaw rotation, we can just position the vertices.
// Actually, if we don't rotate by -PI/2, local Z is World Z. 
// If we rotate by -PI/2 on X, local X is World X, local Y is World -Z.
// So if we just build the geometry already flat in world space:
const geo2 = new THREE.PlaneGeometry(w, l);
// Base vertices:
// tl, tr, bl, br
const pos = geo2.attributes.position;
console.log("Original positions:");
for(let i=0; i<pos.count; i++) {
   console.log(pos.getX(i), pos.getY(i), pos.getZ(i));
}
