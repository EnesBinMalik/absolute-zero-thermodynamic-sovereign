import * as THREE from 'three';

export interface ThermalUniforms {
  uKelvin: { value: number };
  uShockCracks: { value: number };
  uTime: { value: number };
  uFractureMap: { value: THREE.Texture };
}

export interface ThermalPhaseMaterial extends THREE.MeshStandardMaterial {
  userData: {
    thermalUniforms: ThermalUniforms;
    shader?: THREE.WebGLProgramParametersWithUniforms;
  };
}

/**
 * Extends MeshStandardMaterial via onBeforeCompile so objects retain full PBR shadows,
 * RoomEnvironment reflections, and physically accurate phase-transition appearance
 * driven in real time by Kelvin temperature and thermal shock crack stress.
 */
export function createThermalPhaseMaterial(params: {
  baseColor: number;
  roughness: number;
  metalness: number;
  map?: THREE.Texture;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  fractureMap: THREE.Texture;
  initialKelvin?: number;
}): ThermalPhaseMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: params.baseColor,
    roughness: params.roughness,
    metalness: params.metalness,
    map: params.map ?? null,
    bumpMap: params.bumpMap ?? null,
    bumpScale: params.bumpScale ?? 0.02,
  }) as ThermalPhaseMaterial;

  const uniforms: ThermalUniforms = {
    uKelvin: { value: params.initialKelvin ?? 290 },
    uShockCracks: { value: 0 },
    uTime: { value: 0 },
    uFractureMap: { value: params.fractureMap },
  };

  mat.userData = { thermalUniforms: uniforms };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uKelvin = uniforms.uKelvin;
    shader.uniforms.uShockCracks = uniforms.uShockCracks;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uFractureMap = uniforms.uFractureMap;
    mat.userData.shader = shader;

    shader.vertexShader =
      `
      uniform float uKelvin;
      uniform float uTime;
      varying vec3 vWorldPosThermal;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Thermal expansion / cryogenic contraction subtle physical strain
        float thermalStrain = clamp((uKelvin - 290.0) / 1400.0, -0.04, 0.07);
        transformed *= (1.0 + thermalStrain);
        if (uKelvin > 950.0) {
          float meltRipple = sin(position.x * 6.0 + uTime * 4.5) * cos(position.z * 6.0 + uTime * 3.8);
          transformed += normal * meltRipple * 0.025 * clamp((uKelvin - 950.0) / 600.0, 0.0, 1.0);
        }
        vWorldPosThermal = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader =
      `
      uniform float uKelvin;
      uniform float uShockCracks;
      uniform float uTime;
      uniform sampler2D uFractureMap;
      varying vec3 vWorldPosThermal;
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          vec2 fracUv = vWorldPosThermal.xz * 0.22 + vWorldPosThermal.y * 0.11;
          vec4 fracSample = texture2D(uFractureMap, fracUv);
          float crackRidge = smoothstep(0.55, 0.92, fracSample.r);
          float facet = fracSample.g;

          // Cryogenic frost crystallization (< 115 K)
          float frostWeight = smoothstep(115.0, 12.0, uKelvin);
          vec3 iceCrystalColor = mix(vec3(0.45, 0.78, 0.96), vec3(0.86, 0.96, 1.0), facet);
          diffuseColor.rgb = mix(diffuseColor.rgb, iceCrystalColor, frostWeight * 0.78);

          // Bose-Einstein condensate iridescent quantum sheen (< 3 K)
          float becWeight = smoothstep(3.5, 0.1, uKelvin);
          vec3 becColor = vec3(0.55, 0.92, 1.0) * (0.85 + 0.15 * sin(vWorldPosThermal.y * 5.0 - uTime * 2.5));
          diffuseColor.rgb = mix(diffuseColor.rgb, becColor, becWeight * 0.65);

          // High-temperature molten blackbody tint (> 700 K)
          float heatWeight = smoothstep(680.0, 1450.0, uKelvin);
          vec3 hotTint = mix(vec3(0.65, 0.12, 0.02), vec3(1.0, 0.58, 0.12), heatWeight);
          diffuseColor.rgb = mix(diffuseColor.rgb, hotTint, heatWeight * 0.7);
          `
        )
        .replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec2 fracUvE = vWorldPosThermal.xz * 0.22 + vWorldPosThermal.y * 0.11;
          float crackE = smoothstep(0.58, 0.94, texture2D(uFractureMap, fracUvE).r);

          // Glowing thermal shock fracture lines (icy cyan under cryo shock, molten orange when superheated)
          vec3 shockGlow = mix(vec3(0.22, 0.85, 1.0), vec3(1.0, 0.42, 0.05), smoothstep(200.0, 900.0, uKelvin));
          totalEmissiveRadiance += shockGlow * crackE * uShockCracks * 2.4;

          // Incandescent blackbody glow above 720 K
          float blackbody = smoothstep(720.0, 1550.0, uKelvin);
          vec3 bbColor = mix(vec3(0.95, 0.2, 0.02), vec3(1.0, 0.78, 0.38), smoothstep(1050.0, 1600.0, uKelvin));
          totalEmissiveRadiance += bbColor * blackbody * 1.9;

          // Subtle Bose-Einstein quantum luminescence
          float becGlow = smoothstep(3.0, 0.05, uKelvin);
          totalEmissiveRadiance += vec3(0.25, 0.82, 1.0) * becGlow * 0.65;
          `
        );
  };

  return mat;
}
