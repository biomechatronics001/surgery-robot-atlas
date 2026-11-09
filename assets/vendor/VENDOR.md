# Vendored JavaScript (no CDN at runtime)

Unmodified files from the npm registry tarballs, fetched 2026-11-07 with `npm pack`.

| Package | Version | Licence | Files here |
|---|---|---|---|
| three (three.js authors) | 0.170.0 | MIT (`three/LICENSE`) | `build/three.module.min.js`; `examples/jsm/controls/OrbitControls.js`, `loaders/{GLTFLoader,STLLoader,ColladaLoader,TGALoader}.js`, `utils/BufferGeometryUtils.js` |
| urdf-loader (Garrett Johnson, gkjohnson/urdf-loaders) | 0.12.6 | Apache-2.0 (`urdf-loader/LICENSE`, from the GitHub repository: the npm tarball carries none) | `src/URDFLoader.js`, `src/URDFClasses.js` |

The pages load them as ES modules through an import map (`three` -> `three/build/three.module.min.js`,
`three/examples/jsm/` -> `three/examples/jsm/`, `urdf-loader` -> `urdf-loader/src/URDFLoader.js`), so the 3D viewer
needs the site to be served over http(s) (`python3 -m http.server`, GitHub Pages); from file:// the page shows the still.

SHA-256 of every file:

```
08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7  ./three/build/three.module.min.js
80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e  ./three/examples/jsm/controls/OrbitControls.js
f306e36d44e80cad00db4e978f9e19dd720c849bd979569dfa95dc1e4348bf1a  ./three/examples/jsm/loaders/ColladaLoader.js
45139faddd5aaf48ed2d62203d976e5cbd703db1a592de40527f9f6cf58abd44  ./three/examples/jsm/loaders/GLTFLoader.js
a0a83c88b269c94e25b690fae770d350c4728c81853195186976be7af0f8a3b3  ./three/examples/jsm/loaders/STLLoader.js
ce938459ed99d5234f9665270cca8552464d0d1703a094e49760631e6b14c7a3  ./three/examples/jsm/loaders/TGALoader.js
c25b7930e570e9ec56173cd3b866ec8d2e10016630db3937efb439daf1cedbf6  ./three/examples/jsm/utils/BufferGeometryUtils.js
d5112785611d360b501e824a4811252a57a0a44b761138daa6a35041b06bd569  ./urdf-loader/src/URDFClasses.js
08d63008ab689ba1f0dbc7a1936b4cc7e7a45e15036f6927028226f2bf95c0e6  ./urdf-loader/src/URDFLoader.js
```
