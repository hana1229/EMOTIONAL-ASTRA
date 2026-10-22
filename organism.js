import * as THREE from 'three';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, t) => a + (b - a) * t;

export class EmotionOrganism {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.9));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xffffff, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 0, 5.75);

    this.scene.add(new THREE.HemisphereLight('#f8efff', '#95a7c8', 2.1));
    let l = new THREE.DirectionalLight('#ffffff', 2.4);
    l.position.set(-3, 4, 5);
    this.scene.add(l);
    l = new THREE.DirectionalLight('#aa8af4', 1.25);
    l.position.set(4, -3, -2);
    this.scene.add(l);
    l = new THREE.PointLight('#ffe9ff', 10, 11, 2.2);
    l.position.set(0, 0.9, 3.6);
    this.scene.add(l);

    this.geometry = new THREE.SphereGeometry(1, 96, 64);
    this.base = new Float32Array(this.geometry.attributes.position.array);
    this.motion = new Float32Array(this.base.length / 3);
    this.velocity = new Float32Array(this.motion.length);

    this.material = new THREE.MeshPhysicalMaterial({
      color: '#b7a4e9',
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transmission: 0.32,
      thickness: 1.6,
      ior: 1.28,
      iridescence: 0.2,
      iridescenceIOR: 1.18,
      iridescenceThicknessRange: [100, 400],
      attenuationDistance: 1.6,
      attenuationColor: new THREE.Color('#d8cbff'),
      sheen: 0.28,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 2),
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 0.03,
        transparent: true,
        opacity: 0.16,
        roughness: 0.08,
        transmission: 0.8,
        thickness: 0.8,
        iridescence: 0.35,
        side: THREE.DoubleSide
      })
    );
    this.mesh.add(this.innerCore);

    this.sparkGroup = new THREE.Group();
    this.mesh.add(this.sparkGroup);
    for (let i = 0; i < 10; i++) {
      const g = new THREE.OctahedronGeometry(0.028 + i * 0.003, 0);
      const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 });
      const star = new THREE.Mesh(g, m);
      star.position.set((Math.random() - 0.5) * 0.85, (Math.random() - 0.5) * 0.85, (Math.random() - 0.5) * 0.85);
      star.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      star.userData.speed = 0.45 + Math.random() * 0.8;
      this.sparkGroup.add(star);
    }

    this.edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.84, 2), 28),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25 })
    );
    this.edgeLines.visible = false;
    this.mesh.add(this.edgeLines);

    this.satelliteGroup = new THREE.Group();
    this.scene.add(this.satelliteGroup);
    for (let i = 0; i < 3; i++) {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + i * 0.1, 0.006, 5, 128),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? '#d5c1ef' : '#ffffff',
          transparent: true,
          opacity: 0.18,
          depthWrite: false
        })
      );
      orbit.rotation.set(0.5 + i * 0.5, 0.2 + i * 0.8, i * 1.1);
      this.satelliteGroup.add(orbit);
    }

    this.settings = { color: '#b7a4e9', material: 'jelly', size: 100, opacity: 72, density: 50, softness: 70 };
    this.intensity = 55;
    this.energy = 50;
    this.valence = 0;
    this.timer = 0;
    this.clickDir = new THREE.Vector3(0, 0, 1);
    this.pressEnergy = 0;
    this.dragging = false;
    this.rotY = 0.2;
    this.rotX = 0.1;
    this.startXY = null;
    this.frame = 0;
    this.quality = 'high';

    this._down = e => {
      this.startXY = [e.clientX, e.clientY];
      this.dragging = false;
      canvas.setPointerCapture?.(e.pointerId);
    };
    this._move = e => {
      if (!this.startXY) return;
      const dx = e.clientX - this.startXY[0];
      const dy = e.clientY - this.startXY[1];
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragging = true;
      this.rotY += dx * 0.006;
      this.rotX = clamp(this.rotX + dy * 0.006, -1.2, 1.2);
      this.startXY = [e.clientX, e.clientY];
    };
    this._up = e => {
      if (!this.dragging) {
        const r = canvas.getBoundingClientRect();
        const coord = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(coord, this.camera);
        const hit = ray.intersectObject(this.mesh);
        this.clickDir = hit.length ? hit[0].point.clone().normalize() : new THREE.Vector3(coord.x, coord.y, 0.8).normalize();
        this.pressEnergy = 1.12;
      }
      this.startXY = null;
      this.dragging = false;
    };

    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    canvas.addEventListener('pointerup', this._up);
    canvas.addEventListener('pointercancel', this._up);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.prev = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  setEmotion(data, settings) {
    this.intensity = Number(data?.intensity ?? 55);
    this.energy = Number(data?.energy ?? 50);
    this.valence = Number(data?.valence ?? 0);
    this.settings = { ...this.settings, ...settings };
    this.updateMaterial();
  }

  setQuality(q) {
    this.quality = q;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.9 : q === 'standard' ? 1.4 : 1));
    this.resize();
  }

  updateMaterial() {
    const s = this.settings;
    const type = s.material || 'jelly';
    const color = new THREE.Color(s.color || '#b7a4e9');
    this.material.color.copy(color);

    const defs = {
      jelly: { roughness: 0.08, metalness: 0.01, clearcoat: 1, clearcoatRoughness: 0.02, transmission: 0.28, thickness: 2.4, ior: 1.2, iridescence: 0.12, sheen: 0.44, attenuationDistance: 1.35 },
      glass: { roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, transmission: 0.96, thickness: 3.6, ior: 1.35, iridescence: 0.58, sheen: 0.12, attenuationDistance: 0.96 },
      matte: { roughness: 0.88, metalness: 0.02, clearcoat: 0.04, clearcoatRoughness: 0.68, transmission: 0.0, thickness: 0.35, ior: 1.1, iridescence: 0.0, sheen: 0.02, attenuationDistance: 6 },
      crystal: { roughness: 0.005, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.0, transmission: 0.84, thickness: 3.1, ior: 1.52, iridescence: 0.38, sheen: 0.05, attenuationDistance: 0.72 },
      messy: { roughness: 0.22, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.6, transmission: 0.08, thickness: 1.1, ior: 1.12, iridescence: 0.05, sheen: 0.22, attenuationDistance: 2.4 }
    }[type];

    Object.assign(this.material, defs);
    const clarity = Number(s.opacity ?? 72) / 100;
    this.material.opacity = type === 'glass' || type === 'crystal' ? 0.98 : type === 'messy' ? 0.86 : 0.96;
    this.material.transparent = true;
    this.material.transmission = (defs.transmission || 0) * clarity;
    this.material.thickness = (defs.thickness || 1) * (0.65 + clarity * 0.7);
    this.material.attenuationDistance = defs.attenuationDistance * (type === 'glass' || type === 'crystal' ? Math.max(0.45, 1.15 - clarity * 0.55) : 1.1);
    this.material.depthWrite = type === 'matte';
    this.material.attenuationColor = color.clone().lerp(new THREE.Color('#ffffff'), type === 'matte' ? 0.12 : type === 'messy' ? 0.28 : 0.5);
    this.material.needsUpdate = true;

    const scale = Number(s.size ?? 100) / 100;
    this.mesh.scale.setScalar(scale);
    this.innerCore.visible = type !== 'matte' && type !== 'messy';
    this.innerCore.material.opacity = type === 'glass' ? 0.17 : type === 'crystal' ? 0.22 : 0.1;
    this.innerCore.material.color.copy(color.clone().lerp(new THREE.Color('#ffffff'), 0.72));
    this.innerCore.material.emissive.copy(color.clone().lerp(new THREE.Color('#ffffff'), 0.8));
    this.innerCore.material.emissiveIntensity = type === 'glass' ? 0.045 : type === 'crystal' ? 0.08 : 0.03;
    this.edgeLines.visible = type === 'crystal' || type === 'messy';
    this.edgeLines.material.opacity = type === 'crystal' ? 0.4 : type === 'messy' ? 0.18 : 0;
    this.sparkGroup.visible = type !== 'matte' && type !== 'messy';
    this.sparkGroup.children.forEach((star, i) => {
      star.material.opacity = type === 'glass' ? 0.52 : type === 'crystal' ? 0.96 : 0.26;
      star.material.color.copy(type === 'crystal' ? color.clone().lerp(new THREE.Color('#ffffff'), 0.83) : new THREE.Color('#ffffff'));
      star.scale.setScalar(type === 'crystal' ? 1.12 + i * 0.01 : type === 'glass' ? 0.88 : 0.64);
    });
  }

  loop(t) {
    requestAnimationFrame(this.loop);
    if (document.hidden || !this.canvas.isConnected || this.canvas.closest('[hidden]')) {
      this.prev = t;
      return;
    }

    const dt = Math.min((t - this.prev) / 1000, 0.05);
    this.prev = t;
    this.timer += dt;
    this.frame++;

    const s = this.settings;
    const type = s.material || 'jelly';
    const materialSoftness = { jelly: 1.0, matte: 0.88, glass: 0.34, crystal: 0.18, messy: 0.52 }[type] ?? 1;
    const soft = Math.min(1, (Number(s.softness ?? 70) / 100) * materialSoftness + (type === 'matte' ? 0.12 : 0));
    const density = Number(s.density ?? 50) / 100;
    const neg = clamp(-this.valence / 100, 0, 1);
    const pos = clamp(this.valence / 100, 0, 1);
    const amplitude = 0.02 + (this.intensity / 100) * 0.09 + Math.abs(this.valence) / 100 * 0.03 + (type === 'messy' ? 0.025 : 0);
    const arr = this.geometry.attributes.position.array;
    const base = this.base;
    const f = this.quality === 'low' ? 10 : 1;

    if (this.frame % f === 0) {
      for (let i = 0; i < base.length; i += 3) {
        const idx = i / 3;
        const x = base[i], y = base[i + 1], z = base[i + 2];
        const len = Math.hypot(x, y, z) || 1;
        const nx = x / len, ny = y / len, nz = z / len;

        const cubeX = Math.sign(nx) * Math.pow(Math.abs(nx), 0.55);
        const cubeY = Math.sign(ny) * Math.pow(Math.abs(ny), 0.55);
        const cubeZ = Math.sign(nz) * Math.pow(Math.abs(nz), 0.55);
        const shapeBlend = Math.pow(neg, 1.18);
        const shapeX = smooth(nx, cubeX, shapeBlend);
        const shapeY = smooth(ny, cubeY, shapeBlend);
        const shapeZ = smooth(nz, cubeZ, shapeBlend);

        const softOrganic =
          Math.sin(x * 3.2 + y * 1.5 + this.timer * 0.55) * Math.cos(y * 2.8 - z * 2.1 - this.timer * 0.38) +
          0.46 * Math.sin(z * 5.2 + x * 3.1 + 0.4 + this.timer * 0.31) +
          0.2 * Math.cos(y * 9.4 + x * 8.1 + this.timer * 0.23);

        const grain = Math.sin(x * 13 + y * 11 + z * 9 + this.timer * 0.45) * 0.012 * density;
        const faceting = neg * (Math.round(softOrganic * 5.6) / 5.6 - softOrganic) * 0.24;
        const puffy = pos * (Math.sin(this.timer * 0.8 + x * 2.1 + y * 1.7) * 0.08 + 0.06);
        const messyFlow = type === 'messy' ? (Math.sin(x * 8.8 + this.timer * 0.7) + Math.cos(y * 9.6 - this.timer * 0.9) + Math.sin(z * 7.4 + x * 2.5)) * 0.09 : 0;
        const target = (softOrganic * (0.68 + pos * 0.16 - neg * 0.18) + grain + faceting + puffy + messyFlow) * amplitude;

        const proximity = Math.pow(Math.max(0, shapeX * this.clickDir.x + shapeY * this.clickDir.y + shapeZ * this.clickDir.z), 9);
        const impulse = this.pressEnergy * proximity * 0.055 * (0.24 + soft * 0.9);
        const spring = (target + impulse - this.motion[idx]) * (0.045 + (1 - soft) * 0.1 + neg * 0.035);
        this.velocity[idx] = (this.velocity[idx] + spring) * (0.8 + soft * 0.14 - neg * 0.05);
        this.motion[idx] += this.velocity[idx];

        const radialBoost = 1 + this.motion[idx] + neg * (Math.max(Math.abs(shapeX), Math.abs(shapeY), Math.abs(shapeZ)) - 0.64) * 0.16 + (type === 'messy' ? Math.sin(this.timer * 0.55 + idx * 0.08) * 0.02 : 0);
        arr[i] = shapeX * radialBoost;
        arr[i + 1] = shapeY * radialBoost;
        arr[i + 2] = shapeZ * radialBoost;
      }
      this.geometry.attributes.position.needsUpdate = true;
      if (this.frame % 4 === 0) this.geometry.computeVertexNormals();
    }

    this.pressEnergy *= Math.pow(0.92, dt * 60);
    this.rotY += this.dragging ? 0 : dt * 0.11;
    this.mesh.rotation.set(this.rotX, this.rotY, neg * 0.18 + Math.sin(this.timer * 0.4) * 0.03);
    this.satelliteGroup.rotation.y = this.rotY * 0.25;
    this.satelliteGroup.rotation.z = this.timer * 0.022;
    this.mesh.position.y = Math.sin(this.timer * (0.8 + this.energy / 100)) * 0.05;

    this.innerCore.rotation.x += dt * 0.2;
    this.innerCore.rotation.y -= dt * 0.35;
    this.edgeLines.rotation.x -= dt * 0.28;
    this.edgeLines.rotation.y += dt * 0.34;
    this.sparkGroup.rotation.y += dt * 0.35;
    this.sparkGroup.rotation.x -= dt * 0.18;
    this.sparkGroup.children.forEach((star, i) => {
      const sp = star.userData.speed || 0.8;
      star.rotation.x += dt * sp;
      star.rotation.y += dt * (sp + 0.12);
      star.position.z += Math.sin(this.timer * (sp + 0.2) + i) * 0.0009;
    });

    this.renderer.render(this.scene, this.camera);
  }
}
