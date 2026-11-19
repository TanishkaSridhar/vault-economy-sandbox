import * as THREE from 'three'
import { geo } from './toon'

/** Shared unit geometries for props. */
export const G = {
  box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: () => geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12)),
  cyl6: () => geo('cyl6', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
  sphere: () => geo('sphere', () => new THREE.SphereGeometry(0.5, 14, 10)),
  blob: () => geo('blob', () => new THREE.IcosahedronGeometry(0.5, 1)),
  cone: () => geo('cone', () => new THREE.ConeGeometry(0.5, 1, 9)),
}
