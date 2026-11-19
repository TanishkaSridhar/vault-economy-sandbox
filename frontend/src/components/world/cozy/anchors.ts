import type * as THREE from 'three'

/** A world-space point a DOM label follows; `h` is the height above it. */
export interface Anchor { pos: THREE.Vector3; h: number }
export type AnchorMap = Map<string, Anchor>
